# Diogo Menani — Advocacia & Assessoria Jurídica

Landing page do escritório: uma página estática em [Astro](https://astro.build) 7 com TypeScript. Todo contato vai para o WhatsApp (os botões abrem a conversa com uma mensagem pronta) ou para o e-mail; o site não tem formulário.

## Requisitos

Node.js 24.16 ou mais novo na linha 24 (fixada em `.node-version`, que o CI, a Netlify e a Cloudflare Pages leem), 22.22.3+ na linha 22 ou 26.3+. É a faixa que todas as ferramentas do projeto aceitam (`engines` no `package.json`).

## Comandos

| Comando                                          | O que faz                                                                                                                                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install`                                    | Instala as dependências (só na primeira vez).                                                                                                                                                        |
| `npx playwright install chromium firefox webkit` | Baixa os navegadores dos testes: na primeira vez e depois de cada atualização do Playwright (no Linux, com `--with-deps`).                                                                           |
| `npm run dev`                                    | Abre o site em http://localhost:4321 e recarrega a cada edição.                                                                                                                                      |
| `npm run build`                                  | Gera o site final em `dist/`.                                                                                                                                                                        |
| `npm run preview`                                | Serve o `dist/` para conferir o build.                                                                                                                                                               |
| `npm run verify`                                 | Confere tudo, na ordem do CI: formatação, lint, tipos, testes unitários, build, HTML e testes no navegador.                                                                                          |
| `npm run format`                                 | Formata o projeto com o Prettier.                                                                                                                                                                    |
| `npm run format:check`                           | Confere a formatação sem alterar nada.                                                                                                                                                               |
| `npm run lint`                                   | ESLint (TypeScript com checagem de tipos, Astro, acessibilidade e testes) e Stylelint (CSS). Antes, o `astro sync` gera os tipos do Astro. Avisos também reprovam.                                   |
| `npm run check`                                  | Checagem de tipos de componentes e scripts (`astro check`, TypeScript `strictest`).                                                                                                                  |
| `npm test`                                       | Testes unitários (Vitest): a lógica pura e a checagem das media queries do CSS. `npm run test:watch` roda em modo de observação.                                                                     |
| `npm run test:e2e`                               | Gera o build e roda os testes no navegador (Playwright) no Chromium, no Firefox e no WebKit (o motor do Safari): comportamento, acessibilidade com axe, fontes e (fora do CI) a regressão visual.    |
| `npm run test:visual`                            | Gera o build e roda só a regressão visual.                                                                                                                                                           |
| `npm run validate:html`                          | Valida o HTML gerado em `dist/` (html-validate).                                                                                                                                                     |
| `npm run generate:images`                        | Gera de novo as imagens de `public/` (favicons PNG de 32 e 96 px, `favicon.ico`, ícone do iOS e `og.png`, a prévia dos links) com o Chromium do Playwright. Rode quando a marca ou as cores mudarem. |

`npx playwright test` sozinho (ou pela extensão do editor) não gera o build: serve o `dist/` que já existir. Rode `npm run build` antes, senão os testes conferem o código da última build. Ele roda os três motores (Chromium, Firefox e WebKit) e a regressão visual; para um motor só, acrescente `--project=chromium` (ou `firefox`, `webkit`).

## Estrutura

```text
src/
├── pages/index.astro      a página: monta as seções na ordem
├── pages/privacidade.astro  /privacidade/, o aviso de privacidade
├── pages/404.astro        a página de endereço não encontrado
├── pages/wordmark-*.ts    a assinatura do rodapé em arquivo: /wordmark-name.svg e /wordmark-sub.svg
├── pages/logo-*.ts        o logo em arquivo: /logo-blue.svg e /logo-white.svg (oficial), /logo-compact-*.svg (header)
├── pages/robots.txt.ts    /robots.txt, para os buscadores (o texto vem de lib/seo-files.ts)
├── pages/sitemap.xml.ts   /sitemap.xml, com as páginas de data/site.ts (idem)
├── layouts/Base.astro     <head>, fontes, skip link, os scripts que iniciam a página e o estilo sem JS
├── components/            uma seção por arquivo, mais as peças que elas usam
├── data/                  dados do escritório e conteúdo das seções (fonte única)
├── lib/                   links e mensagens do WhatsApp, atributos de link externo, metadados do <head>, logo e checagem de lançamento
├── scripts/               comportamento no navegador, um módulo por recurso
├── styles/                camada global de CSS
└── assets/fonts/          fontes woff2 e licenças OFL
public/                    favicons, prévia dos links (og.png) e cabeçalhos de segurança e de cache (_headers): vão para o site do jeito que estão
scripts/                   geração das imagens PNG de public/ (npm run generate:images) e a checagem de lançamento (npm run check:launch)
brand/                     originais e vetores da marca (não são publicados)
tests/e2e/                 testes no navegador
tests/visual/              regressão visual e snapshots
docs/superpowers/          especificações e planos de cada rodada (os já executados são registro histórico)
.github/workflows/ci.yml   CI: npm run verify a cada push na main e em cada pull request
.github/dependabot.yml     atualizações semanais das dependências do npm e das actions
```

### `src/components/`

Seções, na ordem da página. O CSS de cada uma fica no `<style>` do próprio arquivo.

- `Header.astro`: barra fixa com o logo (versão branca sobre o hero, azul com o header claro), a navegação e o botão "Fale conosco"; no celular, o menu de tela cheia.
- `Hero.astro`: abertura (`#inicio`), com o título, o seletor de tema que troca o botão principal e a Têmis.
- `Sobre.astro`: apresentação curta (`#sobre`): o logo e a inscrição na OAB.
- `Areas.astro`: "Onde podemos ajudar", as áreas de atuação (`#atuacao`), cada uma com o próprio link do WhatsApp.
- `Processo.astro`: "Como trabalhamos" e as etapas numa linha do tempo vertical (`#como-trabalhamos`).
- `Manifesto.astro`: a frase de compromisso e a lista de compromissos.
- `Duvidas.astro`: perguntas frequentes (`#duvidas`).
- `Contato.astro`: "Fale conosco", o botão do WhatsApp e os canais de contato (`#contato`).
- `Footer.astro`: rodapé, com marca, navegação, contatos, redes sociais, OAB, aviso legal, o link do aviso de privacidade e o botão flutuante (fixo na tela, mas dentro do landmark do rodapé).
- `WhatsAppFab.astro`: botão flutuante do WhatsApp, no celular e no tablet; mora no `Footer.astro`.

Peças usadas pelas seções:

- `WhatsAppButton.astro`: botão padrão do WhatsApp (rótulo por prop; sempre com a mensagem padrão). Com `cta`, vira a chamada principal: caixa alta e seta no fim.
- `Icon.astro`: ícone pelo nome.
- `Logo.astro`: o logo, como `<img>` do arquivo gerado por `pages/logo-[file].svg.ts`; `tone="blue"` sobre fundo claro, `tone="white"` sobre o azul, e `compact` para alturas pequenas (o header), com a linha de baixo legível.
- `Monogram.astro`: o monograma DM em SVG inline (rodapé).
- `Themis.astro`: a Têmis em SVG, com a balança articulada.
- `MobileMenu.astro`: o menu de tela cheia do celular; mora no `Header.astro`, com o próprio CSS.
- `TopicPicker.astro`: o seletor de tema (chips) do `Hero.astro`.
- `ExternalLink.astro`: link que abre em outra aba; avisa o leitor de tela com "(abre em outra aba)", que na tela não aparece. Todo link para fora do site usa ele.
- `SimpleHeader.astro` e `SimpleFooter.astro`: cabeçalho e rodapé das páginas secundárias (aviso de privacidade e 404), que não têm o script da página.

### `src/data/` e `src/lib/`

- `data/contact.ts`: WhatsApp, OAB, e-mail, horário, modo de atendimento e redes sociais do escritório (Instagram, TikTok e Facebook), que também vão no `sameAs` do JSON-LD.
- `data/content.ts`: áreas de atuação, em ordem alfabética (com o assunto da mensagem e o tema do seletor), etapas, manifesto, compromissos e perguntas frequentes.
- `data/navigation.ts`: ids das seções (as âncoras) e os links do menu e do rodapé.
- `data/site.ts`: título, descrição e prévia dos links (Open Graph), as páginas do sitemap e o endereço do aviso de privacidade (`privacyPath`).
- `data/privacy.ts`: o texto do aviso de privacidade e a data da última revisão.
- `data/icons.ts`: desenhos dos ícones (Tabler Icons; licença em `data/MIT-tabler-icons.txt`).
- `data/brand.ts`: vetores do monograma, do nome e da Têmis, e as medidas e cores das duas versões do logo. Não precisa mexer.
- `lib/whatsapp.ts`: mensagens prontas e links `wa.me`.
- `lib/links.ts`: atributos de link que abre em outra aba e o aviso para o leitor de tela.
- `lib/structured-data.ts`: os dados estruturados que os buscadores leem (JSON-LD `Organization`, com o Diogo como `member`, e, com `site`, o `WebSite`, que dá o nome acima do resultado) e o texto deles para o `<script>`.
- `lib/page-meta.ts`: os endereços absolutos do `<head>` (canonical, `og:url` e a imagem de prévia), que só saem com `site`.
- `lib/seo-files.ts`: o texto do `/sitemap.xml` e do `/robots.txt`, testado também com um domínio.
- `lib/logo.ts`: monta o SVG do logo (monograma, divisória e assinatura), oficial ou compacto, a partir de `data/brand.ts`.
- `lib/launch-check.ts`: as regras da checagem de lançamento (placeholders, domínio de exemplo, LinkedIn genérico, falta de canonical); `scripts/check-launch.ts` a roda sobre o `dist/`.

### `src/scripts/`

`main.ts` liga tudo na raiz `[data-page]`, cada recurso isolado: um erro num deles não derruba os outros. Cada recurso tem o seu módulo. A lógica pura fica em arquivos próprios, com testes unitários ao lado (`*.test.ts`).

- `motion-mode.ts`: modo de movimento (`on`, `static` ou `reduced`) e a troca de modo sem animar. Um script inline no `Base.astro` grava `on` ou `reduced` em `data-motion` antes da primeira pintura (e, se o módulo da página não rodar, volta a `pending`, em que tudo aparece, e marca `data-fallback`: o header rola com a página e o botão Menu some, como sem JavaScript); o `main.ts` confirma o modo, acompanha a preferência do sistema e marca `data-ready` (que liga os estados escondidos das revelações) e `data-entered` (o fim das animações de entrada).
- `reveal.ts`: revela o conteúdo ao entrar na tela.
- `focus-visibility.ts`: o foco do teclado mostra na hora o bloco ainda escondido e não fica sob o header nem sob o botão flutuante.
- `balance.ts` e `balance-physics.ts`: a balança da Têmis e a física dela.
- `topic-picker.ts`: seletor de tema do hero.
- `menu.ts`: menu mobile, que abre pelo botão e fecha com Esc (de qualquer ponto), num link, ao voltar no histórico ou ao virar desktop, com o foco no lugar certo.
- `faq.ts`: abre e fecha as respostas.
- `scroll-effects.ts` e `scroll-math.ts`: o que depende da rolagem (header, barra de progresso, parallax, link ativo, etapas, manifesto e botão flutuante).

### `src/styles/`

`global.css` importa a camada global, nesta ordem:

- `tokens.css`: cores, famílias tipográficas, escala de tamanhos de texto (`--fs-*`, a única que o Stylelint aceita em `font-size`, além de `clamp()` nos títulos), camadas (`--z-*`), curvas de animação e medidas.
- `base.css`: reset, raiz `.page`, foco, contêiner, seções, títulos, brilho radial (`.glow`), skip link e `.sr-only`.
- `buttons.css`: botões e links de ação.
- `motion.css`: sistema de revelação e keyframes.

Fora da camada global:

- `media-queries.test.ts`: teste (Vitest) que lê o CSS de `src/` e confere que as faixas das media queries não deixam lacuna de 1 px.

### Configuração (raiz)

- `astro.config.mjs`: escopo dos estilos (`:where`), CSS embutido no HTML (`inlineStylesheets`), navegadores-alvo do CSS (`vite.build.cssTarget`: Chrome e Edge 111+, Firefox 114+ e Safari/iOS 16.4+), fontes e o domínio do site (`site`, comentado até o domínio existir).
- `tsconfig.json`: TypeScript `strictest`.
- `.node-version`: a linha do Node.js (24) do CI e do build na Netlify e na Cloudflare Pages.
- `eslint.config.js`, `stylelint.config.mjs`, `.prettierrc.json` e `.prettierignore`, `.htmlvalidate.mjs`, `.editorconfig` e `.gitattributes`: regras de código, CSS, formatação, HTML e editor.
- `vitest.config.ts` e `playwright.config.ts`: testes unitários e testes no navegador.
- `vercel.json` (e `public/_headers`, para Netlify e Cloudflare Pages, com os mesmos valores): cabeçalhos de segurança em todas as respostas (CSP, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` e COOP), cache longo dos assets com hash no nome (`/_astro/`), um dia de cache para o logo e a assinatura (`/logo-*` e `/wordmark-*`, de nome fixo) e, na Vercel, o redirecionamento para a URL com barra (`trailingSlash`), a que o build gera (`privacidade/index.html`). A CSP libera o script inline do `Base.astro` pelo hash: mexer nele exige trocar o `sha256-…` nos dois arquivos, e o teste "hash do script inline está na CSP" reprova se esquecer. O HSTS fica sem `includeSubDomains` e sem `preload` até o domínio final existir e todos os subdomínios dele terem HTTPS.

## Onde editar cada conteúdo

| Quero mudar…                                                      | Arquivo                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp, OAB, e-mail, horário, redes sociais                     | `src/data/contact.ts`                                                                                                                                                                                                                                                                                                                                                                                 |
| Áreas de atuação e temas do seletor, etapas, compromissos         | `src/data/content.ts`                                                                                                                                                                                                                                                                                                                                                                                 |
| Perguntas frequentes                                              | `src/data/content.ts` (`faq`)                                                                                                                                                                                                                                                                                                                                                                         |
| Texto das mensagens do WhatsApp                                   | `src/lib/whatsapp.ts`                                                                                                                                                                                                                                                                                                                                                                                 |
| Itens do menu e do rodapé                                         | `src/data/navigation.ts`                                                                                                                                                                                                                                                                                                                                                                              |
| Títulos e parágrafos de uma seção                                 | o componente da seção em `src/components/`                                                                                                                                                                                                                                                                                                                                                            |
| Cores                                                             | `src/styles/tokens.css` (o azul-noite do alto do hero também está no `theme-color` da home, em `src/pages/index.astro`; o azul royal, no `theme-color` padrão do `src/layouts/Base.astro`, usado pelo aviso de privacidade e pela 404, e no `public/favicon.svg`); as cores do logo ficam em `logoTones` (`src/data/brand.ts`), e o azul do monograma se repete no teste `tests/e2e/delivery.spec.ts` |
| Fontes                                                            | `fonts` no `astro.config.mjs` (arquivos em `src/assets/fonts/`)                                                                                                                                                                                                                                                                                                                                       |
| Título e descrição da página nos buscadores e na prévia dos links | `src/data/site.ts`                                                                                                                                                                                                                                                                                                                                                                                    |
| Aviso de privacidade (texto e data de atualização)                | `src/data/privacy.ts` (os links do texto ficam em `src/pages/privacidade.astro`)                                                                                                                                                                                                                                                                                                                      |

O aviso de privacidade é um ponto de partida: o texto deve ser revisado pelo Diogo antes da publicação.

O que aparece em vários pontos da página (telefone, OAB, nomes das áreas) vem desses arquivos: mude uma vez e vale em todos os lugares.

Os testes conferem o conteúdo atual (textos, mensagens e número do WhatsApp, perguntas, áreas). Ao mudar conteúdo, ajuste os testes que citam o texto antigo (em `tests/` e nos `*.test.ts`) e gere de novo os snapshots da regressão visual.

## O que ainda falta preencher

Nenhum texto da página está mais entre `[colchetes]` (o `npm run check:launch` reprova se algum voltar). Falta o domínio: quando o site tiver um, informe-o em `site` no `astro.config.mjs`: sem ele, não saem o canonical, a imagem de prévia dos links (`og:image`), o `url` e o `WebSite` do JSON-LD nem as páginas do sitemap.

## Qualidade e testes

`npm run verify` roda, nesta ordem: formatação (Prettier), lint (ESLint e Stylelint), tipos (`astro check`), testes unitários (Vitest), build, validação do HTML gerado (html-validate) e testes no navegador (Playwright). Os testes no navegador rodam em três motores, Chromium, Firefox e WebKit (o do Safari), e cobrem links e mensagens do WhatsApp, seletor de tema, menu, FAQ, header, botão flutuante, animações, resiliência do script, fontes, privacidade (nenhuma requisição a terceiros) e acessibilidade: axe (WCAG 2.2 AA) mais o que ele não confere, como o nome acessível do título e dos links que abrem outra aba, o foco sob o header e a cor da seleção.

O CI (`.github/workflows/ci.yml`) roda o `npm run verify` em cada push na `main`, em cada pull request e sob demanda (Actions → CI → Run workflow). Ele roda dentro da imagem oficial do Playwright, que já traz os navegadores e as bibliotecas do sistema, na mesma versão do `package-lock.json`. Antes, o `npm audit --omit=dev --audit-level=high` reprova uma dependência de produção com vulnerabilidade alta (as de desenvolvimento ficam de fora: não chegam ao `dist/`). Quando um teste falha, os traces ficam guardados como artefato `test-results`. O Dependabot (`.github/dependabot.yml`) abre toda semana um pull request com as versões menores e as correções do npm, um para cada versão maior e os das actions; os majors do TypeScript e do `@types/node` ficam de fora (o motivo está no arquivo).

Os testes que amostram quadro a quadro a troca do rótulo do botão principal (`tests/e2e/topic.spec.ts`) pulam, com o motivo no relatório, quando a fase que precisavam ver coube inteira entre dois quadros: no WebKit do CI, que roda sem GPU, um quadro chega a levar 160 ms durante a troca. Com quadros curtos, como na máquina de desenvolvimento, eles julgam normalmente.

### Regressão visual

`tests/visual/sections.spec.ts` captura cada seção em 390×844 e 1440×900 com movimento reduzido, além do header rolado, do menu aberto, do botão flutuante e do FAQ com a segunda pergunta aberta. O ano do copyright fica coberto, para a captura não falhar na virada do ano. Os snapshots ficam em `tests/visual/__screenshots__/win32/` e foram gerados no Windows: como cada sistema renderiza as fontes de um jeito, a suíte roda só localmente (no `test:e2e`, no `verify` e no `test:visual`), fica fora do CI e, fora do Windows, roda sem comparar imagens.

Depois de uma mudança visual intencional, gere os snapshots de novo e revise as imagens antes do commit:

```bash
npm run test:visual -- --update-snapshots
```

Em outro sistema operacional, o mesmo comando cria os snapshots daquele sistema.

## Antes de publicar

1. Preencha os dados do Diogo no lugar dos placeholders `[…]`.
2. Defina `site` em `astro.config.mjs` (o domínio final). Sem ele, não há canonical, `og:image` absoluta nem `Sitemap:`.
3. Gere as imagens de novo se a marca mudar: `npm run generate:images`.
4. Rode `npm run check:launch` até sair "Pronto para publicar.". Ele gera o build e lista, com o arquivo, cada placeholder, o domínio de exemplo `seudominio`, o LinkedIn genérico e a falta de canonical na home.
5. Revise o aviso de privacidade com o Diogo: o texto é um ponto de partida, não parecer jurídico.
6. Depois do deploy, confira no domínio com `curl -I https://<domínio>/` e `curl -I https://<domínio>/privacidade/` que chegam os sete cabeçalhos de segurança (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` e `Cross-Origin-Opener-Policy`): os testes leem os arquivos de configuração, não a resposta do servidor.

A checagem do passo 4 não roda no CI de propósito: enquanto os dados não chegam, ela falha por definição, e o CI tem de continuar verde.

## Publicar

Na Vercel, na Netlify ou na Cloudflare Pages, importe o projeto com o comando de build `npm run build` e a pasta de saída `dist`. Nelas, os cabeçalhos de segurança e de cache já vêm configurados: na Vercel pelo `vercel.json`, na Netlify e na Cloudflare Pages pelo `public/_headers` (copiado para `dist/`). Em outra hospedagem de site estático, envie o conteúdo de `dist/` e replique nela os cabeçalhos e as regras de cache do `vercel.json`: sem isso, o site sai sem CSP, sem HSTS e sem proteção contra iframe.

A Netlify e a Cloudflare Pages pegam a versão do Node do `.node-version`, e a Vercel pega do `engines` do `package.json`. Sem isso, a Cloudflare Pages usa um Node 22 mais antigo do que o Astro 7 aceita, e o build falha.

## Marca e licenças

- `brand/originais/logo.jpg` e `brand/originais/themis.jpg`: os arquivos enviados originalmente; `logo-oficial-azul.png` e `logo-oficial-branca.png`, o logo oficial completo (referência de `logoLayouts.full` e `logoTones` em `src/data/brand.ts`).
- `brand/themis.svg`: a Têmis vetorizada, para uso fora do site. `brand/logo-dm.svg` é só o monograma, no royal do site (`#00167B`), próximo mas não igual ao azul do logo oficial (`#1500a0`). O logo oficial completo (monograma, divisória e assinatura) sai de `src/lib/logo.ts` no build, como `/logo-blue.svg`, `/logo-white.svg` e `/logo-compact-*.svg`: para uso fora do site, copie-o de `dist/` depois do `npm run build`. A página desenha a marca a partir de `src/data/brand.ts`.
- Fontes: Baskervville (títulos) e Hanken Grotesk (texto), sob a SIL Open Font License 1.1 (licenças em `src/assets/fonts/`). São servidas pelo próprio site, sem nenhuma requisição ao Google.
- Ícones: Tabler Icons, sob a licença MIT (texto em `src/data/MIT-tabler-icons.txt`).

## Design

O canvas com o design continua em https://claude.ai/artifact/VVqWz3kdkCy5zTdU58ksYP, mas o código oficial do site é este projeto.
