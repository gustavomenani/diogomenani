# Rodada 3: entrega, SEO, privacidade e organização — especificação

Data: 2026-10-20. Pedido do usuário, depois do relatório de estrutura: "pode fazer tudo de uma vez", sem rodada de perguntas. A rodada continua a [rodada 1](2026-10-19-correcao-qualidade-design.md), a [rodada 2](2026-10-19-correcao-rodada-2-design.md) e a [tipografia](2026-10-20-tipografia-design.md). As restrições e os itens I1–I50 continuam valendo.

## Intenção

Deixar o site pronto para ir ao ar assim que o Diogo mandar os dados que faltam. Isso inclui:

- terminar o que a rodada 2 deixou pendente;
- dar ao link uma prévia decente no WhatsApp e no Google;
- impedir que um placeholder vá para produção sem ninguém perceber;
- explicar com clareza o que acontece com os dados de quem escreve;
- deixar o código mais fácil de manter.

## Objetivos

1. Terminar as Tasks 9–11 do [plano da rodada 2](../plans/2026-10-19-correcao-rodada-2.md):
   - I47 (favicons PNG) e I49 (CSS embutido);
   - as mudanças sem efeito na tela que estão pendentes (balança que para a menos de 0,1 px, `sizes` do retrato, cache longo dos assets);
   - os testes de mutantes, os tipos e a documentação.
2. Metadados de compartilhamento e de busca:
   - Open Graph e Twitter;
   - canonical;
   - JSON-LD de `LegalService`;
   - `robots.txt` e `sitemap.xml`;
   - imagem de prévia.
3. Uma checagem de lançamento que reprove enquanto houver placeholder ou faltar o domínio.
4. Aviso de privacidade (LGPD) e uma página 404.
5. Organização do código, sem efeito na tela salvo o que tiver ID:
   - componentes menores;
   - escala tipográfica em tokens;
   - tokens de z-index e de medidas;
   - wordmark servido como arquivo.

## Não-objetivos

- Preencher dados do Diogo (OAB, cidade, e-mail, endereço, horário, LinkedIn, domínio, formação, foto). Eles continuam entre colchetes, e a checagem de lançamento os aponta.
- Mudar a ordem das seções, as cores ou a identidade visual.
- `@custom-media` para os breakpoints: exigiria dois plugins de PostCSS por um ganho pequeno. Fica registrado.
- Unificar as entrelinhas: cada uma está casada com o tamanho e o contexto, e unificá-las mudaria a tela em toda parte.

## Restrições

- As das rodadas anteriores:
  - pt-BR nos textos, comentários e docs; identificadores em inglês;
  - só devDependencies;
  - nada de requisição a terceiros na página (o teste de privacidade continua valendo);
  - `npm run verify` verde nos três motores ao fim de cada task.
- Nenhum texto inventado sobre o Diogo. Os textos novos (aviso de privacidade, 404, kicker do hero) usam só os dados de `src/data/` e fatos verificáveis sobre o próprio site.
- Toda diferença visual tem um ID nesta spec. As demais mudanças não podem alterar nenhum snapshot.
- Sem `site` definido, o build continua funcionando: as tags que exigem URL absoluta (canonical, `og:url`, `og:image`, `Sitemap:`) simplesmente não saem.

## Decisões de arquitetura (tomadas por Claude)

- **`src/data/site.ts`:** a fonte única do nome, da descrição, do título e do locale. O `index.astro` e o `Base.astro` leem dele.
- **`Base.astro` e páginas secundárias:** o layout ganha `interactive` (padrão `true`). Com `interactive={false}`, saem o script inline de movimento e o módulo da página, e a raiz fica em `data-motion="pending"`, em que tudo aparece. É o modo das páginas `/privacidade` e `/404`.
  - Essas páginas usam `SimpleHeader.astro` e `SimpleFooter.astro`. O `Header` e o `Footer` dependem de seções, do `<symbol>` da Têmis no hero e do botão flutuante, que só existem na home.
- **Arquivos gerados por endpoints do Astro, a partir dos dados:**
  - `src/pages/robots.txt.ts`, `src/pages/sitemap.xml.ts` e `src/pages/wordmark-[part].svg.ts` (`/wordmark-name.svg` e `/wordmark-sub.svg`);
  - o sitemap lista `/` e `/privacidade`;
  - sem `site`, o sitemap sai vazio de URLs e o `robots.txt` sai sem a linha `Sitemap:`.
- **Imagens (`og.png` 1200×630, `favicon-32.png` e `apple-touch-icon.png` 180×180):** geradas uma vez por `scripts/generate-images.ts` (Playwright, já instalado) e versionadas em `public/`. O script fica para gerá-las de novo quando a marca mudar.
- **Checagem de lançamento:**
  - a lógica pura fica em `src/lib/launch-check.ts`, com testes no Vitest; o executável é `scripts/check-launch.ts` (Node roda TypeScript direto) e o comando é `npm run check:launch`;
  - ela fica fora do `verify`, porque hoje reprovaria por definição;
  - o README ganha um "Antes de publicar".
- **Cache longo dos assets:** `public/_headers` (Netlify) e `vercel.json` (Vercel), com `Cache-Control: public, max-age=31536000, immutable` só para `/_astro/*`.
- **Componentes extraídos, sem mudar a marcação gerada:**
  - `MobileMenu.astro`, saído do `Header`;
  - `TopicPicker.astro`, saído do `Hero`;
  - `ContactForm.astro`, saído do `Contato`.

## Mudanças intencionais desta rodada

| ID  | Mudança                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I51 | `<head>` com Open Graph (`og:type` website, `og:site_name`, `og:title`, `og:description`, `og:locale` pt_BR) e `twitter:card`. Com `site` definido, também canonical, `og:url` e `og:image`/`twitter:image` (`/og.png`, 1200×630).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| I52 | JSON-LD `LegalService` com nome, descrição, telefone (+55 18 99701-7249), e-mail, endereço, `areaServed` (cidade), `knowsAbout` (as áreas), `sameAs` (as redes) e, com `site`, `url` e `image`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| I53 | `<title>`: "Diogo Menani — Advogado em {cidade}" (curto: o html-validate barra título com mais de 70 caracteres).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| I54 | Hero: o `<h1>` ganha, antes do título, um kicker "Diogo Menani · Advogado em {cidade}" (Hanken 600, 13 px, maiúsculas, espaçamento 0,12em, cor `--sky`). O título animado não muda. O kicker ocupa 36 px inteiros (linha de 18 px e 18 px até o título), para as seções de baixo não descerem uma fração de pixel. Snapshots que mudaram: `inicio-390` (o hero fica 36 px mais alto, 929 → 965 px; os chips, o botão e o link "Como funciona o atendimento" continuam na primeira dobra de 390×844) e `inicio-1440` (o bloco de texto, centrado na altura, desce 18 px; o kicker termina a ~490 px da Têmis). O `padding-top` do hero não mudou.                                                                                                                                                            |
| I55 | Página `/privacidade` com o aviso de privacidade (texto fixo abaixo); link "aviso de privacidade" no consentimento do formulário (abre em outra aba, para não perder o que foi digitado) e "Privacidade" no rodapé.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| I56 | Página 404: título "Página não encontrada", o texto fixo abaixo, link "Ir para o início" e o botão "Conversar pelo WhatsApp".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| I57 | Compromisso "Atendimento online": "Reuniões por videochamada e envio de documentos pelo WhatsApp, sem precisar sair de casa." (antes prometia um "envio seguro" que o site não oferece).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| I58 | Links que abrem em outra aba anunciam "(abre em outra aba)" ao leitor de tela, com texto `sr-only`. Na tela, nada muda.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| I59 | Os painéis do FAQ viram `<div>` (sem `aria-labelledby`): saem 5 landmarks "região" que poluíam a navegação por regiões.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| I60 | Escala tipográfica: 13,5 px vira 14 px (`forms.css` e rodapé) e 15,5 px vira 15 px (rodapé). Snapshots que mudaram: `footer-390` e `footer-1440` (colunas e faixa de baixo: o rodapé fica 2 a 3 px mais curto) e `contato-erros-1440` (mensagens de erro dos campos, 4 px mais alto); `contato-390` e `contato-1440` não mostram erros e ficaram iguais.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| I61 | Wordmark do rodapé servido como arquivo, em `/wordmark-name.svg` e `/wordmark-sub.svg` (`<img>` com `loading="lazy"`, vai para o cache): são dois porque cada linha tem a própria largura e o espaço entre elas é fixo, o que um SVG só não reproduz em todas as larguras. O monograma é desenhado uma vez e reaproveitado com `<use>`. O HTML perde ~25 KB (137.437 → 112.545 bytes). Na tela, a única diferença é de antialiasing: o Chromium alinha a imagem ao pixel inteiro, e o SVG embutido ficava em fração de pixel. Medido contra os snapshots antigos, com o texto de I60 isolado: só nas bordas das letras da assinatura, 1.380 pixels com diferença de até 192/255 num canal em 390 px e 1.150 pixels com até 119/255 em 1440 px (81 e 5 pixels acima do limiar do Playwright); a olho, igual. |

Ficam valendo também I47 e I49 (rodada 2), entregues nesta rodada.

## Textos fixos

### Kicker do hero (I54)

`Diogo Menani · Advogado em {contact.city}`

### Consentimento do formulário (I55)

"Concordo com o uso dos meus dados apenas para o retorno deste contato, conforme a LGPD e o [aviso de privacidade](/privacidade)."

### Aviso de privacidade (I55)

Título: "Aviso de privacidade". Abertura: "Como o site de Diogo Menani trata os dados de quem entra em contato. Atualizado em 20 de outubro de 2026."

**Quem é o responsável.** Diogo Menani, advogado inscrito na {contact.oab}, é o responsável pelos dados pessoais que você envia. Para falar sobre eles, use o WhatsApp {whatsapp.display} ou o e-mail {contact.email.label}.

**O que o site coleta.** O site não usa cookies, não tem ferramentas de estatística ou de publicidade e não guarda o que você digita. O formulário de contato só monta a mensagem no seu próprio navegador e abre o WhatsApp com ela pronta: nada é enviado até você tocar em enviar dentro do WhatsApp. O provedor que hospeda o site pode registrar dados técnicos de cada acesso, como o endereço IP, por segurança e para o site funcionar.

**Para que os dados são usados.** O que você envia (nome, telefone, e-mail e o relato do caso) serve só para responder ao seu contato e, se você decidir contratar, para o seu atendimento. Os dados não são vendidos nem usados para outra finalidade e ficam protegidos pelo sigilo profissional do advogado.

**WhatsApp.** A conversa acontece no WhatsApp, um serviço da Meta. O que o próprio aplicativo faz com os dados segue a [política de privacidade do WhatsApp](https://www.whatsapp.com/legal/privacy-policy).

**Por quanto tempo.** Os dados ficam guardados pelo tempo necessário para responder ao contato e, se houver contratação, pelo prazo que as obrigações legais e profissionais do advogado exigem.

**Seus direitos.** Pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode pedir, entre outros direitos:

- a confirmação de que seus dados são tratados;
- o acesso a eles;
- a correção;
- a eliminação dos que não forem mais necessários;
- a revogação do consentimento.

Faça o pedido pelos contatos acima. Você também pode reclamar à [Autoridade Nacional de Proteção de Dados (ANPD)](https://www.gov.br/anpd).

O README avisa que o texto é um ponto de partida e deve ser revisado pelo Diogo antes da publicação.

### Página 404 (I56)

- Título: "Página não encontrada".
- Texto: "O endereço que você abriu não existe ou mudou de lugar. Volte ao início ou fale direto pelo WhatsApp."

## Checagem de lançamento

`npm run check:launch` gera o build e examina o `dist/`. Ela reprova, listando cada ocorrência com o arquivo, quando encontra:

- **Texto entre colchetes** (`[` + 1 a 80 caracteres sem `[]{}<>"` e com ao menos uma letra ou dígito + `]`) no texto e nos atributos do HTML. O conteúdo de `<script>` e `<style>` não conta, mas o JSON-LD é examinado valor por valor.
- O domínio de exemplo `seudominio`.
- O LinkedIn genérico, `https://linkedin.com/` sem perfil.
- A falta de `<link rel="canonical">` na home, ou seja, `site` ausente.

Quando não encontra nada, sai com código 0 e a mensagem "Pronto para publicar."

## Registrado, mas fora do escopo

- Breakpoints com `@custom-media` e entrelinhas em tokens (ver Não-objetivos).
- Ordem das seções (Áreas antes de Sobre): questão de opinião, a confirmar com o Diogo.
- Base legal do consentimento: o texto do aviso deve ser revisado pelo Diogo.
- Menu e o Voltar (I35 da rodada 2): o Voltar só fecha o menu quando há entrada de histórico na página (uma âncora visitada antes). Sem ela, o Voltar do Android sai da página com o menu aberto; o menu não cria entrada própria no histórico. Limitação conhecida.
