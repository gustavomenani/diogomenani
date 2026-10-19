# Correção de qualidade do site Diogo Menani — especificação

Data: 2026-10-19. Escopo aprovado pelo usuário na conversa ("pode arrumar"), sem rodada de perguntas.

## Intenção

Levar o código da landing page (Astro 7 + TypeScript, uma página, contato pelo WhatsApp) ao melhor nível de qualidade: organização, legibilidade, correção, acessibilidade, desempenho e segurança. O projeto também ganha ferramentas que mantêm esse nível daqui pra frente. O usuário não tem uma queixa específica: quer "a melhor qualidade de código".

## Objetivos

1. Código organizado: cada arquivo com uma responsabilidade; fonte única para dados, mensagens do WhatsApp e âncoras das seções; CSS legível ao lado de cada componente; JavaScript em módulos pequenos com a lógica pura testada.
2. Todos os defeitos encontrados na auditoria corrigidos (lista fechada em "Mudanças intencionais").
3. Garantias automáticas: Prettier, ESLint (TypeScript com checagem de tipos, Astro, acessibilidade), Stylelint, TypeScript `strictest`, html-validate, Vitest, Playwright com axe, `npm run verify` e CI.
4. Segurança e privacidade: nenhuma credencial dentro do projeto e nenhuma requisição a terceiros no carregamento da página.

## Não-objetivos

- Mudar design, textos ou comportamento além da lista de mudanças intencionais.
- Preencher os conteúdos `[entre colchetes]`, que dependem de informações do Diogo.
- Recursos novos: Open Graph, sitemap, analytics, CSP, dados estruturados.
- Trocar o Astro, adicionar framework de UI ou dependências de runtime.

## Antiobjetivos (contam como falha mesmo que "funcione")

- Diferença visual ou de comportamento que não esteja na lista abaixo.
- Testes acoplados a classes de estilo quando existe papel, rótulo ou atributo `data-*`.
- Abstrações sem uso real.

## Restrições

- Node `^22.22.3 || ^24.16.0 || >=26.3.0`: a faixa que o Astro 7.4, o eslint-plugin-astro, o Vitest e o html-validate aceitam juntos. Astro ^7.4.0, TypeScript ^5.9.3 (o typescript-eslint 8 suporta TypeScript < 6.1).
- Só entram `devDependencies`.
- Textos visíveis, URLs e mensagens do WhatsApp continuam idênticos, byte a byte, salvo item listado.
- Comentários e documentação em pt-BR; identificadores em inglês; os nomes atuais dos componentes ficam.
- A referência de equivalência é o build do código original (baseline).

## Decisões de arquitetura (tomadas por Claude)

- **CSS:** uma camada global (tokens em `:root`, base, botões e links, formulários, sistema de movimento) mais estilos escopados por componente, com `scopedStyleStrategy: 'where'`. O escopo não acrescenta especificidade, então a cascata continua igual à do CSS escrito. A raiz `.dm` vira `.page`, e os estados seguem o padrão `is-*` (o contêiner de um campo com erro leva `has-error`).
- **JavaScript:** `motion.ts` é dividido por recurso em `src/scripts/`. A lógica pura (física da balança, máscara de telefone, validação, cálculos de rolagem) fica em arquivos próprios, com testes unitários.
- **Dados:** `src/data/contact.ts`, `content.ts`, `navigation.ts`, `icons.ts` e `brand.ts`. As mensagens e os links do WhatsApp ficam em `src/lib/whatsapp.ts`; os atributos de link externo, em `src/lib/links.ts`.
- **Fontes:** woff2 do subconjunto latin (cobre todo o português) versionados em `src/assets/fonts/`, servidos pela API de fontes do Astro (provider local), com as licenças OFL junto. O latin-ext fica de fora: o provider local não distingue subconjuntos no preload, e a página não usa nenhum caractere dele.
- **Prova de equivalência:** uma ferramenta de apoio, fora do repositório, compara a baseline com a versão nova (estilos computados, geometria, DOM, estados de hover e foco, impressão e capturas de tela). Ela só aceita diferenças desta lista ou de refatoração sem efeito na tela (nomes de classe e ganchos `data-*`).

## Mudanças intencionais (as únicas diferenças permitidas)

| ID  | Mudança                                                                                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | O nome acessível do link da marca passa a ser o texto visível (sai o `aria-label` "…, voltar ao início").                                                                                                                                          |
| I2  | Menu mobile: o contêiner vira `<nav aria-label="Menu">` (o `nav` interno vira `div`) e é renderizado com `inert` (sai o `aria-hidden`). Com o menu aberto, o resto da página fica `inert`.                                                         |
| I3  | O botão do menu perde o `aria-label`: o nome é o texto visível ("Menu"/"Fechar"), e o estado vem do `aria-expanded`.                                                                                                                               |
| I4  | O header volta a aparecer quando o foco entra nele e não se recolhe enquanto houver foco visível (de teclado) lá dentro. O foco que um clique ou toque deixa num botão não o segura.                                                               |
| I5  | Link "Pular para o conteúdo", visível só com foco (a sombra também só aparece com ele), apontando para `<main id="conteudo">`.                                                                                                                     |
| I6  | O título principal perde o `aria-label`: o texto acessível vai num `span.sr-only`, e as linhas animadas continuam `aria-hidden`.                                                                                                                   |
| I7  | FAQ: o HTML sai com `aria-expanded="true"` em todos os itens (sem JavaScript, todos ficam visíveis), e o script sincroniza o estado ao iniciar.                                                                                                    |
| I8  | HTML válido: o placeholder do retrato usa `span` no lugar de `figcaption`, o telefone usa `autocomplete="tel"` e os painéis do FAQ usam `<section aria-labelledby>` no lugar de `div[role=region]` (mesma semântica de região).                    |
| I9  | Em telas baixas (`max-height: 560px`), o tamanho dos links do menu (30px, padding 4px) e o espaçamento do rodapé do menu (20px) passam a valer de fato. Antes, a ordem do CSS anulava essas regras.                                                |
| I10 | A máscara do telefone preserva a posição do cursor.                                                                                                                                                                                                |
| I11 | O erro do consentimento LGPD fica dentro de um contêiner próprio (`.check-field`, sem a classe `.field`): some o `style.display` aplicado por script, e o erro passa a ficar 6px abaixo do checkbox, como nos outros campos (antes ficava a 24px). |
| I12 | No seletor de tema, cliques rápidos não sobrepõem mais animações (o rótulo não pisca): cada troca cancela a anterior e o botão termina no último tema.                                                                                             |
| I13 | O handler de rolagem lê toda a geometria antes de escrever no DOM. Não há mudança visível.                                                                                                                                                         |
| I14 | Na impressão, as respostas do FAQ aparecem, inclusive as fechadas, sem esperar transição.                                                                                                                                                          |
| I15 | Fontes servidas pelo próprio site: nenhuma requisição ao Google, `preload` das fontes principais e fallback com métricas ajustadas. Depois do carregamento, a renderização é idêntica.                                                             |
| I16 | A coluna "Navegação" do rodapé vira um landmark `<nav>`.                                                                                                                                                                                           |
| I17 | O título `sr-only` do manifesto perde a classe `.h2`. Não há mudança visível.                                                                                                                                                                      |
| I18 | Foto do Diogo por convenção: se existir `src/assets/diogo.(jpg\|jpeg\|png\|webp)`, entra um `<Image>` otimizado; senão, o placeholder atual.                                                                                                       |
| I19 | `/logo-dm.svg` e `/themis.svg` (não usados pelo site) deixam de ser publicados e vão para `brand/`.                                                                                                                                                |
| I20 | Revertido na revisão final (sem mudança): os obrigatórios continuam com `aria-required`. Com `required`, a validação nativa os expõe como inválidos antes do envio (Chromium: a caixa de consentimento; Firefox: todos).                           |
| I21 | Sai CSS sem efeito: as fontes duplicadas no `h3` do FAQ e o `opsz` aplicado ao SVG `.footer-name`. Não há mudança visível.                                                                                                                         |
| I22 | O texto selecionado aparece em qualquer fundo: seleção branca sobre os fundos royal (seções, header transparente, menu e rodapé) e royal no cartão branco do formulário.                                                                           |
| I23 | No alto contraste do sistema (forced-colors), os campos do formulário ganham contorno ao receber foco: nesse modo a sombra do foco some.                                                                                                           |
| I24 | Passar o mouse sobre um campo com erro mantém a borda vermelha (o hover a trocava pela cinza).                                                                                                                                                     |
| I25 | Com movimento reduzido, o indicador da navegação troca de link sem deslizar e as mensagens de erro aparecem sem subir.                                                                                                                             |

## Registrado, mas fora do escopo

- Conteúdo revelável pisca ao recarregar a página no meio da rolagem, porque o script só decide o modo de movimento depois de carregar.
- `prefers-reduced-motion` só é lido no carregamento.
- O ano do rodapé é fixado no momento do build (esperado num site estático).
- `site`/canonical dependem do domínio, que ainda não existe.
- O formulário depende de JavaScript por design, porque é ele que monta a mensagem do WhatsApp.
- No seletor de tema, dois cliques com menos de 150 ms entre eles fazem o rótulo voltar à opacidade total antes de sair de novo (como na baseline).
- Os módulos do script iniciam em sequência, sem isolamento: uma exceção num deles interromperia os seguintes. Nenhum caminho conhecido lança erro hoje.
- No alto contraste do sistema, o chip escolhido do seletor de tema, os ícones +/− do FAQ e as barras do botão de menu perdem o desenho (como na baseline).
- Na máscara do telefone, um número de DDD 55 com um dígito a mais é lido como +55, e o Delete logo antes do hífen não avança (a baseline jogava o cursor para o fim).
