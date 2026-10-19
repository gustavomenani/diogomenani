import { test, expect, wa, MESSAGES, nextFrames, type Page } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

interface Frame {
  text: string;
  opacity: number;
  width: number;
  /** O quadro veio depois do segundo clique. */
  after: boolean;
}

/**
 * Escolhe `first`, espera `delay` ms (no meio da troca) e escolhe `second`, anotando a cada
 * quadro o rótulo, a opacidade dele e a largura do botão principal.
 */
function doubleSwap(page: Page, first: string, second: string, delay: number): Promise<Frame[]> {
  return page.evaluate(
    async ([firstId, secondId, wait]) => {
      const cta = document.querySelector('[data-wa-cta]');
      const label = cta?.querySelector('[data-wa-label]');
      const pick = (id: string) => document.getElementById(`tema-${id}`)?.click();
      if (!cta || !label) throw new Error('botão principal não existe');
      const frames: Frame[] = [];
      let after = false;
      await new Promise<void>((resolve) => {
        const sample = () => {
          frames.push({
            text: label.textContent.trim(),
            opacity: Number(getComputedStyle(label).opacity),
            width: cta.getBoundingClientRect().width,
            after,
          });
          if (frames.length < 70) requestAnimationFrame(sample);
          else resolve();
        };
        pick(firstId);
        // A primeira amostra já sai aqui: no WebKit o primeiro quadro pode vir depois do segundo
        // clique.
        sample();
        setTimeout(() => {
          pick(secondId);
          after = true;
        }, wait);
      });
      return frames;
    },
    [first, second, delay] as const,
  );
}

test('escolher um tema troca link e rótulo do botão principal', async ({ page }) => {
  await page.goto('/');
  const cta = page.locator('[data-wa-cta]');
  await expect(cta).toHaveText('Agendar uma conversa');

  await page.getByText('Consumidor', { exact: true }).click();

  await expect(page.getByLabel('Consumidor', { exact: true })).toBeChecked();
  await expect(cta).toHaveAttribute('href', wa(MESSAGES.topic('Direito do Consumidor')));
  await expect(cta).toHaveText('Conversar sobre consumo');
});

test('cliques rápidos não sobrepõem animações e terminam no último tema', async ({ page }) => {
  await page.goto('/');
  const cta = page.locator('[data-wa-cta]');
  for (const topic of ['Família', 'Trabalho', 'Empresas']) {
    await page.getByText(topic, { exact: true }).click();
  }
  const runningOnLabel = await cta
    .locator('[data-wa-label]')
    .evaluate(
      (label) =>
        label.getAnimations().filter((animation) => animation.playState === 'running').length,
    );
  expect(runningOnLabel).toBeLessThanOrEqual(1);
  await expect(cta).toHaveText('Conversar sobre empresas');
  await expect(cta).toHaveAttribute('href', wa(MESSAGES.topic('Assessoria para Empresas')));
});

// Segundo clique durante a saída do rótulo (60 ms) e durante a entrada do novo (250 ms).
for (const delay of [60, 250]) {
  test(`trocar de novo aos ${delay} ms continua do ponto em que a troca estava`, async ({
    page,
  }) => {
    await page.goto('/');
    const frames = await doubleSwap(page, 'contratos', 'familia', delay);
    const final = 'Conversar sobre família';

    // Nenhum quadro com um rótulo que não é o final voltando a aparecer.
    const resurfacing = frames.filter(
      (frame, i) =>
        frame.after && frame.text !== final && frame.opacity > (frames[i - 1]?.opacity ?? 1),
    );
    expect(resurfacing).toEqual([]);

    // A largura não salta no clique: o primeiro quadro depois dele parte da largura de antes.
    const firstAfter = frames.findIndex((frame) => frame.after);
    const before = frames[firstAfter - 1];
    const next = frames[firstAfter];
    expect(Math.abs((next?.width ?? 0) - (before?.width ?? NaN))).toBeLessThanOrEqual(1.5);

    await expect(page.locator('[data-wa-cta]')).toHaveText(final);
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
  await expect(cta).toHaveText('Conversar sobre consumo');
  await expect(cta).toHaveAttribute('href', wa(MESSAGES.topic('Direito do Consumidor')));
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
