# Diogo Menani — Advocacia & Assessoria Jurídica

Landing page do escritório: uma página estática em [Astro](https://astro.build) 7 com TypeScript. Todo contato vai para o WhatsApp: os botões abrem a conversa com uma mensagem pronta, e o formulário monta a mensagem com o que a pessoa escreveu.

## Requisitos

Node.js 22.22 ou mais novo (exigência do Astro 7.4). O CI usa o Node 24.

## Comandos

| Comando                 | O que faz                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install`           | Instala as dependências (só na primeira vez).                                                                                             |
| `npm run dev`           | Abre o site em http://localhost:4321 e recarrega a cada edição.                                                                           |
| `npm run build`         | Gera o site final em `dist/`.                                                                                                             |
| `npm run preview`       | Serve o `dist/` para conferir o build.                                                                                                    |
| `npm run verify`        | Roda todas as verificações abaixo, na mesma ordem do CI.                                                                                  |
| `npm run format`        | Formata o projeto com o Prettier.                                                                                                         |
| `npm run format:check`  | Confere a formatação sem alterar nada.                                                                                                    |
| `npm run lint`          | ESLint (TypeScript com checagem de tipos, Astro, acessibilidade e testes) e Stylelint (CSS).                                              |
| `npm run check`         | Checagem de tipos de componentes e scripts (`astro check`, TypeScript `strictest`).                                                       |
| `npm test`              | Testes unitários da lógica pura (Vitest). `npm run test:watch` roda em modo de observação.                                                |
| `npm run test:e2e`      | Gera o build e roda os testes no navegador (Playwright): comportamento, acessibilidade com axe, fontes e (fora do CI) a regressão visual. |
| `npm run test:visual`   | Gera o build e roda só a regressão visual.                                                                                                |
| `npm run validate:html` | Valida o HTML gerado em `dist/` (html-validate).                                                                                          |

## Estrutura

```text
src/
├── pages/index.astro      a página: monta as seções na ordem
├── layouts/Base.astro     <head>, fontes, skip link e o script que liga a página
├── components/            uma seção por arquivo, mais as peças que elas usam
├── data/                  dados do escritório e conteúdo das seções (fonte única)
├── lib/                   links e mensagens do WhatsApp; atributos de link externo
├── scripts/               comportamento no navegador, um módulo por recurso
├── styles/                camada global de CSS
└── assets/fonts/          fontes woff2 e licenças OFL
public/                    favicon (vai para o site do jeito que está)
brand/                     originais e vetores da marca (não são publicados)
tests/e2e/                 testes no navegador
tests/visual/              regressão visual e snapshots
docs/superpowers/          especificação e plano da correção de qualidade
.github/workflows/ci.yml   CI: npm run verify a cada push na main e em cada pull request
```

### `src/components/`

Seções, na ordem da página. O CSS de cada uma fica no `<style>` do próprio arquivo.

- `Header.astro`: barra fixa com a marca, a navegação e o botão de agendar; no celular, o menu de tela cheia.
- `Hero.astro`: abertura (`#inicio`), com o título, o seletor de tema que troca o botão principal e a Têmis.
- `Sobre.astro`: apresentação do Diogo (`#sobre`), com foto, texto e credenciais.
- `Areas.astro`: áreas de atuação (`#atuacao`), cada uma com o próprio link do WhatsApp.
- `Processo.astro`: etapas do atendimento (`#como-trabalho`).
- `Manifesto.astro`: a frase de compromisso e a lista de compromissos.
- `Duvidas.astro`: perguntas frequentes (`#duvidas`).
- `Contato.astro`: canais de contato e o formulário que monta a mensagem (`#contato`).
- `Footer.astro`: rodapé, com marca, navegação, contatos, redes sociais, OAB e aviso legal.
- `WhatsAppFab.astro`: botão flutuante do WhatsApp, no celular e no tablet.

Peças usadas pelas seções:

- `WhatsAppButton.astro`: botão padrão do WhatsApp (rótulo e mensagem por prop).
- `Field.astro`: campo do formulário com rótulo, controle e mensagem de erro.
- `Icon.astro`: ícone pelo nome.
- `Monogram.astro`: o monograma DM.
- `Themis.astro`: a Têmis em SVG, com a balança articulada.

### `src/data/` e `src/lib/`

- `data/contact.ts`: WhatsApp, OAB, cidade, e-mail, endereço, horário, modo de atendimento e redes sociais.
- `data/content.ts`: áreas de atuação (com o tema do seletor), credenciais, etapas, manifesto, compromissos e perguntas frequentes.
- `data/navigation.ts`: ids das seções (as âncoras) e os links do menu e do rodapé.
- `data/icons.ts`: desenhos dos ícones (Tabler Icons).
- `data/brand.ts`: vetores do monograma, do nome e da Têmis. Não precisa mexer.
- `lib/whatsapp.ts`: mensagens prontas, links `wa.me` e a mensagem que o formulário monta.
- `lib/links.ts`: atributos de link que abre em outra aba.

### `src/scripts/`

`main.ts` liga tudo na raiz `[data-page]`. Cada recurso tem o seu módulo. A lógica pura fica em arquivos próprios, com testes unitários ao lado (`*.test.ts`).

- `motion-mode.ts`: escolhe o modo de movimento (`on`, `static` ou `reduced`) e o grava em `data-motion`.
- `reveal.ts`: revela o conteúdo ao entrar na tela.
- `balance.ts` e `balance-physics.ts`: a balança da Têmis e a física dela.
- `topic-picker.ts`: seletor de tema do hero.
- `menu.ts`: menu mobile, que abre pelo botão e fecha com Esc, link ou ao virar desktop, com o foco no lugar certo.
- `faq.ts`: abre e fecha as respostas.
- `contact-form.ts`, `contact-validation.ts` e `phone-mask.ts`: formulário de contato, regras de validação e máscara do telefone.
- `scroll-effects.ts` e `scroll-math.ts`: o que depende da rolagem (header, barra de progresso, parallax, link ativo, etapas, manifesto e botão flutuante).

### `src/styles/`

`global.css` importa a camada global, nesta ordem:

- `tokens.css`: cores, famílias tipográficas, curvas de animação e medidas.
- `base.css`: reset, raiz `.page`, foco, contêiner, seções, títulos, skip link e `.sr-only`.
- `buttons.css`: botões e links de ação.
- `forms.css`: campos do formulário.
- `motion.css`: sistema de revelação e keyframes.

### Configuração (raiz)

- `astro.config.mjs`: escopo dos estilos (`:where`) e fontes.
- `tsconfig.json`: TypeScript `strictest`.
- `eslint.config.js`, `stylelint.config.mjs`, `.prettierrc.json` e `.prettierignore`, `.htmlvalidate.mjs`, `.editorconfig` e `.gitattributes`: regras de código, CSS, formatação, HTML e editor.
- `vitest.config.ts` e `playwright.config.ts`: testes unitários e testes no navegador.

## Onde editar cada conteúdo

| Quero mudar…                                                           | Arquivo                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| WhatsApp, OAB, cidade, e-mail, endereço, horário, redes sociais        | `src/data/contact.ts`                                           |
| Áreas de atuação e temas do seletor, credenciais, etapas, compromissos | `src/data/content.ts`                                           |
| Perguntas frequentes                                                   | `src/data/content.ts` (`faq`)                                   |
| Texto das mensagens do WhatsApp                                        | `src/lib/whatsapp.ts`                                           |
| Itens do menu e do rodapé                                              | `src/data/navigation.ts`                                        |
| Títulos e parágrafos de uma seção                                      | o componente da seção em `src/components/`                      |
| Cores                                                                  | `src/styles/tokens.css`                                         |
| Fontes                                                                 | `fonts` no `astro.config.mjs` (arquivos em `src/assets/fonts/`) |
| Título e descrição da página nos buscadores                            | `src/pages/index.astro`                                         |

O que aparece em vários pontos da página (telefone, OAB, cidade, nomes das áreas) vem desses arquivos: mude uma vez e vale em todos os lugares.

### Foto do Diogo

Salve o retrato (vertical, 4:5) como `src/assets/diogo.jpg` (ou `.jpeg`, `.png`, `.webp`). Ele entra no lugar do placeholder, e o Astro gera os tamanhos otimizados. Não é preciso mexer em código.

## O que ainda falta preencher

Tudo o que está entre `[colchetes]` na página:

- `src/data/contact.ts`: UF e número da OAB, cidade, e-mail (o texto e o `mailto:`), endereço, horário e o link do LinkedIn.
- `src/data/content.ts`: formação, especialização e ano de início na advocacia.

As 6 áreas de atuação são sugestões para o Diogo confirmar. Quando o site tiver domínio, informe-o em `site` no `astro.config.mjs`.

## Qualidade e testes

`npm run verify` roda, nesta ordem: formatação (Prettier), lint (ESLint e Stylelint), tipos (`astro check`), testes unitários (Vitest), build, validação do HTML gerado (html-validate) e testes no navegador (Playwright). Os testes no navegador cobrem links e mensagens do WhatsApp, seletor de tema, menu, FAQ, formulário, header, botão flutuante, animações, resiliência do script, fontes e acessibilidade com axe (WCAG 2.2 AA).

O CI (`.github/workflows/ci.yml`) roda o `npm run verify` em cada push na `main` e em cada pull request.

### Regressão visual

`tests/visual/sections.spec.ts` captura cada seção em 390×844 e 1440×900 com movimento reduzido, além do menu aberto, do botão flutuante, dos erros do formulário e do FAQ com a segunda pergunta aberta. Os snapshots ficam em `tests/visual/__screenshots__/win32/` e foram gerados no Windows: como cada sistema renderiza as fontes de um jeito, a suíte roda só localmente (no `test:e2e`, no `verify` e no `test:visual`) e fica fora do CI.

Depois de uma mudança visual intencional, gere os snapshots de novo e revise as imagens antes do commit:

```bash
npm run test:visual -- --update-snapshots
```

Em outro sistema operacional, o mesmo comando cria os snapshots daquele sistema.

## Publicar

Na Vercel ou na Netlify, importe o projeto com o comando de build `npm run build` e a pasta de saída `dist`. Em qualquer outra hospedagem de site estático, basta enviar o conteúdo de `dist/`.

## Marca e licenças

- `brand/originais/logo.jpg` e `brand/originais/themis.jpg`: os arquivos enviados originalmente.
- `brand/logo-dm.svg` e `brand/themis.svg`: as versões vetorizadas, para uso fora do site. A página desenha a marca a partir de `src/data/brand.ts`.
- Fontes: Bodoni Moda e Hanken Grotesk, sob a SIL Open Font License 1.1 (licenças em `src/assets/fonts/`). São servidas pelo próprio site, sem nenhuma requisição ao Google.
- Ícones: Tabler Icons, sob a licença MIT.

## Design

O canvas com o design continua em https://claude.ai/artifact/VVqWz3kdkCy5zTdU58ksYP, mas o código oficial do site é este projeto.
