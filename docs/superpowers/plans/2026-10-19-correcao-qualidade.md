# Correção de qualidade do site — plano de implementação

> Registro histórico: plano executado; o código atual pode ter mudado depois.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar a landing page para a melhor qualidade de código sem mudar nada visível além da lista fechada de correções da especificação.

**Architecture:** O primeiro passo congela o comportamento atual: testes de caracterização (Playwright) e uma ferramenta que compara o build original (baseline) com o novo em estilos computados, geometria, DOM, pseudo-estados, impressão e capturas. Depois vêm as refatorações por camada (dados → componentes → CSS → JS), cada uma provada equivalente. Por último, as correções intencionais, cada uma com um teste que falha antes da correção.

**Tech Stack:** Astro 7.4 (estático), TypeScript 5.9 (`strictest`), Vitest 5, Playwright 1.64 + axe-core, ESLint 10 (typescript-eslint 8, eslint-plugin-astro 3, jsx-a11y-x), Stylelint 17, Prettier 3, html-validate 11.

**Spec:** `docs/superpowers/specs/2026-10-19-correcao-qualidade-design.md`

## Global Constraints

- Nenhuma diferença visual ou de comportamento fora dos IDs I1–I21 da especificação. Toda diferença aceita no comparador cita o seu ID.
- Node ≥ 22.22.0; `astro` ^7.4.0; `typescript` ^5.9.3 (sem TS 6/7: o typescript-eslint 8.71 suporta < 6.1).
- Só `devDependencies` novas; zero dependência nova de runtime.
- Textos visíveis, URLs `wa.me` e mensagens do WhatsApp idênticos byte a byte.
- Comentários e docs em pt-BR; identificadores em inglês; nomes de arquivos de componentes mantidos.
- Hooks de JavaScript e de testes são atributos `data-*`, papéis ARIA ou rótulos, nunca classes de estilo. Classes de estado (`is-*`) podem ser verificadas.
- A partir da Task 4, `npm run verify` termina verde ao fim de cada task.
- Commits no padrão Conventional Commits em pt-BR, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `$SP` = `C:\Users\User\AppData\Local\Temp\claude\C--Users-User-Documents-portifolio\8be681d5-5cc1-4b91-a902-1798e74e96c3\scratchpad` (ferramentas temporárias e baseline; fora do repositório).

## Review Focus

1. Página aberta direto numa âncora (`/#duvidas`): o link "Dúvidas" fica ativo e o conteúdo visível é revelado. Teste na Task 3 (`header.spec.ts`).
2. Janela redimensionada para ≥ 1080px com o menu aberto: o menu fecha e a rolagem é destravada (`documentElement.style.overflow === ''`). Teste na Task 3 (`menu.spec.ts`).
3. Cliques rápidos em temas diferentes: o rótulo e o link finais são os do último tema. Teste na Task 10 (`topic.spec.ts`).
4. Telefone editado no meio, colado com +55 ou apagado sobre o hífen: valor e cursor corretos. Testes na Task 10 (`phone-mask.test.ts` e `contact-form.spec.ts`).
5. Visitante sem JavaScript ou com movimento reduzido: todo o conteúdo visível e `aria-expanded` coerente. Testes na Task 3 (`motion.spec.ts`) e na Task 9 (`a11y.spec.ts`).

---

### Task 1: Baseline segura

**Files:**

- Move: o arquivo de credenciais de proxy que estava na raiz → uma pasta fora do projeto (fora do git)
- Create: repositório git (`main`), branch `refactor/qualidade`
- Create: `$SP/baseline/dist/` (cópia do build original)

**Interfaces:**

- Produces: commit baseline em `main` com o código original; build original servível de `$SP/baseline/dist`.

- [ ] **Step 1:** Mover o arquivo de credenciais de proxy da raiz para fora do projeto. Verificar: `ls` da raiz não mostra o arquivo e o destino tem o mesmo conteúdo.
- [ ] **Step 2:** `git init -b main`; adicionar tudo exceto `docs/`; commit `chore: estado original do site (baseline)`. Verificar: `git ls-files` não contém o arquivo de credenciais, `dist/`, `node_modules/` nem `.astro/`.
- [ ] **Step 3:** `git switch -c refactor/qualidade`; commit da spec e deste plano: `docs: especificação e plano da correção de qualidade`.
- [ ] **Step 4:** `npm run build` e copiar `dist/` para `$SP/baseline/dist`. Verificar: o sha256 de `index.html` e do CSS/JS em `_astro/` é igual nos dois lugares.

### Task 2: Formatação (Prettier, EditorConfig, gitattributes)

**Files:**

- Create: `.editorconfig`, `.gitattributes`, `.prettierrc.json`, `.prettierignore`
- Modify: `package.json` (devDeps `prettier@^3.9.10`, `prettier-plugin-astro@^1.1.1`; scripts `format`, `format:check`); todos os arquivos formatáveis

**Interfaces:**

- Produces: `npm run format` / `npm run format:check`.

- [ ] **Step 1:** Instalar as devDeps. Configs: `.prettierrc.json` = `{ "singleQuote": true, "printWidth": 100, "plugins": ["prettier-plugin-astro"], "overrides": [{ "files": "*.astro", "options": { "parser": "astro" } }] }`; `.prettierignore` = `dist/`, `.astro/`, `node_modules/`, `package-lock.json`; `.editorconfig` = utf-8, `lf`, 2 espaços, newline final, sem espaço no fim da linha (exceto `*.md`); `.gitattributes` = `* text=auto eol=lf` + `binary` para `*.png *.jpg *.woff2`.
- [ ] **Step 2:** `npx prettier --write .`
- [ ] **Step 3:** `npm run build` e comparar `dist/` com `$SP/baseline/dist`. Esperado: mesmos arquivos, mesmo conteúdo, mesmos hashes de asset. Se `index.html` diferir por espaço em branco entre elementos inline, envolver o trecho afetado com `<!-- prettier-ignore -->` e repetir até ficar idêntico.
- [ ] **Step 4:** `npm run format:check` → `All matched files use Prettier code style!`
- [ ] **Step 5:** Commit `style: formata o projeto com Prettier`.

### Task 3: Rede de caracterização e comparador de equivalência

**Files:**

- Create: `playwright.config.ts`, `vitest.config.ts`, `tests/e2e/fixtures.ts`, `tests/e2e/{links,topic,faq,menu,header,contact-form,motion,fab}.spec.ts`
- Modify: `package.json` (devDeps `vitest@^5.0.5`, `@playwright/test@^1.64.1`, `@axe-core/playwright@^4.14.0`; scripts `test`, `test:watch`, `test:e2e`, `pretest:e2e` = `npm run build`)
- Create (fora do repo): `$SP/eq/{server.mjs,compare.mjs,allow/*.json}`

**Interfaces:**

- Produces `tests/e2e/fixtures.ts`: `test` (estende o do Playwright) com a fixture `openedUrls: () => Promise<string[]>`, que troca `window.open` via `addInitScript` e registra as URLs sem abrir janela; `WA = 'https://wa.me/5518997017249'`; `wa(text: string): string` = `` `${WA}?text=${encodeURIComponent(text)}` ``; `MESSAGES` com as quatro mensagens fixas (abaixo).
- Produces: `node $SP/eq/server.mjs <dir> <port>` (servidor estático) e `node $SP/eq/compare.mjs --base <url> --next <url> [--allow <json>] [--report <dir>]`, que sai com código 1 se houver diferença fora da allowlist.
- Playwright: `testDir: 'tests'`, projeto `e2e` (`testMatch: 'e2e/**/*.spec.ts'`, Chromium), `baseURL: 'http://127.0.0.1:4321'`, `webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4321', url, reuseExistingServer: !process.env.CI }`, `forbidOnly: !!process.env.CI`, `retries: process.env.CI ? 1 : 0`.
- Vitest: `getViteConfig({ test: { include: ['src/**/*.test.ts'], environment: 'node' } })`.

Mensagens fixas (copiar exatamente):

```ts
default: 'Olá, Dr. Diogo! Gostaria de agendar uma conversa.'
topic:   (area) => `Olá, Dr. Diogo! Gostaria de agendar uma conversa sobre ${area}.`
area:    (area) => `Olá, Dr. Diogo! Gostaria de conversar sobre ${area}.`
unlistedCase: 'Olá, Dr. Diogo! Gostaria de saber se você pode me ajudar com um caso.'
```

- [ ] **Step 1:** Instalar as devDeps e o navegador (`npx playwright install chromium`).
- [ ] **Step 2:** Escrever as specs de caracterização (todas devem passar no código atual). Hooks estáveis: `[data-menu-toggle]`, `[data-menu]`, `[data-header]`, `[data-nav]`, `[data-wa-cta]`, `[data-fab]`, `[data-motion]`, `[data-beam]`, `[data-pan-l]`, `[data-pan-r]`; campos por `getByLabel`.

```ts
// links.spec.ts
test('CTAs padrão abrem o WhatsApp com a mensagem de agendamento');
// header "Agendar conversa", [data-wa-cta], contato "Conversar pelo WhatsApp", [data-fab]:
// href === wa(MESSAGES.default), target "_blank", rel "noopener"
test('cada área abre o WhatsApp com o nome da área'); // 6 áreas → wa(MESSAGES.area(nome))
test('o caso não listado tem mensagem própria'); // "Envie uma mensagem" → wa(MESSAGES.unlistedCase)
test('contato e rodapé usam o link sem texto'); // "(18) 99701-7249" e "WhatsApp (18) 99701-7249" → WA
// topic.spec.ts
test('escolher um tema troca link e rótulo do botão principal');
// clicar "Consumidor" → [data-wa-cta] href === wa(MESSAGES.topic('Direito do Consumidor')), texto "Conversar sobre consumo"
// faq.spec.ts
test('a primeira pergunta começa aberta e as outras fechadas'); // aria-expanded true/false; painel visível/oculto
test('abrir uma pergunta não fecha as outras');
test('clicar de novo fecha a pergunta');
// menu.spec.ts (390×844)
test('abre e fecha pelo botão'); // aria-expanded; foco vai para o link "Sobre" do menu
test('Esc fecha e devolve o foco ao botão');
test('Tab no último item volta ao botão');
test('clicar num link fecha o menu e navega'); // hash #duvidas
test('trava a rolagem só enquanto está aberto'); // documentElement.style.overflow 'hidden' → ''
test('virar desktop fecha o menu'); // setViewportSize 1280×800 → aria-expanded false, overflow ''
// header.spec.ts (1440×900)
test('ganha fundo ao rolar'); // y=100 → [data-header] tem is-scrolled
test('recolhe ao descer depois do hero e volta ao subir'); // y=1400 → is-tucked; y=1300 → sem is-tucked
test('marca o link da seção visível'); // #duvidas no topo → link "Dúvidas" aria-current="true", os outros sem
test('abrir em /#duvidas já marca Dúvidas');
// contact-form.spec.ts (1440×900, reducedMotion 'reduce')
test('enviar vazio mostra os erros e foca o primeiro campo');
// status "Revise os campos destacados para continuar."; foco em Nome; visíveis: "Informe seu nome.",
// "Informe um número com DDD.", "Escreva uma mensagem curta sobre o seu caso.", "Para continuar, confirme o uso dos dados.";
// oculto: "Confira o e-mail digitado."; aria-invalid true em Nome/WhatsApp/Mensagem e false em E-mail
test('corrigir um campo limpa só o erro dele');
test('e-mail inválido é recusado'); // "ana@x" → "Confira o e-mail digitado." visível
test('a máscara formata o telefone'); // '18997017249'→'(18) 99701-7249'; '+55 18 99701-7249'→'(18) 99701-7249'; '1834567890'→'(18) 3456-7890'
test('envio válido abre o WhatsApp com a mensagem montada');
// Ana Souza / 18997017249 / ana@email.com / Direito do Trabalho / "Fui demitida sem receber as verbas." / LGPD →
// openedUrls() == [wa('Olá, Dr. Diogo! Meu nome é Ana Souza. Assunto: Direito do Trabalho. Fui demitida sem receber as verbas. (WhatsApp: (18) 99701-7249, e-mail: ana@email.com)')]
// status "Mensagem pronta. Abrindo o WhatsApp…"; link "Se o WhatsApp não abriu…" visível com o mesmo href
test('sem assunto e sem e-mail a mensagem omite essas partes');
// wa('Olá, Dr. Diogo! Meu nome é Ana Souza. Fui demitida sem receber as verbas. (WhatsApp: (18) 99701-7249)')
// motion.spec.ts
test('com movimento reduzido tudo aparece de cara'); // [data-motion]="reduced"; todo [data-reveal] tem is-in
test('com movimento o conteúdo revela ao entrar na tela'); // h2 de #contato sem is-in → scrollIntoView → is-in
test('sem JavaScript todo o conteúdo fica visível'); // javaScriptEnabled false: data-motion "pending"; resposta da 5ª pergunta visível
test('a balança termina nivelada'); // [data-beam] transform → 'rotate(-22.620 225 273)'; pratos 'rotate(22.620 161 281)' / 'rotate(22.620 281 331)'
test('no modo reduzido a balança já começa nivelada');
// fab.spec.ts (390×844)
test('o botão flutuante aparece depois do hero e some perto do contato');
```

- [ ] **Step 3:** `npm run test:e2e` → todas passam no código original.
- [ ] **Step 4:** Escrever o comparador em `$SP/eq` (Node + `playwright-core` + `pngjs` + `pixelmatch`, Chromium de `%LOCALAPPDATA%\ms-playwright\chromium-1243`). Ele abre baseline e versão nova lado a lado e compara cenário a cenário, em memória:
  - Viewports: 360×740, 390×844, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080, 844×390.
  - Cenários por viewport: `reduced` (movimento reduzido) e `motion@top`, `motion@mid` (início de `#como-trabalho` a 30% da tela) e `motion@end`. Cada captura espera animações terminadas e a balança parada.
  - Estados (390 e 1440, reduzido): `menu-open` (só 390 e 844×390), `faq-toggle`, `form-errors`, `form-sent` (window.open stub), `topic` (clicar "Contratos"), `print` (emulateMedia print).
  - Pseudo-estados (390 e 1440, reduzido): `hover` e `focus-visible` forçados via CDP `CSS.forcePseudoState` em cada `a, button, input, select, textarea, label`; captura da subárvore e do próximo irmão.
  - Por elemento: chave estrutural (tag + primeira classe não `astro-*` + índice entre irmãos iguais); atributos (ignorando `class` `astro-*` e `data-astro-*`); texto direto; retângulo; todas as propriedades computadas padrão do elemento, `::before`, `::after` e `::placeholder`.
  - Capturas de página inteira por cenário, com `pixelmatch` (threshold 0); diferenças salvas como PNG no `--report`.
  - Allowlist JSON: `{ "classMap": {}, "valueMap": {}, "dom": [{ "key", "attr" }], "styles": [{ "key", "prop" }], "shots": [] }` (regex; cada entrada com campo `"id": "I<n>"`).
- [ ] **Step 5:** Teste de sanidade do comparador: baseline contra o build atual → zero diferenças. Mudar temporariamente o padding de `.chip` de 18px para 19px → o comparador acusa estilo, geometria e captura. Reverter.
- [ ] **Step 6:** Commit `test: caracteriza o comportamento atual com Playwright e configura o Vitest`.

### Task 4: Análise estática e os dois erros de HTML (I8)

**Files:**

- Create: `eslint.config.js`, `stylelint.config.mjs`, `.htmlvalidate.json`
- Modify: `tsconfig.json` (`extends: "astro/tsconfigs/strictest"`), `package.json` (scripts `lint`, `lint:js`, `lint:css`, `validate:html`, `verify`), `src/components/Sobre.astro`, `src/components/Contato.astro`, `src/scripts/motion.ts` (só o mínimo para o TS strictest)

**Interfaces:**

- Produces: `npm run verify` = `format:check` → `lint` → `check` → `test` → `build` → `validate:html` → `test:e2e`.
- DevDeps: `eslint@^10.13.0 @eslint/js@^10.0.1 typescript-eslint@^8.71.2 eslint-plugin-astro@^3.2.1 eslint-plugin-jsx-a11y-x@^0.2.0 globals@^17.13.0 eslint-config-prettier@^10.1.8 stylelint@^17.16.0 stylelint-config-standard@^40.0.0 stylelint-config-html@^2.0.0 postcss-html@^2.0.0 html-validate@^11.16.4`. Se as peers permitirem ESLint 10, entram também `eslint-plugin-playwright` e `@vitest/eslint-plugin`.

- [ ] **Step 1 (teste que falha):** `npm run build && npx html-validate dist` → 2 erros (`element-permitted-content` no figcaption, `valid-autocomplete` no telefone).
- [ ] **Step 2:** Corrigir: em `Sobre.astro`, `figcaption.portrait-ph` vira `span.portrait-ph` (mesmas classes); em `Contato.astro`, `autocomplete="tel"`. Repetir o Step 1 → 0 erros.
- [ ] **Step 3:** `.htmlvalidate.json` estende `html-validate:recommended`. Regra disparada por algo que uma task futura corrige recebe desativação temporária com comentário `// remover na Task N`; cada task remove a sua.
- [ ] **Step 4:** TS `strictest`: corrigir os erros de `motion.ts` com guardas explícitas, sem `!`.
- [ ] **Step 5:** ESLint (flat config): `js.configs.recommended`, `tseslint.configs.strictTypeChecked` + `stylisticTypeChecked` (`projectService: true`, `extraFileExtensions: ['.astro']`), `eslint-plugin-astro` `recommended` + `jsx-a11y-strict`, `disableTypeChecked` para `*.{js,mjs}` e para os `<script>` virtuais de `.astro` se o project service não os cobrir, `eslint-config-prettier/flat` por último. Ajuste justificado: `restrict-template-expressions` com `allowNumber: true`. Ignorados: `dist/`, `.astro/`, `test-results/`, `playwright-report/` e, temporariamente, `src/scripts/motion.ts` (sai na Task 8). Corrigir os achados restantes.
- [ ] **Step 6:** Stylelint: `extends: ['stylelint-config-standard', 'stylelint-config-html/astro']`; `selector-pseudo-class-no-unknown` ignora `global`; `property-no-vendor-prefix` ignora `text-size-adjust` e `user-select` (o Safari ainda exige `-webkit-`). Temporariamente ignorado: `src/styles/global.css` (sai na Task 7).
- [ ] **Step 7:** `npm run verify` verde.
- [ ] **Step 8:** Comparador contra a baseline: só aparecem diferenças I8 (tag do placeholder, atributo `autocomplete`).
- [ ] **Step 9:** Commits `fix: corrige HTML inválido (figcaption e autocomplete do telefone)` e `build: adiciona TypeScript strictest, ESLint, Stylelint e html-validate`.

### Task 5: Dados com fonte única

**Files:**

- Create: `src/data/contact.ts`, `src/data/content.ts`, `src/data/navigation.ts`, `src/lib/whatsapp.ts`, `src/lib/links.ts`
- Test: `src/lib/whatsapp.test.ts`, `src/data/content.test.ts`
- Delete: `src/data/site.ts`
- Modify: todos os componentes que importavam `site.ts`; `src/layouts/Base.astro` (sai `data-whatsapp`); `src/scripts/motion.ts` (usa `waLink` e `buildContactMessage` da lib)

**Interfaces (Produces):**

```ts
// src/data/contact.ts
export const whatsapp: { readonly display: string; readonly number: string };
export const contact: {
  oabState;
  oabNumber;
  oab;
  city;
  email: { label; href };
  address;
  hours;
  serviceMode: 'Atendimento presencial e online';
};
export type SocialIcon = 'instagram' | 'linkedin';
export interface SocialLink {
  label: string;
  href: string;
  icon: SocialIcon;
  ariaLabel?: string;
}
export const social: readonly SocialLink[];
// src/data/content.ts
export type AreaId = 'familia' | 'consumidor' | 'contratos' | 'trabalho' | 'imoveis' | 'empresas';
export interface PracticeArea {
  id: AreaId;
  name: string;
  description: string;
  topic: { label: string; cta: string };
}
export const areas: readonly PracticeArea[]; // ordem atual; topics do Hero derivam daqui
export const credentials: readonly { term: string; value: string }[];
export const steps: readonly { title: string; text: string }[];
export const manifesto: string;
export const commitments: readonly { term: string; text: string }[];
export const faq: readonly { question: string; answer: string }[];
// src/data/navigation.ts
export const sectionIds: {
  top: 'inicio';
  about: 'sobre';
  areas: 'atuacao';
  process: 'como-trabalho';
  faq: 'duvidas';
  contact: 'contato';
};
export type SectionId = (typeof sectionIds)[keyof typeof sectionIds];
export interface NavLink {
  id: SectionId;
  label: string;
}
export const nav: readonly NavLink[]; // Sobre, Atuação, Como trabalho, Dúvidas, Contato
export const footerNav: readonly NavLink[]; // Sobre, Áreas de atuação, Como trabalho, Dúvidas frequentes
export function anchor(id: SectionId): string; // '#' + id
// src/lib/whatsapp.ts
export const messages: {
  default: string;
  topic(area: string): string;
  area(area: string): string;
  unlistedCase: string;
};
export function waLink(text?: string): string;
export interface ContactRequest {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}
export function buildContactMessage(request: ContactRequest): string; // trim em name/message/email; phone como veio
// src/lib/links.ts
export const EXTERNAL_LINK = { target: '_blank', rel: 'noopener' } as const;
```

- [ ] **Step 1 (testes que falham):**

```ts
// whatsapp.test.ts
expect(waLink()).toBe('https://wa.me/5518997017249');
expect(waLink(messages.default)).toBe(
  'https://wa.me/5518997017249?text=Ol%C3%A1%2C%20Dr.%20Diogo!%20Gostaria%20de%20agendar%20uma%20conversa.',
);
expect(messages.topic('Direito do Consumidor')).toBe(
  'Olá, Dr. Diogo! Gostaria de agendar uma conversa sobre Direito do Consumidor.',
);
expect(messages.area('Direito Imobiliário')).toBe(
  'Olá, Dr. Diogo! Gostaria de conversar sobre Direito Imobiliário.',
);
expect(
  buildContactMessage({
    name: ' Ana ',
    phone: '(18) 99701-7249',
    email: ' ana@x.com ',
    subject: 'Direito do Trabalho',
    message: ' Fui demitida. ',
  }),
).toBe(
  'Olá, Dr. Diogo! Meu nome é Ana. Assunto: Direito do Trabalho. Fui demitida. (WhatsApp: (18) 99701-7249, e-mail: ana@x.com)',
);
expect(
  buildContactMessage({
    name: 'Ana',
    phone: '(18) 99701-7249',
    email: '',
    subject: '',
    message: 'Fui demitida.',
  }),
).toBe('Olá, Dr. Diogo! Meu nome é Ana. Fui demitida. (WhatsApp: (18) 99701-7249)');
// content.test.ts
// ids das áreas únicos e na ordem familia, consumidor, contratos, trabalho, imoveis, empresas
// todo id de nav e footerNav é valor de sectionIds
// credencial "Atendimento" === `Presencial em ${contact.city} e online`
// resposta sobre honorários contém `OAB/${contact.oabState}`
```

- [ ] **Step 2:** `npx vitest run` → falha (módulos inexistentes).
- [ ] **Step 3:** Implementar os módulos movendo o conteúdo de `site.ts` sem alterar nenhum texto; `desc` → `description`, `q/a` → `question/answer`; tipos via `satisfies`.
- [ ] **Step 4:** Migrar os componentes e o `motion.ts`; apagar `site.ts`.
- [ ] **Step 5:** `npm run verify` verde; comparador com zero diferenças, exceto o atributo `data-whatsapp` removido da raiz (refatoração sem ID: atributo sem efeito visível, registrado na allowlist como `"id": "refactor"`).
- [ ] **Step 6:** Commit `refactor: centraliza dados, navegação e mensagens do WhatsApp`.

### Task 6: Componentes

**Files:**

- Create: `src/components/WhatsAppButton.astro`, `src/components/Field.astro`
- Modify: `Header`, `Hero`, `Sobre`, `Areas`, `Processo`, `Manifesto`, `Duvidas`, `Contato`, `Footer`, `WhatsAppFab`, `Themis`; `src/data/brand.ts` (`export const THEMIS_SHAPE_ID = 'themis-shape'`); `src/scripts/motion.ts` (erros dos campos por hooks)

**Interfaces:**

- `WhatsAppButton.astro`: `Props = { label: string; message?: string } & HTMLAttributes<'a'>`. Renderiza `a.btn.btn-light` (classe extra mesclada via `class:list`), `href = waLink(message ?? messages.default)`, `EXTERNAL_LINK`, demais atributos repassados; dentro, `<Icon name="whatsapp" />` e `span.btn-label[data-wa-label]`.
- `Field.astro`: `Props = { id: string; label: string; error: string; optional?: boolean }`. Renderiza `div.field[data-field]` > `label[for=id]` (texto + `" "` + `span.opt` "(opcional)" quando `optional`) + `<slot />` + `p.field-error#{id}-erro[data-field-error]`.
- `motion.ts`: o erro de cada campo é encontrado por `closest('[data-field]')` → `[data-field-error]`; o checkbox LGPD continua com o caso especial até a Task 10.
- Ids de seção e âncoras vêm de `sectionIds`/`anchor()`; links externos usam `{...EXTERNAL_LINK}`; temas do Hero derivam de `areas`; o texto "Atendimento presencial e online" vem de `contact.serviceMode`.

- [ ] **Step 1:** Hero: o título vira dados (`['Clareza para entender.', 'Firmeza para defender.']`) renderizados por `map`, com o mesmo DOM de hoje (spans `.line` > `.w` > `span`, espaços explícitos).
- [ ] **Step 2:** Criar `WhatsAppButton` e usá-lo no Hero (com `data-wa-cta`), no menu e no Contato; criar `Field` e usá-lo nos quatro campos de texto do Contato, com `required` no lugar de `aria-required` (I20).
- [ ] **Step 3:** Sobre (I18): `import.meta.glob<{ default: ImageMetadata }>('../assets/diogo.{jpg,jpeg,png,webp}', { eager: true })`. Com foto, entra `<Image src alt="Diogo Menani" class="portrait-photo" widths={[340, 480, 960]} sizes="(max-width: 639px) 340px, 480px" />`; sem foto, o placeholder atual. O comentário de instrução manual sai.
- [ ] **Step 4:** Manifesto: o `h2` sr-only perde a classe `h2` (I17). Footer/Themis: `THEMIS_SHAPE_ID`.
- [ ] **Step 5:** Verificar a foto: colocar uma imagem 800×1000 gerada em `src/assets/diogo.jpg`, rodar o build e confirmar `<img` com `srcset`, `alt="Diogo Menani"`, `width` e `height`; apagar a imagem.
- [ ] **Step 6:** `npm run verify` verde; comparador: só `data-wa-label` nos CTAs do menu e do contato, ids de erro `e-*` → `f-*-erro`, `data-field*`, `required`/`aria-required` (I20) e o `h2` sr-only (I17).
- [ ] **Step 7:** Commit `refactor: extrai WhatsAppButton e Field e deriva a marcação dos dados`.

### Task 7: CSS — tokens, camada global e estilos escopados

**Files:**

- Create: `src/styles/tokens.css`, `base.css`, `buttons.css`, `forms.css`, `motion.css`; `src/styles/global.css` passa a só importar esses arquivos, nessa ordem
- Modify: `astro.config.mjs` (`scopedStyleStrategy: 'where'`); `<style>` em `Header`, `Hero`, `Sobre`, `Areas`, `Processo`, `Manifesto`, `Duvidas`, `Contato`, `Footer`, `WhatsAppFab`, `Themis`; `Base.astro` (raiz `div.page[data-page]`); `Hero`/`Header` (`style="--word:N;--line:N"` / `style="--i:N"`); `src/scripts/motion.ts` (`[data-page]`, classe `is-menu-open`, `classList` no status do formulário)
- Modify: `stylelint.config.mjs`, `.htmlvalidate.json` (sai a exceção da Task 4; `no-inline-style` permite só `--word`, `--line` e `--i`)

**Interfaces:**

- Tokens em `:root` (antes ficavam em `.dm`): os atuais (`--royal`, `--royal-deep`, `--royal-bright`, `--ink`, `--ink-soft`, `--sky`, `--sky-dim`, `--mist`, `--line`, `--line-royal`, `--serif`, `--sans`, `--ease`, `--ease-io`, `--gutter`) mais `--danger: #b42318`, `--field-border: #8690b6`, `--field-border-hover: #5f6a96`, `--field-placeholder: #646d92`, `--field-bg: #fbfcff`, `--line-on-mist: #d2d8ec`, `--scrollbar-track: #eceff9`, `--header-h: 84px`. Cores usadas uma única vez dentro de um componente ficam literais nele.
- Keyframes renomeados (allowlist `valueMap.animation-name`): `dm-rise→rise`, `dm-fade-up→fade-up`, `dm-fade→fade`, `dm-drop→drop`, `dm-draw→draw`, `dm-spark→spark`, `dm-unveil→unveil`. `classMap`: `dm→page`, `menu-open→is-menu-open`.
- Camadas: `base.css` (html, body, `.page`, resets `:where(.page)`, foco, seleção, `.wrap`, `.sr-only`, `.section`, `.is-royal`, `.h2`, `.lede`); `buttons.css` (`.btn*`, `.link`, `.link-light`); `forms.css` (`.field*`, controles, `.select*`, `.field-error`, `.has-error*`, `.check*`, `.field-row`): um único dono para cada controle; `motion.css` (sistema `[data-reveal]`, keyframes, `scroll-behavior` reduzido, `[data-reveal]` na impressão).

Regras de migração (cada uma evita uma regressão concreta):

1. O seletor de estado da raiz usa `:global(.page.is-menu-open)` / `:global(.page[data-motion="on"])` / `:global(.page:not([data-motion="pending"]))`, com a mesma especificidade de antes.
2. SVG de componente filho (Icon) é estilizado com `:global(svg)` no pai. O Monogram recebe o escopo pela prop `class`. Os estilos de `.themis` vão para `Themis.astro`.
3. Regra sem `!important` dentro de `prefers-reduced-motion` ou `print` vai para o mesmo arquivo da regra base, depois dela (`.area-link:hover .area-body`, `.hero` na impressão). As regras com `!important` vão para o componente dono.
4. O bloco `@media (max-height:560px)` do menu fica antes das regras base, preservando o bug, que é corrigido na Task 10 (I9).
5. Atraso das palavras do título: `calc(0.18s + (var(--word) + var(--line)) * 0.06s)`. Atraso dos links do menu: `calc(0.16s + var(--i) * 0.06s)`, só com o menu aberto. Saem as listas `nth-child`.
6. CSS sem efeito sai (I21): fontes do `.faq-item > h3`; `.footer-name` na regra de `opsz`.
7. O script troca `status.className = …` por `classList`, porque atribuir `className` apagaria a classe de escopo.
8. Notação moderna exigida pelo Stylelint (cores `rgb(… / …)`, media queries em range, `currentcolor`, sem prefixo onde o suporte é universal: `mask-*`, `appearance`) sem mudar valores computados.

- [ ] **Step 1:** Migrar camada global e componentes seguindo as regras acima.
- [ ] **Step 2:** Comparador com `allow/task7.json` (classMap, valueMap, atributos `style` com `--word/--line/--i`, I21) → zero diferenças de estilo computado, geometria e captura em todos os cenários.
- [ ] **Step 3:** `npm run verify` verde, sem exceções de Stylelint.
- [ ] **Step 4:** Commit `refactor: organiza o CSS em tokens, camada global e estilos por componente`.

### Task 8: JavaScript em módulos (com I13)

**Files:**

- Create: `src/scripts/{main,dom,motion-mode,reveal,balance,balance-physics,topic-picker,menu,faq,contact-form,phone-mask,contact-validation,scroll-effects,scroll-math}.ts`
- Test: `src/scripts/{balance-physics,phone-mask,contact-validation,scroll-math}.test.ts`
- Delete: `src/scripts/motion.ts`
- Modify: `src/layouts/Base.astro` (`import { initPage } from '../scripts/main'`), `eslint.config.js` (sai o ignore da Task 4)

**Interfaces (Produces):**

```ts
// dom.ts
export function query<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string,
): T | null;
export function queryAll<T extends Element = HTMLElement>(root: ParentNode, selector: string): T[];
// motion-mode.ts
export type MotionMode = 'on' | 'static' | 'reduced';
export function isStaticPage(doc: Document, win: Window): boolean; // scrollHeight − innerHeight < innerHeight × 0,5
export function detectMotionMode(doc: Document, win: Window): MotionMode;
// reveal.ts — STAGGER_STEP_MS = 90, STAGGER_MAX_MS = 540, STAGGER_CLEANUP_MS = 1500
export function initReveal(root: HTMLElement, mode: MotionMode): void;
// balance-physics.ts — BALANCE = { beamStiffness: 13, beamDamping: 2.75, panStiffness: 32, panDamping: 2.8,
//   panCoupling: 0.55, minDt: 0.001, maxDt: 0.034, settle: { angle: 0.01, angleVelocity: 0.02, pans: 0.01, pansVelocity: 0.02 } }
export interface Point {
  x: number;
  y: number;
}
export interface BalanceState {
  angle: number;
  angleVelocity: number;
  pans: number;
  pansVelocity: number;
}
export function levelAngle(left: Point, right: Point): number; // graus: −atan2(Δy, Δx)
export function clampDt(elapsedMs: number): number; // segundos, entre minDt e maxDt
export function stepBalance(state: BalanceState, dt: number, level: number): BalanceState; // Euler semi-implícito na ordem atual
export function isSettled(state: BalanceState, level: number): boolean;
// balance.ts — SWING_DELAY_MS = 950, TOPIC_IMPULSE = 24
export interface Balance {
  swing(impulse?: number): void;
}
export function initBalance(root: HTMLElement, getMode: () => MotionMode): Balance | null;
// topic-picker.ts
export function initTopicPicker(
  root: HTMLElement,
  options: { getMode: () => MotionMode; onPick: () => void },
): void;
// menu.ts — MENU_FOCUS_DELAY_MS = 380, DESKTOP_QUERY = '(min-width: 1080px)'
export interface Menu {
  isOpen(): boolean;
}
export function initMenu(root: HTMLElement): Menu;
// faq.ts
export function initFaq(root: HTMLElement): void;
// phone-mask.ts
export function formatPhone(digits: string): string; // algoritmo atual: corta 55 se > 11 dígitos, máximo 11
export function maskPhone(value: string): string;
// contact-validation.ts
export type ContactField = 'name' | 'phone' | 'email' | 'message' | 'consent';
export function validateContact(values: ContactRequest & { consent: boolean }): ContactField[]; // na ordem do DOM
// contact-form.ts — SUBMIT_COOLDOWN_MS = 1800
export function initContactForm(root: HTMLElement): void;
// scroll-math.ts — todas puras, mesmas fórmulas e limiares de hoje
export function activeSectionIndex(tops: readonly number[], viewportHeight: number): number; // −1 = nenhuma; linha = 40% da tela
export function activeStepCount(input: {
  inRow: boolean;
  firstTop: number;
  tops: readonly number[];
  viewportHeight: number;
}): number;
export function litWordCount(input: {
  top: number;
  height: number;
  viewportHeight: number;
  words: number;
}): number;
export function nextTuck(input: {
  y: number;
  lastY: number;
  heroHeight: number;
  motionOn: boolean;
  menuOpen: boolean;
  tucked: boolean;
}): boolean;
export function isFabVisible(input: {
  mode: MotionMode;
  y: number;
  heroHeight: number;
  viewportHeight: number;
  contact: { top: number; bottom: number } | null;
  footerTop: number | null;
}): boolean;
// scroll-effects.ts — lê toda a geometria primeiro, depois escreve (I13)
export function initScrollEffects(
  root: HTMLElement,
  options: { getMode: () => MotionMode; isMenuOpen: () => boolean },
): { refresh(): void };
// main.ts
export function initPage(root: HTMLElement): void; // modo, módulos, troca static→on no resize e após fonts.ready
```

- [ ] **Step 1 (testes que falham):**

```ts
// balance-physics.test.ts
expect(levelAngle({ x: 161, y: 281 }, { x: 281, y: 331 })).toBeCloseTo(-22.619864948, 6);
expect(clampDt(0)).toBe(0.001);
expect(clampDt(1000)).toBe(0.034);
expect(clampDt(16)).toBe(0.016);
// stepBalance({0,0,0,0}, 0.016, L) = { angleVelocity: −13·(0−L)·0.016, angle: angleVelocity·0.016, … } (valores exatos calculados à mão no teste)
// partindo de angle 0 com dt 1/60, isSettled vira true em até 600 passos; isSettled(state em L, L) === true
// phone-mask.test.ts
expect(formatPhone('18997017249')).toBe('(18) 99701-7249');
expect(formatPhone('1834567890')).toBe('(18) 3456-7890');
expect(formatPhone('18')).toBe('18');
expect(formatPhone('189')).toBe('(18) 9');
expect(maskPhone('+55 18 99701-7249')).toBe('(18) 99701-7249');
expect(maskPhone('189970172491234')).toBe('(18) 99701-7249');
// contact-validation.test.ts
expect(validateContact(valid)).toEqual([]);
expect(validateContact({ ...empty })).toEqual(['name', 'phone', 'message', 'consent']);
expect(validateContact({ ...valid, name: '   ' })).toEqual(['name']);
expect(validateContact({ ...valid, phone: '(18) 9970-172' })).toEqual(['phone']); // 9 dígitos
expect(validateContact({ ...valid, email: 'ana@x' })).toEqual(['email']);
expect(validateContact({ ...valid, email: '' })).toEqual([]);
// scroll-math.test.ts — fixtures numéricas para cada função, incluindo limites exatos (y = 24, top = 40% da tela, p = 0)
```

- [ ] **Step 2:** `npx vitest run` → falha.
- [ ] **Step 3:** Implementar os módulos portando a lógica de `motion.ts` sem mudar números nem ordem de cálculo. Cada módulo registra seus próprios listeners nos seus elementos. O menu fecha com clique em qualquer link enquanto estiver aberto (delegação na raiz) e fecha ao virar desktop (`matchMedia(DESKTOP_QUERY)`).
- [ ] **Step 4:** Apagar `motion.ts`; tirar o ignore do ESLint; `npm run verify` verde.
- [ ] **Step 5:** Comparador com a allowlist da Task 7 → zero diferenças, incluindo os cenários com movimento.
- [ ] **Step 6:** Commit `refactor: divide o script da página em módulos testados`.

### Task 9: Acessibilidade (I1–I7, I16)

**Files:**

- Test: `tests/e2e/a11y.spec.ts`
- Modify: `Header.astro`, `Hero.astro`, `Duvidas.astro`, `Footer.astro`, `Base.astro`/`pages/index.astro` (skip link, `main#conteudo`), `src/data/navigation.ts` (`main: 'conteudo'`), `src/scripts/{menu,faq,scroll-effects,scroll-math}.ts`, CSS do skip link em `base.css`

**Interfaces:**

- `nextTuck` ganha `headerHasFocus: boolean` na entrada; com `true`, devolve `false` (não recolhe). Teste unitário novo em `scroll-math.test.ts`.

- [ ] **Step 1 (testes que falham):**

```ts
test('axe sem violações no celular e no desktop'); // tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice; 390 e 1440 reduzido
test('axe sem violações com o menu aberto e com erros no formulário');
test('o link da marca se chama pelo texto visível'); // 1440: getByRole('link', { name: 'Diogo Menani Advocacia & Assessoria Jurídica' })
test('o menu é um landmark e isola o resto da página'); // aberto: getByRole('navigation', { name: 'Menu' }); main e footer com inert; fechado: menu com inert, main sem
test('o botão do menu se chama pelo texto visível'); // nome 'Menu' fechado e 'Fechar' aberto; sem aria-label
test('o header reaparece quando o foco entra nele'); // rolar até y=2000 (is-tucked) → focar o link da marca → sem is-tucked
test('o primeiro Tab mostra o link para pular ao conteúdo'); // 'Pular para o conteúdo' focado e dentro da viewport; Enter + Tab → foco no primeiro chip
test('o título principal tem nome acessível sem aria-label'); // heading nível 1 'Clareza para entender. Firmeza para defender.'
test('FAQ sem JavaScript declara tudo aberto'); // JS desligado: 5 × aria-expanded="true"; com JS: true, false, false, false, false
test('a navegação do rodapé é um landmark'); // getByRole('navigation', { name: 'Navegação' })
```

- [ ] **Step 2:** `npx playwright test tests/e2e/a11y.spec.ts` → falham pelos motivos esperados.
- [ ] **Step 3:** Implementar. Marca: sem `aria-label`, espaço entre `brand-name` e `brand-sub`. Menu: `nav.menu[aria-label="Menu"]` com `inert` no HTML, `div.menu-nav` dentro; o script alterna `inert` no menu e nos irmãos da raiz (todos menos header e menu). Toggle: sem `aria-label`. Header: `focusin` remove `is-tucked`, e `nextTuck` não recolhe com `header.matches(':focus-within')`. Skip link: primeiro filho da raiz. h1: `span.sr-only` com o texto e linhas `aria-hidden`. FAQ: HTML com `aria-expanded="true"`, `initFaq` sincroniza com `is-open`. Rodapé: a coluna "Navegação" vira `nav[aria-labelledby]`.
- [ ] **Step 4:** Testes verdes; `npm run verify` verde; tirar as exceções do html-validate ligadas a I2.
- [ ] **Step 5:** Comparador contra o build da Task 8 → diferenças só nos elementos de I1–I7 e I16 (o skip link fica fora da tela sem foco).
- [ ] **Step 6:** Commit `fix(a11y): nome da marca, menu isolado, foco no header, skip link e FAQ coerente`.

### Task 10: Comportamento (I9–I12, I14)

**Files:**

- Modify: `src/scripts/phone-mask.ts` (+ teste), `src/scripts/contact-form.ts`, `src/scripts/topic-picker.ts`, `src/components/Contato.astro`, `src/styles/forms.css`, `Header.astro` (ordem do bloco `max-height`), `Duvidas.astro` (impressão)
- Test: `src/scripts/phone-mask.test.ts`, `tests/e2e/{contact-form,topic,menu,faq}.spec.ts`

**Interfaces:**

- `maskPhone(value: string, caret: number): { value: string; caret: number }`: conta os dígitos antes do cursor, formata e devolve o cursor logo depois do mesmo dígito (descontando o 55 cortado). `formatPhone` não muda.
- LGPD: `div.field.field-check[data-field]` > `label.check` + `p.field-error[data-field-error]`. Sai o `style.display` do script; a seleção `.check.has-error .check-box` vira `.field-check.has-error .check-box` (mesma especificidade).

- [ ] **Step 1 (testes que falham):**

```ts
// phone-mask.test.ts
expect(maskPhone('(18) 99701-7249', 15)).toEqual({ value: '(18) 99701-7249', caret: 15 });
expect(maskPhone('(18) 997017249', 10)).toEqual({ value: '(18) 99701-7249', caret: 10 }); // apagou o hífen
expect(maskPhone('(18) 995701-7249', 8)).toEqual({ value: '(18) 99570-1724', caret: 8 }); // digitou 5 no meio
expect(maskPhone('+55 18 99701-7249', 17)).toEqual({ value: '(18) 99701-7249', caret: 15 });
// contact-form.spec.ts
test('editar o telefone no meio mantém o cursor no lugar'); // selectionStart após digitar no meio
test('o erro do consentimento fica no contêiner do campo'); // erro visível, checkbox aria-describedby = id do erro, sem style inline
// topic.spec.ts
test('cliques rápidos terminam no último tema'); // Família, Trabalho, Empresas sem espera → rótulo 'Conversar sobre empresas' e href do tema Empresas
// menu.spec.ts
test('em tela baixa o menu usa a versão compacta'); // 844×390 aberto: link 30px, padding-top 4px; .menu-foot padding-top 20px
// faq.spec.ts
test('na impressão todas as respostas aparecem'); // emulateMedia print: as 5 respostas visíveis
```

- [ ] **Step 2:** Rodar → falham.
- [ ] **Step 3:** Implementar I10 (máscara com cursor; `setSelectionRange` só com o campo focado), I11, I12 (cada troca cancela as animações em andamento e invalida o `onfinish` anterior por token), I9 (bloco `max-height` depois das regras base) e I14 (`@media print` em `Duvidas.astro` abre painéis e respostas com `!important`).
- [ ] **Step 4:** Testes verdes; `npm run verify` verde.
- [ ] **Step 5:** Comparador contra o build da Task 9 → diferenças só nos cenários de I9 (844×390 com menu aberto), I11 (`form-errors`) e I14 (`print`).
- [ ] **Step 6:** Commit `fix: cursor do telefone, erro da LGPD, seletor de tema, menu em tela baixa e FAQ na impressão`.

### Task 11: Fontes no próprio site (I15)

**Files:**

- Create: `src/assets/fonts/bodoni-moda-{normal,italic}-{latin,latin-ext}.woff2`, `src/assets/fonts/hanken-grotesk-normal-{latin,latin-ext}.woff2`, `src/assets/fonts/OFL-bodoni-moda.txt`, `src/assets/fonts/OFL-hanken-grotesk.txt`
- Modify: `astro.config.mjs` (`fonts` com `fontProviders.local()`), `src/layouts/Base.astro` (saem `preconnect` e o link do Google; entra `<Font cssVariable … preload>`), `src/styles/tokens.css` (`--serif`/`--sans` apontam para as variáveis da API mantendo os fallbacks atuais)
- Test: `tests/e2e/fonts.spec.ts`

**Interfaces:**

- Famílias: `Bodoni Moda` (pesos `400 900`, normal e itálico, `--font-bodoni`) e `Hanken Grotesk` (pesos `400 700`, normal, `--font-hanken`); `display: 'swap'`; `unicodeRange` de cada variante copiado do CSS atual do Google (latin e latin-ext). Os arquivos vêm das URLs desse CSS, com o eixo `opsz` incluído.
- Fallbacks: serif `"Bodoni 72", Didot, "Bodoni MT", Georgia, serif`; sans `"Helvetica Neue", Helvetica, Arial, sans-serif`.
- Preload: só as variantes normais latin (Bodoni e Hanken).

- [ ] **Step 1 (teste que falha):**

```ts
test('nenhuma requisição ao Google Fonts'); // nenhum request para fonts.googleapis.com ou fonts.gstatic.com
test('as duas famílias carregam do próprio site'); // document.fonts.check('500 60px "Bodoni Moda"') e ('16px "Hanken Grotesk"') true após fonts.ready
test('as fontes principais têm preload'); // 2 × link[rel=preload][as=font][type="font/woff2"]
```

- [ ] **Step 2:** Rodar → falham.
- [ ] **Step 3:** Baixar os 6 woff2 e as duas licenças OFL, configurar a API e o layout.
- [ ] **Step 4:** Confirmar que todo caractere do texto renderizado está no intervalo latin (script sobre o `innerText` do build).
- [ ] **Step 5:** Testes verdes; `npm run verify` verde; comparador contra o build da Task 10 → capturas idênticas depois de `fonts.ready`; só `font-family` computado aceito como diferença (I15).
- [ ] **Step 6:** Commit `perf: serve as fontes pelo próprio site (sem Google Fonts)`.

### Task 12: Repositório, documentação, CI e regressão visual

**Files:**

- Move (git mv): `1000162846.jpg` → `brand/originais/logo.jpg`; `1000162853.jpg` → `brand/originais/themis.jpg`; `public/logo-dm.svg` → `brand/logo-dm.svg`; `public/themis.svg` → `brand/themis.svg` (I19)
- Create: `README.md` (substitui `LEIAME.md`), `.github/workflows/ci.yml`, `tests/visual/sections.spec.ts`, `tests/visual/__screenshots__/win32/*.png`
- Modify: `playwright.config.ts` (projeto `visual`, `snapshotPathTemplate: '{testDir}/visual/__screenshots__/{platform}/{arg}{ext}'`, `toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css' }`, `grepInvert` do visual quando `CI`), `package.json` (`engines.node: ">=22.22.0"`, `test:visual`)

- [ ] **Step 1:** Movimentações. Verificar que `/logo-dm.svg` e `/themis.svg` não aparecem mais em `dist/` e que nenhum arquivo do projeto os referencia.
- [ ] **Step 2:** README em pt-BR: o que é, requisitos (Node ≥ 22.22), comandos, estrutura de pastas com a responsabilidade de cada arquivo, onde editar cada conteúdo, foto do Diogo por convenção, pendências `[colchetes]`, qualidade e testes (incluindo a regressão visual local), publicação (Vercel/Netlify: `npm run build`, saída `dist`), marca e licenças das fontes, link do design.
- [ ] **Step 3:** CI: `ubuntu-latest`, `actions/checkout@v5`, `actions/setup-node@v5` (Node 24, cache npm), `npm ci`, `npx playwright install --with-deps chromium`, `npm run verify` com `CI=true`.
- [ ] **Step 4:** Suíte visual `@visual`: cada seção (`header`, `#inicio`, `#sobre`, `#atuacao`, `#como-trabalho`, manifesto, `#duvidas`, `#contato`, `footer`) em 390×844 e 1440×900, com movimento reduzido, mais menu aberto (390), erros do formulário e FAQ com a 2ª aberta (1440). Gerar os snapshots, rodar duas vezes e as duas passarem.
- [ ] **Step 5:** `npm run verify` verde; `npm run test:visual` verde.
- [ ] **Step 6:** Commit `chore: organiza a marca, documenta o projeto e adiciona CI e regressão visual`.

### Task 13: Varredura final linha por linha

**Files:** qualquer arquivo com achado confirmado.

- [ ] **Step 1:** Despachar revisores novos em paralelo, cada um lendo todas as linhas de um grupo contra a spec: (a) `src/lib`, `src/data`, `src/scripts`; (b) componentes e layout (marcação, semântica, a11y); (c) CSS; (d) configs, testes, docs, CI. Cada revisor recebe a spec e a lista I1–I21, para não acusar mudança intencional como regressão.
- [ ] **Step 2:** Verificar cada achado no código antes de aceitar (superpowers:receiving-code-review). Corrigir os válidos; comportamento novo entra com teste que falha antes.
- [ ] **Step 3:** Comparador final baseline → HEAD com a allowlist acumulada: toda diferença tem um ID I1–I21.
- [ ] **Step 4:** `npm run verify` e `npm run test:visual` verdes; `git status` limpo.
- [ ] **Step 5:** Commit dos ajustes (`fix:`/`refactor:` conforme o caso) e merge fast-forward de `refactor/qualidade` em `main`, só local, sem push.
