# Correção de qualidade, rodada 2 — especificação

Data: 2026-10-19. Pedido do usuário: "pode fazer outra correção insana", sem rodada de perguntas. Continua a [rodada 1](2026-10-19-correcao-qualidade-design.md), cujas restrições e itens I1–I25 seguem valendo.

## Intenção

Encontrar e corrigir o que a rodada 1 não viu: comportamento em Firefox e Safari, acessibilidade além do que o axe mede, desempenho de carregamento, robustez em situações incomuns e testes que passam pelo motivo errado. Seis auditorias independentes (lógica e testes, acessibilidade, navegadores, desempenho, robustez, ferramentas) mediram cada problema num navegador real; esta spec registra o que entra e como.

## Objetivos

1. Nenhum defeito conhecido nos três motores (Chromium, Firefox, WebKit) para os navegadores-alvo: Chrome, Edge e Firefox dos últimos ~2 anos e Safari/iOS 16.4+.
2. A página nunca pisca, nunca esconde conteúdo por falha de script e respeita a preferência de movimento a qualquer momento.
3. Acessibilidade além do AA onde o custo é baixo: foco sempre visível e nunca sob elementos fixos, alto contraste utilizável, movimento reduzido de verdade, contraste ≥ 3:1 nos estados.
4. Testes que falham quando o defeito volta: a suíte e2e roda nos três motores e cada item desta spec tem teste que falhou antes da correção.

## Não-objetivos

Os mesmos da rodada 1: recursos novos (Open Graph, sitemap, analytics, CSP, dados estruturados), preencher os `[colchetes]`, mudar textos, URLs ou o desenho. Também fica fora mudar a coreografia de entrada do hero (o parágrafo de abertura entra 0,7 s depois, por desenho; ver "Registrado, mas fora do escopo").

## Restrições

As da rodada 1. A referência de equivalência desta rodada é o build da `main` ao fim da rodada 1 (`599ec06`): toda diferença em relação a ele precisa estar na tabela abaixo.

## Decisões de arquitetura (tomadas por Claude)

- **Início da página:** um script inline mínimo, logo na abertura de `.page`, decide `data-motion` (`reduced` ou `on`) antes da primeira pintura, então nenhum motor pinta o estado `pending` e depois o desmonta. O módulo da página confirma ou corrige o modo (`static`) e grava `data-ready` ao terminar. Se o módulo não rodar (rede, erro), o mesmo script inline devolve `pending` no `load`: sem script, tudo aparece, como hoje.
- **Troca de modo:** sempre por uma função `setMode`, que aplica o modo novo com as transições desligadas por um quadro. Serve para `on` → `static`, para a preferência mudando com a página aberta e para a volta a `pending` em caso de falha.
- **Isolamento:** cada recurso inicia dentro de um `attempt()` que registra o erro (`reportError`) e devolve um valor neutro. Se a revelação ou o FAQ falharem (os dois têm estados escondidos no CSS), a página volta a `pending`.
- **Rolagem suave:** só depois da primeira interação (`pointerdown`/`keydown`), para a chegada por âncora e a restauração da rolagem serem instantâneas.
- **Estado ligado à rolagem:** recalculado também quando a altura da raiz muda (`ResizeObserver`); as etapas usam a posição de layout; o recolhimento do header acumula a distância na direção atual.
- **Foco:** um único ouvinte de `focusin` (foco visível) revela o bloco focado e o rola o mínimo para fora do header e do botão flutuante (`scroll-padding-top`/`-bottom`).
- **CSS de estados:** realces só de hover em `@media (hover: hover)`; regras de alto contraste em `@media (forced-colors: active)`; contorno transparente nas pílulas e chips para aparecerem no alto contraste.
- **Testes:** o projeto Playwright `e2e` vira três (`chromium`, `firefox`, `webkit`); testes que dependem de CDP ou do Tab do Chromium declaram o motor.

## Mudanças intencionais desta rodada

| ID  | Mudança                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I26 | O modo de movimento é decidido antes da primeira pintura: ao abrir ou recarregar, nada pisca em nenhum motor, e o FAQ, as etapas e as palavras nascem no estado certo, sem animar. Sem o módulo, volta tudo. |
| I27 | Abrir num endereço com âncora (ex.: `/#contato`) pousa direto na seção, sem desfilar a página; a rolagem suave vale a partir da primeira interação.                                                          |
| I28 | Um erro num recurso do script não derruba os demais; se a revelação ou o FAQ falharem, a página volta ao modo sem script (tudo visível).                                                                     |
| I29 | Ligar ou desligar "reduzir movimento" com a página aberta vale na hora, como se a página tivesse aberto assim.                                                                                               |
| I30 | Link ativo, barra de progresso, botão flutuante, etapas e palavras se atualizam quando a altura da página muda (ex.: uma resposta do FAQ abrindo), sem precisar rolar.                                       |
| I31 | As etapas acendem pela posição de layout, também durante a entrada animada da lista.                                                                                                                         |
| I32 | O header recolhe e volta pela distância percorrida (4 px acumulados), não pela velocidade de cada quadro; com movimento reduzido também recolhe, sem deslizar.                                               |
| I33 | Seletor de tema: uma troca no meio da animação continua do ponto em que está, sem o rótulo voltar à opacidade total nem o botão saltar de largura; um tema restaurado pelo navegador já aparece no botão.    |
| I34 | O foco do teclado revela na hora o bloco ainda escondido e rola o mínimo para o item não ficar sob o header nem sob o botão flutuante.                                                                       |
| I35 | Menu: Esc fecha de qualquer ponto; Voltar fecha; virar desktop leva o foco ao link do header; aberto, o header fica royal opaco; barra de rolagem do menu fina; o botão não pula com barras clássicas.       |
| I36 | Formulário: campos de texto com contorno de foco de 2 px (vermelho com erro); o foco fica no botão durante o envio; editar depois de enviar esconde o link de reserva; o primeiro erro fica centralizado.    |
| I37 | Telefone: zeros à esquerda do DDD saem; número com + e código de outro país fica como digitado; dígitos de largura total viram comuns; a máscara espera o fim da composição (IME).                           |
| I38 | Mensagem do WhatsApp: nome terminado em ponto não ganha ponto duplicado; um caractere inválido vira � em vez de travar o envio. Marcação incompleta não recarrega a página: mostra o link de reserva.        |
| I39 | Alto contraste (forced-colors): chip escolhido destacado; chips, pílulas e botão flutuante com contorno; ± do FAQ, barras do menu e indicador do link ativo visíveis.                                        |
| I40 | Movimento reduzido sem giro das barras do menu e do ±, sem escala do monograma, dos chips, do ✓ e dos botões, sem deslize das setas e dos preenchimentos e sem transição de altura do header.                |
| I41 | Contraste ≥ 3:1: palavras ainda não acesas do manifesto a 40% (eram 20%), números das etapas inativas mais escuros, contorno dos chips não marcados a 50% (era 34%).                                         |
| I42 | Realces de hover só em aparelhos com hover de verdade: no toque, o realce não gruda depois de tocar.                                                                                                         |
| I43 | Texto que não cabe quebra em vez de estourar: e-mail e links do rodapé quebram em qualquer ponto; botões quebram linha; o header cresce com o texto ampliado.                                                |
| I44 | Impressão: seções royal e rodapé saem com as cores (texto branco legível no papel); etapas impressas acesas.                                                                                                 |
| I45 | Sem JavaScript: o header rola com a página em vez de ficar fixo, e o botão Menu e o formulário (que dependem de script) não aparecem.                                                                        |
| I46 | Botão flutuante: anel de foco visível também sobre fundo royal; passa a ficar dentro do rodapé (landmark), sem mudar a posição na tela.                                                                      |
| I47 | Favicon também em PNG (32 px) e ícone da tela de início do iOS (180 px), além do SVG.                                                                                                                        |
| I48 | Listas de conteúdo (áreas, contato, rodapé) mantêm a semântica de lista no Safari (`role="list"`); os rádios do seletor ficam sobre o próprio chip.                                                          |
| I49 | O CSS vai embutido no HTML: a primeira pintura sai ~0,7 s antes em 4G lento; em conexão lenta, a troca para as fontes do site pode ser vista por instantes (fallbacks com métricas ajustadas).               |

Mudanças sem efeito na tela, registradas para o comparador: a balança para quando falta menos de 0,1 px de movimento; `will-change` permanente da figura do hero sai; o keyframe `unveil` vira `figure-unveil`; tons decorativos de uso único viram tokens; `sizes` do retrato corrigido; cabeçalhos de cache para `/_astro/*` em `public/_headers`.

## Registrado, mas fora do escopo

- O parágrafo de abertura do hero entra 0,7 s depois, com 1 s de fade, por desenho: é o elemento de LCP, e o LCP fica preso a essa animação.
- Fallbacks de fonte do Astro: a face itálica reaproveita as métricas da romana, os pesos 600/700 aparecem regulares durante a troca e o `local()` não existe no Android. Limitação da API de fontes.
- Copiar o título do hero dá o texto duas vezes (palavras animadas + texto para leitores de tela).
- O Chromium não expõe "obrigatório" em caixas de seleção (nem com `required` nativo); a mensagem de erro cobre o caso.
- O botão flutuante nunca é alcançado pelo Tab (é o último item e some perto do rodapé); a mesma ação existe em outros botões.
