import { test, expect, wa, MESSAGES, nextFrames, type Page } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

/** Rótulo do botão principal com cada tema escolhido. */
const TOPIC_LABELS = {
  'familia-internacional': 'Fale sobre família',
  vistos: 'Fale sobre vistos',
  previdenciario: 'Fale sobre previdência',
  consumidor: 'Fale sobre consumo',
} as const;

type TopicId = keyof typeof TOPIC_LABELS;

interface Frame {
  text: string;
  opacity: number;
  width: number;
  /** O quadro veio depois do segundo clique. */
  after: boolean;
}

/** Fase da troca em que cai o segundo clique: a saída do rótulo antigo ou a entrada do novo. */
type Phase = 'saída' | 'entrada';

/**
 * Escolhe `first` e, no primeiro quadro da fase `during` dessa troca, escolhe `second`, anotando a
 * cada quadro o rótulo, a opacidade dele e a largura do botão principal. O segundo clique sai do
 * estado na tela, e não do relógio: com a CPU alta, um setTimeout podia cair já na fase seguinte
 * (ou com a troca acabada), e o teste passava sem passar pela troca interrompida.
 */
function doubleSwap(page: Page, first: TopicId, second: TopicId, during: Phase): Promise<Frame[]> {
  return page.evaluate(
    async ([firstId, secondId, phase]) => {
      const cta = document.querySelector('[data-wa-cta]');
      const label = cta?.querySelector('[data-wa-label]');
      const pick = (id: string) => document.getElementById(`tema-${id}`)?.click();
      if (!cta || !label) throw new Error('botão principal não existe');
      const initial = label.textContent.trim();
      const frames: Frame[] = [];
      let after = false;
      await new Promise<void>((resolve) => {
        const sample = () => {
          const text = label.textContent.trim();
          const opacity = Number(getComputedStyle(label).opacity);
          frames.push({ text, opacity, width: cta.getBoundingClientRect().width, after });
          // Saída: o rótulo antigo já começou a sumir. Entrada: o novo já começou a aparecer.
          const inPhase =
            phase === 'saída'
              ? text === initial && opacity < 1
              : text !== initial && opacity > 0 && opacity < 1;
          if (!after && inPhase) {
            pick(secondId);
            after = true;
          }
          if (frames.length < 70) requestAnimationFrame(sample);
          else resolve();
        };
        pick(firstId);
        sample();
      });
      return frames;
    },
    [first, second, during] as const,
  );
}

/** Escolhe o tema `id` e espera a troca terminar; devolve a largura final do botão principal. */
async function pickAndSettle(page: Page, id: TopicId): Promise<number> {
  const cta = page.locator('[data-wa-cta]');
  await page.evaluate((topic) => document.getElementById(`tema-${topic}`)?.click(), id);
  await expect(cta.locator('[data-wa-label]')).toHaveText(TOPIC_LABELS[id]);
  // A entrada nasce no fim da saída, com o rótulo novo: só agora todas as animações existem.
  return cta.evaluate(async (node) => {
    const animations = node.getAnimations({ subtree: true });
    await Promise.all(animations.map((animation) => animation.finished.catch(() => null)));
    return node.getBoundingClientRect().width;
  });
}

interface SwapSample {
  ms: number;
  /** Altura do rótulo em linhas (1 é uma linha só). */
  lines: number;
  /** O rótulo fica dentro do botão. */
  inside: boolean;
  /** Distância do ícone do WhatsApp à borda esquerda do botão. */
  icon: number;
}

/**
 * Escolhe `to` e anota a cada quadro, por `duration` ms, as linhas do rótulo, se ele fica dentro do
 * botão e onde fica o ícone. Com `then`, escolhe esse tema no primeiro quadro com o rótulo de `to`
 * (o botão acabou de começar a mudar de largura) e devolve a largura do botão nesse quadro.
 */
function sampleSwap(
  page: Page,
  to: TopicId,
  { then, duration }: { then?: TopicId; duration: number },
): Promise<{ samples: SwapSample[]; switchedAt: number | null }> {
  return page.locator('[data-wa-cta]').evaluate(
    async (node, [toId, thenId, toText, ms]) => {
      const label = node.querySelector('[data-wa-label]');
      const icon = node.querySelector('svg');
      if (!label || !icon) throw new Error('rótulo ou ícone do botão principal não existe');
      const lineHeight = label.getBoundingClientRect().height;
      const samples: SwapSample[] = [];
      let switchedAt: number | null = null;
      const start = performance.now();
      document.getElementById(`tema-${toId}`)?.click();
      await new Promise<void>((resolve) => {
        const sample = () => {
          const box = node.getBoundingClientRect();
          const rect = label.getBoundingClientRect();
          samples.push({
            ms: Math.round(performance.now() - start),
            lines: Math.round((rect.height / lineHeight) * 100) / 100,
            inside: rect.left >= box.left - 0.5 && rect.right <= box.right + 0.5,
            icon: Math.round((icon.getBoundingClientRect().left - box.left) * 10) / 10,
          });
          if (thenId && switchedAt === null && label.textContent.trim() === toText) {
            switchedAt = box.width;
            document.getElementById(`tema-${thenId}`)?.click();
          }
          if (performance.now() - start < ms) requestAnimationFrame(sample);
          else resolve();
        };
        sample();
      });
      return { samples, switchedAt };
    },
    [to, then ?? null, TOPIC_LABELS[to], duration] as const,
  );
}

test('escolher um tema troca link e rótulo do botão principal', async ({ page }) => {
  await page.goto('/');
  const cta = page.locator('[data-wa-cta]');
  await expect(cta.locator('[data-wa-label]')).toHaveText('Fale com um especialista');

  await page.locator('label[for="tema-consumidor"]').click();

  await expect(page.locator('#tema-consumidor')).toBeChecked();
  await expect(cta).toHaveAttribute('href', wa(MESSAGES.topic('direito do consumidor')));
  await expect(cta.locator('[data-wa-label]')).toHaveText('Fale sobre consumo');
});

test('cliques rápidos não sobrepõem animações e terminam no último tema', async ({ page }) => {
  await page.goto('/');
  const cta = page.locator('[data-wa-cta]');
  for (const topic of ['familia-internacional', 'vistos', 'previdenciario']) {
    await page.locator(`label[for="tema-${topic}"]`).click();
  }
  // Na entrada, o rótulo tem duas animações (a entrada e a largura segurada), mas cada propriedade
  // só numa: uma sobra da troca anterior repetiria a opacidade e a posição.
  const animatedOnLabel = await cta.locator('[data-wa-label]').evaluate((label) =>
    label
      .getAnimations()
      .filter((animation) => animation.playState === 'running')
      .flatMap((animation) =>
        animation.effect instanceof KeyframeEffect
          ? Object.keys(animation.effect.getKeyframes()[0] ?? {})
          : [],
      )
      .filter((key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key)),
  );
  expect(animatedOnLabel).toHaveLength(new Set(animatedOnLabel).size);
  await expect(cta.locator('[data-wa-label]')).toHaveText('Fale sobre previdência');
  await expect(cta).toHaveAttribute('href', wa(MESSAGES.topic('direito previdenciário')));
});

// Segundo clique durante a saída do rótulo e durante a entrada do novo.
for (const during of ['saída', 'entrada'] as const) {
  test(`trocar de novo durante a ${during} do rótulo continua do ponto em que a troca estava`, async ({
    page,
  }) => {
    await page.goto('/');
    const frames = await doubleSwap(page, 'vistos', 'familia-internacional', during);
    const final = TOPIC_LABELS['familia-internacional'];

    // O segundo clique aconteceu, na fase pedida: sem isso, o teste passaria sem testar nada.
    const firstAfter = frames.findIndex((frame) => frame.after);
    expect(firstAfter, `o segundo clique caiu na ${during}`).toBeGreaterThan(0);

    // Nenhum quadro com um rótulo que não é o final voltando a aparecer.
    const resurfacing = frames.filter(
      (frame, i) =>
        frame.after && frame.text !== final && frame.opacity > (frames[i - 1]?.opacity ?? 1),
    );
    expect(resurfacing).toEqual([]);

    // A largura não salta no clique: o primeiro quadro depois dele parte da largura de antes.
    const before = frames[firstAfter - 1];
    const next = frames[firstAfter];
    expect(Math.abs((next?.width ?? 0) - (before?.width ?? NaN))).toBeLessThanOrEqual(1.5);

    await expect(page.locator('[data-wa-cta] [data-wa-label]')).toHaveText(final);
  });
}

// "Fale sobre previdência" é o rótulo de tema mais largo: entra enquanto o botão ainda cresce a
// partir da largura de "Fale sobre vistos".
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 640 },
]) {
  test.describe(`a ${viewport.width} px`, () => {
    test.use({ viewport });

    test('o rótulo novo, mais largo, fica numa linha e dentro do botão enquanto ele cresce', async ({
      page,
    }) => {
      // mata: a largura final do rótulo segurada durante o crescimento do botão (topic-picker.ts)
      await page.goto('/');
      await pickAndSettle(page, 'vistos');
      const { samples } = await sampleSwap(page, 'previdenciario', { duration: 800 });

      expect(samples.length).toBeGreaterThan(5);
      expect(samples.filter((sample) => sample.lines >= 1.5)).toEqual([]);
      expect(samples.filter((sample) => !sample.inside)).toEqual([]);
      await expect(page.locator('[data-wa-cta] [data-wa-label]')).toHaveText(
        TOPIC_LABELS.previdenciario,
      );
    });

    test('o ícone do WhatsApp fica parado, dentro do botão, enquanto ele muda de largura', async ({
      page,
    }) => {
      // mata: o conteúdo no início durante o ajuste da largura (justifyContent nas animações do
      // botão, em topic-picker.ts): centralizado, o ícone pulava 24 a 28 px para o lado no começo
      // do ajuste e, a 320 px, saía 4 px da pílula
      await page.goto('/');
      // A primeira escolha (o rótulo encolhe) e a troca para o mais largo (cresce).
      for (const to of ['vistos', 'previdenciario'] as const) {
        const { samples } = await sampleSwap(page, to, { duration: 800 });
        const icon = samples[0]?.icon ?? NaN;
        expect(icon, to).toBeGreaterThan(0);
        expect(
          samples.filter((sample) => Math.abs(sample.icon - icon) > 0.5),
          `${to}: quadros com o ícone fora do lugar`,
        ).toEqual([]);
        await pickAndSettle(page, to);
      }
    });

    test('trocado de novo enquanto o botão cresce, o rótulo sai numa linha e dentro do botão', async ({
      page,
    }) => {
      // mata: a largura do rótulo segurada na saída de uma troca interrompida (topic-picker.ts)
      await page.goto('/');
      const grown = await pickAndSettle(page, 'previdenciario');
      await pickAndSettle(page, 'vistos');
      // No primeiro quadro com "Fale sobre previdência", o botão acabou de começar a crescer: a
      // terceira escolha começa a saída dele com o botão mais estreito que o rótulo.
      const { samples, switchedAt } = await sampleSwap(page, 'previdenciario', {
        then: 'consumidor',
        duration: 1200,
      });

      // O clique caiu com o botão ainda crescendo: sem isso, o teste passaria sem testar nada.
      expect(switchedAt, 'a terceira escolha aconteceu').not.toBeNull();
      expect(switchedAt ?? Infinity, 'largura do botão na terceira escolha').toBeLessThan(
        grown - 2,
      );
      expect(samples.length).toBeGreaterThan(5);
      expect(samples.filter((sample) => sample.lines >= 1.5)).toEqual([]);
      expect(samples.filter((sample) => !sample.inside)).toEqual([]);
      await expect(page.locator('[data-wa-cta] [data-wa-label]')).toHaveText(
        TOPIC_LABELS.consumidor,
      );
    });
  });
}

test('um tema já marcado ao abrir (restaurado pelo navegador) aparece no botão, sem animar', async ({
  page,
}) => {
  // O navegador restaura o rádio marcado antes de o script rodar (voltar, recarregar).
  await page.route('**/', async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      'id="tema-consumidor"',
      'id="tema-consumidor" checked',
    );
    await route.fulfill({ response, body: html });
  });
  // Relógio pausado (só install não para o tempo): a balança, que começa a balançar aos 950 ms,
  // só se mexeria agora se a sincronização a empurrasse.
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto('/');
  const cta = page.locator('[data-wa-cta]');
  await expect(cta.locator('[data-wa-label]')).toHaveText('Fale sobre consumo');
  await expect(cta).toHaveAttribute('href', wa(MESSAGES.topic('direito do consumidor')));
  expect(
    await cta.locator('[data-wa-label]').evaluate((label) => label.getAnimations().length),
  ).toBe(0);
  await page.clock.runFor(200);
  await expect(page.locator('[data-beam]')).not.toHaveAttribute('transform');
});

test('cada rádio do seletor fica sobre o próprio chip', async ({ page }) => {
  await page.goto('/');
  await nextFrames(page, 2);
  const outside = await page.locator('[data-topic] input[type="radio"]').evaluateAll((radios) =>
    radios
      .filter((radio) => {
        const chip = (radio as HTMLInputElement).labels?.[0]?.getBoundingClientRect();
        const box = radio.getBoundingClientRect();
        return (
          !chip ||
          box.left < chip.left - 0.5 ||
          box.right > chip.right + 0.5 ||
          box.top < chip.top - 0.5 ||
          box.bottom > chip.bottom + 0.5
        );
      })
      .map((radio) => radio.id),
  );
  expect(outside).toEqual([]);
});

for (const width of [600, 1024]) {
  test(`a ${width} px, os chips ficam em duas linhas de dois, cada rádio sobre o seu`, async ({
    page,
  }) => {
    // mata: a grade de duas colunas nas faixas em que só cabem três chips ("Consumidor" ficava
    // sozinho na segunda linha, logo acima do botão principal) e o justify-items: start dela (o
    // rádio esticava até a largura da coluna, além do chip)
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const layout = await page.locator('[data-topic] .chip-option').evaluateAll((options) => {
      const rows = new Map<number, number>();
      let outside = 0;
      for (const option of options) {
        const box = option.getBoundingClientRect();
        rows.set(Math.round(box.top), (rows.get(Math.round(box.top)) ?? 0) + 1);
        const chip = option.querySelector('.chip')?.getBoundingClientRect();
        const radio = option.querySelector('input')?.getBoundingClientRect();
        if (!chip || !radio || radio.width > chip.width + 0.5) outside++;
      }
      return { rows: [...rows.values()], outside };
    });
    expect(layout).toEqual({ rows: [2, 2], outside: 0 });
  });
}

test.describe('com o movimento reduzido (o rótulo troca na hora)', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const width of [540, 980]) {
    test(`a ${width} px, trocar o tema não muda a altura do hero nem a posição do texto`, async ({
      page,
    }) => {
      // mata: as ações do hero sempre empilhadas nas faixas em que o link "Como trabalhamos" cabe
      // ao lado do botão com uns rótulos e com outros não (Hero.astro): o link pulava de linha, e o
      // hero mudava 60 px de altura ou, com o texto centralizado, o título descia 30 px
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      // Medidas a partir do topo do hero: se a página rolar até o botão, nada muda.
      const layout = () =>
        page.locator('[data-hero]').evaluate((hero) => {
          const box = hero.getBoundingClientRect();
          const top = (selector: string) =>
            (hero.querySelector(selector)?.getBoundingClientRect().top ?? NaN) - box.top;
          return {
            height: box.height,
            title: top('.hero-title'),
            link: top('.hero-actions .link-light'),
          };
        });
      const initial = await layout();
      const label = page.locator('[data-wa-cta] [data-wa-label]');
      for (const [topic, text] of [
        ['familia-internacional', 'Fale sobre família'],
        ['vistos', 'Fale sobre vistos'],
        ['previdenciario', 'Fale sobre previdência'],
        ['consumidor', 'Fale sobre consumo'],
      ] as const) {
        await page.locator(`label[for="tema-${topic}"]`).click();
        await expect(label).toHaveText(text);
        expect(await layout(), topic).toEqual(initial);
      }
    });
  }
});

test.describe('no celular, com o botão principal abaixo da dobra', () => {
  // isMobile não existe no Firefox. A tela útil de um iPhone 14 no Safari: 390×664.
  test.skip(({ browserName }) => browserName === 'firefox', 'sem emulação de celular no Firefox');
  test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });

  test('tocar num tema traz o botão principal para a tela', async ({ page }) => {
    // mata: o scrollIntoView do seletor de tema (o rótulo mudava num botão fora da tela, e quem
    // não rolava não via o resultado do toque)
    await page.goto('/');
    const cta = page.locator('[data-wa-cta]');
    const inView = () =>
      cta.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      });
    expect(await inView()).toBe(false);
    await page.locator('label[for="tema-familia-internacional"]').tap();
    await expect(cta.locator('[data-wa-label]')).toHaveText('Fale sobre família');
    await expect.poll(inView).toBe(true);
  });
});
