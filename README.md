# Diogo Menani — Advocacia & Assessoria Jurídica

Landing page do escritório: uma página estática em [Astro](https://astro.build) 7 com TypeScript. Todo contato vai para o WhatsApp: os botões abrem a conversa com uma mensagem pronta, e o formulário monta a mensagem com o que a pessoa escreveu.

## Requisitos

Node.js 24.16 ou mais novo na linha 24 (é o que o CI usa), 22.22.3+ na linha 22 ou 26.3+. É a faixa que todas as ferramentas do projeto aceitam (`engines` no `package.json`).

## Comandos

| Comando                                          | O que faz                                                                                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install`                                    | Instala as dependências (só na primeira vez).                                                                                                                                                     |
| `npx playwright install chromium firefox webkit` | Baixa os navegadores dos testes: na primeira vez e depois de cada atualização do Playwright (no Linux, com `--with-deps`).                                                                        |
| `npm run dev`                                    | Abre o site em http://localhost:4321 e recarrega a cada edição.                                                                                                                                   |
| `npm run build`                                  | Gera o site final em `dist/`.                                                                                                                                                                     |
| `npm run preview`                                | Serve o `dist/` para conferir o build.                                                                                                                                                            |
| `npm run verify`                                 | Confere tudo, na ordem do CI: formatação, lint, tipos, testes unitários, build, HTML e testes no navegador.                                                                                       |
| `npm run format`                                 | Formata o projeto com o Prettier.                                                                                                                                                                 |
| `npm run format:check`                           | Confere a formatação sem alterar nada.                                                                                                                                                            |
| `npm run lint`                                   | ESLint (TypeScript com checagem de tipos, Astro, acessibilidade e testes) e Stylelint (CSS). Antes, o `astro sync` gera os tipos do Astro. Avisos também reprovam.                                |
| `npm run check`                                  | Checagem de tipos de componentes e scripts (`astro check`, TypeScript `strictest`).                                                                                                               |
| `npm test`                                       | Testes unitários da lógica pura (Vitest). `npm run test:watch` roda em modo de observação.                                                                                                        |
| `npm run test:e2e`                               | Gera o build e roda os testes no navegador (Playwright) no Chromium, no Firefox e no WebKit (o motor do Safari): comportamento, acessibilidade com axe, fontes e (fora do CI) a regressão visual. |
| `npm run test:visual`                            | Gera o build e roda só a regressão visual.                                                                                                                                                        |
| `npm run validate:html`                          | Valida o HTML gerado em `dist/` (html-validate).                                                                                                                                                  |
| `npm run generate:images`                        | Gera de novo as imagens PNG de `public/` (favicon de 32 px, ícone do iOS e `og.png`, a prévia dos links) com o Chromium do Playwright. Rode quando a marca ou as cores mudarem.                   |

`npx playwright test` sozinho (ou pela extensão do editor) não gera o build: serve o `dist/` que já existir. Rode `npm run build` antes, senão os testes conferem o código da última build. Ele roda os três motores (Chromium, Firefox e WebKit) e a regressão visual; para um motor só, acrescente `--project=chromium` (ou `firefox`, `webkit`).

## Estrutura

```text
src/
├── pages/index.astro      a página: monta as seções na ordem
├── pages/privacidade.astro  /privacidade, o aviso de privacidade
├── pages/404.astro        a página de endereço não encontrado
├── pages/wordmark-*.ts    a assinatura do rodapé em arquivo: /wordmark-name.svg e /wordmark-sub.svg
├── pages/robots.txt.ts    /robots.txt, para os buscadores
├── pages/sitemap.xml.ts   /sitemap.xml, com as páginas de data/site.ts
├── layouts/Base.astro     <head>, fontes, skip link, os scripts que iniciam a página e o estilo sem JS
├── components/            uma seção por arquivo, mais as peças que elas usam
├── data/                  dados do escritório e conteúdo das seções (fonte única)
├── lib/                   links e mensagens do WhatsApp; atributos de link externo
├── scripts/               comportamento no navegador, um módulo por recurso
├── styles/                camada global de CSS
└── assets/fonts/          fontes woff2 e licenças OFL
public/                    favicons, prévia dos links (og.png) e cache (_headers): vão para o site do jeito que estão
scripts/                   geração das imagens PNG de public/ (npm run generate:images)
brand/                     originais e vetores da marca (não são publicados)
tests/e2e/                 testes no navegador
tests/visual/              regressão visual e snapshots
docs/superpowers/          especificações e planos de cada rodada (os já executados são registro histórico)
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
- `Footer.astro`: rodapé, com marca, navegação, contatos, redes sociais, OAB, aviso legal, o link do aviso de privacidade e o botão flutuante (fixo na tela, mas dentro do landmark do rodapé).
- `WhatsAppFab.astro`: botão flutuante do WhatsApp, no celular e no tablet; mora no `Footer.astro`.

Peças usadas pelas seções:

- `WhatsAppButton.astro`: botão padrão do WhatsApp (rótulo por prop; sempre com a mensagem de agendamento).
- `Field.astro`: campo do formulário com rótulo, controle e mensagem de erro.
- `Icon.astro`: ícone pelo nome.
- `Monogram.astro`: o monograma DM. Com `symbol`, desenha o `<symbol>` (o header faz isso); sem, reaproveita o desenho com `<use>`.
- `Themis.astro`: a Têmis em SVG, com a balança articulada.
- `MobileMenu.astro`: o menu de tela cheia do celular; mora no `Header.astro`, com o próprio CSS.
- `TopicPicker.astro`: o seletor de tema (chips) do `Hero.astro`.
- `ContactForm.astro`: o formulário que monta a mensagem do WhatsApp; mora no `Contato.astro`.
- `ExternalLink.astro`: link que abre em outra aba; avisa o leitor de tela com "(abre em outra aba)", que na tela não aparece. Todo link para fora do site usa ele.
- `SimpleHeader.astro` e `SimpleFooter.astro`: cabeçalho e rodapé das páginas secundárias (aviso de privacidade e 404), que não têm o script da página.

### `src/data/` e `src/lib/`

- `data/contact.ts`: WhatsApp, OAB, cidade, e-mail, endereço, horário, modo de atendimento e redes sociais.
- `data/content.ts`: áreas de atuação (com o tema do seletor), credenciais, etapas, manifesto, compromissos e perguntas frequentes.
- `data/navigation.ts`: ids das seções (as âncoras) e os links do menu e do rodapé.
- `data/site.ts`: título, descrição e prévia dos links (Open Graph) e as páginas do sitemap.
- `data/privacy.ts`: o texto do aviso de privacidade e a data da última revisão.
- `data/icons.ts`: desenhos dos ícones (Tabler Icons; licença em `data/MIT-tabler-icons.txt`).
- `data/brand.ts`: vetores do monograma, do nome e da Têmis. Não precisa mexer.
- `lib/whatsapp.ts`: mensagens prontas, links `wa.me` e a mensagem que o formulário monta.
- `lib/links.ts`: atributos de link que abre em outra aba e o aviso para o leitor de tela.
- `lib/structured-data.ts`: os dados estruturados (JSON-LD `LegalService`) que os buscadores leem.

### `src/scripts/`

`main.ts` liga tudo na raiz `[data-page]`, cada recurso isolado: um erro num deles não derruba os outros. Cada recurso tem o seu módulo. A lógica pura fica em arquivos próprios, com testes unitários ao lado (`*.test.ts`).

- `motion-mode.ts`: modo de movimento (`on`, `static` ou `reduced`) e a troca de modo sem animar. Um script inline no `Base.astro` grava `on` ou `reduced` em `data-motion` antes da primeira pintura (e volta a `pending`, em que tudo aparece, se o módulo da página não rodar); o `main.ts` confirma o modo e acompanha a preferência do sistema.
- `reveal.ts`: revela o conteúdo ao entrar na tela.
- `focus-visibility.ts`: o foco do teclado mostra na hora o bloco ainda escondido e não fica sob o header nem sob o botão flutuante.
- `balance.ts` e `balance-physics.ts`: a balança da Têmis e a física dela.
- `topic-picker.ts`: seletor de tema do hero.
- `menu.ts`: menu mobile, que abre pelo botão e fecha com Esc (de qualquer ponto), num link, ao voltar no histórico ou ao virar desktop, com o foco no lugar certo.
- `faq.ts`: abre e fecha as respostas.
- `contact-form.ts`, `contact-validation.ts` e `phone-mask.ts`: formulário de contato, regras de validação e máscara do telefone.
- `scroll-effects.ts` e `scroll-math.ts`: o que depende da rolagem (header, barra de progresso, parallax, link ativo, etapas, manifesto e botão flutuante).

### `src/styles/`

`global.css` importa a camada global, nesta ordem:

- `tokens.css`: cores, famílias tipográficas, escala de tamanhos de texto (`--fs-*`, a única que o Stylelint aceita em `font-size`, além de `clamp()` nos títulos), camadas (`--z-*`), curvas de animação e medidas.
- `base.css`: reset, raiz `.page`, foco, contêiner, seções, títulos, brilho radial (`.glow`), skip link e `.sr-only`.
- `buttons.css`: botões e links de ação.
- `forms.css`: campos do formulário.
- `motion.css`: sistema de revelação e keyframes.

### Configuração (raiz)

- `astro.config.mjs`: escopo dos estilos (`:where`) e fontes.
- `tsconfig.json`: TypeScript `strictest`.
- `eslint.config.js`, `stylelint.config.mjs`, `.prettierrc.json` e `.prettierignore`, `.htmlvalidate.mjs`, `.editorconfig` e `.gitattributes`: regras de código, CSS, formatação, HTML e editor.
- `vitest.config.ts` e `playwright.config.ts`: testes unitários e testes no navegador.
- `vercel.json` (e `public/_headers`, para Netlify e Cloudflare Pages): cache longo dos assets com hash no nome (`/_astro/`).

## Onde editar cada conteúdo

| Quero mudar…                                                           | Arquivo                                                                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp, OAB, cidade, e-mail, endereço, horário, redes sociais        | `src/data/contact.ts`                                                                                                     |
| Áreas de atuação e temas do seletor, credenciais, etapas, compromissos | `src/data/content.ts`                                                                                                     |
| Perguntas frequentes                                                   | `src/data/content.ts` (`faq`)                                                                                             |
| Texto das mensagens do WhatsApp                                        | `src/lib/whatsapp.ts`                                                                                                     |
| Itens do menu e do rodapé                                              | `src/data/navigation.ts`                                                                                                  |
| Títulos e parágrafos de uma seção                                      | o componente da seção em `src/components/`                                                                                |
| Cores                                                                  | `src/styles/tokens.css` (o azul royal também está no `theme-color` do `src/layouts/Base.astro` e no `public/favicon.svg`) |
| Fontes                                                                 | `fonts` no `astro.config.mjs` (arquivos em `src/assets/fonts/`)                                                           |
| Título e descrição da página nos buscadores e na prévia dos links      | `src/data/site.ts`                                                                                                        |
| Aviso de privacidade (texto e data de atualização)                     | `src/data/privacy.ts` (os links do texto ficam em `src/pages/privacidade.astro`)                                          |

O aviso de privacidade é um ponto de partida: o texto deve ser revisado pelo Diogo antes da publicação.

O que aparece em vários pontos da página (telefone, OAB, cidade, nomes das áreas) vem desses arquivos: mude uma vez e vale em todos os lugares.

Os testes conferem o conteúdo atual (textos, mensagens e número do WhatsApp, perguntas, áreas). Ao mudar conteúdo, ajuste os testes que citam o texto antigo (em `tests/` e nos `*.test.ts`) e gere de novo os snapshots da regressão visual.

### Foto do Diogo

Salve o retrato (vertical, 4:5) como `src/assets/diogo.jpg` (ou `.jpeg`, `.png`, `.webp`, com a extensão em maiúsculas ou minúsculas). Ele entra no lugar do placeholder, e o Astro gera os tamanhos otimizados. Não é preciso mexer em código.

## O que ainda falta preencher

Tudo o que está entre `[colchetes]` na página:

- `src/data/contact.ts`: UF e número da OAB, cidade, e-mail (o texto e o `mailto:`), endereço, horário e o link do LinkedIn.
- `src/data/content.ts`: formação, especialização e ano de início na advocacia.

As 6 áreas de atuação são sugestões para o Diogo confirmar. Quando o site tiver domínio, informe-o em `site` no `astro.config.mjs`: sem ele, não saem o canonical, a imagem de prévia dos links (`og:image`), o `url` do JSON-LD nem as páginas do sitemap.

## Qualidade e testes

`npm run verify` roda, nesta ordem: formatação (Prettier), lint (ESLint e Stylelint), tipos (`astro check`), testes unitários (Vitest), build, validação do HTML gerado (html-validate) e testes no navegador (Playwright). Os testes no navegador rodam em três motores, Chromium, Firefox e WebKit (o do Safari), e cobrem links e mensagens do WhatsApp, seletor de tema, menu, FAQ, formulário, header, botão flutuante, animações, resiliência do script, fontes, privacidade (nenhuma requisição a terceiros) e acessibilidade: axe (WCAG 2.2 AA) mais o que ele não confere, como o que o leitor de tela anuncia nos campos, o foco no alto contraste e a cor da seleção.

O CI (`.github/workflows/ci.yml`) roda o `npm run verify` em cada push na `main`, em cada pull request e sob demanda (Actions → CI → Run workflow). Quando um teste falha, os traces ficam guardados como artefato `test-results`.

### Regressão visual

`tests/visual/sections.spec.ts` captura cada seção em 390×844 e 1440×900 com movimento reduzido, além do header rolado, do menu aberto, do botão flutuante, dos erros do formulário e do FAQ com a segunda pergunta aberta. O ano do copyright fica coberto, para a captura não falhar na virada do ano. Os snapshots ficam em `tests/visual/__screenshots__/win32/` e foram gerados no Windows: como cada sistema renderiza as fontes de um jeito, a suíte roda só localmente (no `test:e2e`, no `verify` e no `test:visual`), fica fora do CI e, fora do Windows, roda sem comparar imagens.

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
- Fontes: Baskervville (títulos) e Hanken Grotesk (texto), sob a SIL Open Font License 1.1 (licenças em `src/assets/fonts/`). São servidas pelo próprio site, sem nenhuma requisição ao Google.
- Ícones: Tabler Icons, sob a licença MIT (texto em `src/data/MIT-tabler-icons.txt`).

## Design

O canvas com o design continua em https://claude.ai/artifact/VVqWz3kdkCy5zTdU58ksYP, mas o código oficial do site é este projeto.
