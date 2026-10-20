# Tipografia — especificação

Data: 2026-10-20. Pedido do usuário: analisar o site e "ver quais fontes ficam melhor para o tema de advocacia", sem rodada de perguntas. Continua a [rodada 1](2026-10-19-correcao-qualidade-design.md) e a [rodada 2](2026-10-19-correcao-rodada-2-design.md), cujas restrições e itens seguem valendo.

## Intenção

Os títulos precisam passar seriedade, tradição e confiança (o que se espera de um advogado) e continuar legíveis em todos os tamanhos em que aparecem: do título do hero (72 px) às perguntas do FAQ e ao registro da OAB (18–24 px), em azul sobre branco e em branco sobre o royal.

## Diagnóstico da fonte anterior

A Bodoni Moda é uma Didone de contraste extremo, a linguagem das revistas de moda. Medido em capturas 1:1 no Chromium do Windows, de 1440 e 390 px:

- nos títulos médios e pequenos os traços finos somem: o "e" vira "c" em "atendimento", o "A" itálico perde a barra em "Advogado", e o "4" de "04" nas etapas quase desaparece;
- o branco sobre o royal (manifesto, menu, hero) cintila nos traços finos;
- os algarismos padrão são de texto (o "0" da OAB parece "o");
- normal e itálica pesavam 100 KB.

## Decisão (tomada por Claude)

Títulos em **Baskervville** (a Baskerville revisada pelo ANRT, SIL OFL 1.1), normal e itálica, pesos 400–700, subconjunto latin servido pelo próprio site. O texto continua em Hanken Grotesk.

Por quê:

- a Baskerville é uma transicional, a família tipográfica da Bodoni. Continua conversando com a Didone do logo e do monograma, mas tem traços finos que resistem a 18 px;
- é a fonte clássica de documentos, livros jurídicos e instituições, e passa sobriedade sem parecer moda;
- os dois arquivos somam 65 KB, contra 100 KB da Bodoni Moda.

Candidatas comparadas com o site real (mesmas seções, 1440 e 390 px):

| Fonte              | Resultado                                                                         |
| ------------------ | --------------------------------------------------------------------------------- |
| Bodoni Moda        | a de antes; frágil nos tamanhos médios e pequenos                                 |
| Playfair Display   | legível e próxima do logo, mas pesada a 500 e muito vista em templates            |
| Libre Baskerville  | robusta demais: larga, o título do hero vai a 4 linhas no desktop                 |
| Cormorant Garamond | elegante, mas clara e de olho pequeno demais para 18–24 px                        |
| EB Garamond        | clássica, mas pequena para o corpo dos títulos atuais                             |
| Newsreader         | muito legível, mas o tom é de jornal                                              |
| Source Serif 4     | sólida e neutra, sem personalidade para a marca                                   |
| Libre Caslon Text  | boa segunda opção: clássica e firme, um pouco mais pesada e menos próxima do logo |
| **Baskervville**   | **escolhida**                                                                     |

## O que mudou no código

- `astro.config.mjs`: a família `Baskervville` (`--font-baskervville`) entra no lugar da Bodoni Moda, com fallbacks Baskerville (macOS/iOS), Baskerville Old Face (Windows com Office) e Georgia.
- `src/assets/fonts/`: `baskervville-normal-latin.woff2`, `baskervville-italic-latin.woff2` e `OFL-baskervville.txt` substituem os arquivos da Bodoni Moda.
- `tokens.css`: `--serif` aponta para a nova variável.
- `font-variation-settings: 'opsz'` sai de todos os títulos: a Baskervville não tem eixo óptico.
- `.page` passa a usar `font-variant-numeric: lining-nums`: algarismos de título em todo o site (na Hanken não muda nada). O `lining-nums` próprio do número das etapas sai, por redundância.
- Tamanhos, pesos, entrelinhas e espaçamentos ficam como estavam: as quebras de linha dos títulos são as mesmas em 390 e 1440 px.

## Mudança intencional

| ID  | Mudança                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I50 | Títulos, nome no header, menu, perguntas do FAQ, etapas e manifesto em Baskervville em vez de Bodoni Moda; algarismos de título em todo o site (OAB, etapas). Snapshots regenerados. |
