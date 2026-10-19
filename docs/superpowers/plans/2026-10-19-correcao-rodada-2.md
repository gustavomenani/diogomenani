# Correção de qualidade, rodada 2 — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** corrigir os ~70 achados das seis auditorias da rodada 2, cada um provado por um teste que falha antes, nos três motores.

**Architecture:** início da página com script inline que decide o modo antes da primeira pintura e um módulo que confirma o modo, isola os recursos e reage à preferência; estado de rolagem com `ResizeObserver` e posição de layout; um ouvinte de foco que revela e desvia de elementos fixos; CSS de estados por media query (hover, forced-colors, movimento reduzido, impressão); suíte e2e em Chromium, Firefox e WebKit.

**Tech Stack:** Astro 7.4, TypeScript strictest, Vitest 5, Playwright 1.64.1 (Chromium 156, Firefox 157, WebKit 27.2).

**Spec:** `docs/superpowers/specs/2026-10-19-correcao-rodada-2-design.md` (itens I26–I49). Relatórios das auditorias: pasta `scratchpad/audit/` da sessão.

## Global Constraints

- As da rodada 1 (pt-BR nos comentários e docs, identificadores em inglês, só devDependencies, textos/URLs/mensagens idênticos salvo item da spec, testes sem acoplamento a classes de estilo quando há papel, rótulo ou `data-*`).
- Navegadores-alvo: Chrome, Edge e Firefox dos últimos ~2 anos; Safari/iOS 16.4+.
- Toda diferença em relação ao build da `main` (`599ec06`) tem um ID I26–I49 ou é refatoração sem efeito na tela.
- `npm run verify` verde nos três motores ao fim de cada task.

## Review Focus

1. Módulo da página que não carrega (rede) ou lança no meio: o conteúdo tem de aparecer e o que não depende do recurso quebrado tem de funcionar.
2. Recarregar no meio da página e abrir por âncora em Firefox e WebKit: nada pisca, nada anima sozinho, a seção pousa abaixo do header.
3. Preferência de movimento trocada com a página aberta, nos dois sentidos.
4. Foco de teclado entrando em blocos ainda não revelados e em itens perto do header e do botão flutuante (Firefox rola menos).
5. Toques no celular (hover que gruda) e alto contraste (estado perdido).

---

### Task 1: Suíte nos três motores e testes que passavam pelo motivo errado

**Files:** `playwright.config.ts`, `package.json`, `.github/workflows/ci.yml`, `tests/e2e/*.spec.ts`, `README.md`.

- [ ] Projetos `chromium`, `firefox` e `webkit` para `e2e/**`; `visual` só no Chromium, com `ignoreSnapshots` fora do Windows. Testes com CDP declaram `test.skip(browserName !== 'chromium', …)`; os de Tab até link pulam no WebKit (padrão do Safari).
- [ ] Testes reforçados, cada um conferido contra o defeito injetado que a auditoria usou: sem JS, nenhum `[data-reveal]` com opacidade 0; impressão do FAQ com opacidade 1 em cada resposta; seleção numa seção `.is-royal`; hover com erro só depois das animações; balança com `page.clock`; axe em um teste por tamanho.
- [ ] `verify` com um build só (`… && npm run validate:html && playwright test`); `lint:js` com `astro sync` antes; `lint:css` com `--max-warnings 0`.
- [ ] CI: instala os três motores, artefatos com `!cancelled()` e `if-no-files-found: ignore`, versões atuais das actions.
- [ ] Commit `test: suíte nos três motores e testes que pegam o defeito de verdade`.

### Task 2: Início da página, isolamento e preferência de movimento (I26, I27, I28, I29)

**Files:** `src/layouts/Base.astro`, `src/scripts/{main,motion-mode,reveal,balance,scroll-effects,scroll-math}.ts`, `src/styles/{base,motion}.css`, testes.

**Interfaces:** `setMode(root, mode)`; `initReveal(root, getMode) → { revealAll(): void }`; `initBalance(...) → { swing(), settle() } | null`; `initScrollEffects(...) → { refresh(), reset() }`; `attempt(name, init, fallback)`.

- [ ] RED: módulo abortado (`route('**/_astro/*.js', abort)`) → depois do `load`, `data-motion="pending"` e nenhum revelável escondido.
- [ ] RED: revelação que lança → conteúdo visível, FAQ abre, header ganha fundo, envio chama `window.open`, `pageerror` registrado.
- [ ] RED (Firefox/WebKit): nenhuma animação em `.faq-panel` logo após `DOMContentLoaded`; recarregar com `#atuacao` na tela → nenhum revelável na tela vai de visível a escondido (amostragem por quadro).
- [ ] RED: `goto('/#contato')` → topo da seção a 84 ± 2 px no `load`.
- [ ] RED: `emulateMedia({ reducedMotion })` depois de carregar → `data-motion` muda, balança nivelada na hora, parallax zerado, nenhuma transição de revelação; e de volta.
- [ ] GREEN: script inline com a decisão do modo e a volta a `pending` no `load`; `attempt`; `setMode` com transições desligadas por um quadro; revelação imediata do que está na tela na inicialização; rolagem suave só depois da primeira interação; ouvinte da preferência e de `pageshow`.
- [ ] Commit `fix: a página decide o modo antes de pintar, isola os recursos e segue a preferência de movimento`.

### Task 3: Estado ligado à rolagem (I30, I31, I32)

- [ ] RED unitário: recolher com 3 px duas vezes; voltar com −3 px duas vezes; +3/−3 alternado não muda; com movimento reduzido também recolhe; `static` nunca.
- [ ] RED e2e: abrir a última pergunta sem rolar → "Dúvidas" ativo, barra = `y/max`, botão flutuante visível no celular; etapas certas durante a entrada animada da lista.
- [ ] GREEN: `ResizeObserver` na raiz; posição de layout das etapas; distância acumulada no `nextTuck`; transição de transform do header desligada no modo reduzido.
- [ ] Commit `fix: estado da rolagem segue a altura da página, o layout das etapas e a distância percorrida`.

### Task 4: Foco que revela e desvia dos fixos (I34)

- [ ] RED (Firefox e Chromium): Tab até um bloco no pé da tela → opacidade 1 em ≤ 1 quadro de transição; Shift+Tab até um cartão perto do topo → nenhuma sobreposição com o header; foco no celular nunca sob o botão flutuante.
- [ ] GREEN: `focusin` com `:focus-visible` revela o `[data-reveal]` mais próximo e chama `scrollIntoView({ block: 'nearest' })`; `scroll-padding-bottom` abaixo de 1080 px.
- [ ] Commit `fix(a11y): foco revela o bloco e não fica sob o header nem sob o botão flutuante`.

### Task 5: Seletor de tema (I33, rádios do I48)

- [ ] RED: segundo clique a +60 ms (saída) e a +250 ms (entrada) → nenhum quadro com opacidade subindo e texto antigo; nenhum salto de largura maior que um passo normal; tema marcado antes do script (simula restauração) → botão com o tema e o link dele, sem animação nem balanço.
- [ ] RED: cada rádio fica sobre o próprio chip (retângulo dentro do do chip).
- [ ] GREEN: troca que continua do estado computado; largura medida antes de cancelar; sincronização inicial; rádio dentro de um invólucro posicionado.
- [ ] Commit `fix: seletor de tema troca sem saltos, respeita o tema restaurado e posiciona cada rádio no chip`.

### Task 6: Menu (I35)

- [ ] RED: Esc com o foco no `body` (WebKit, antes de 380 ms) e no fundo do menu fecha; `history.back()` com o menu aberto fecha; virar desktop leva o foco ao link equivalente; aberto, o header tem fundo royal; menu rolado não cruza a marca; com barra clássica o botão não muda de `x`; `.menu:focus-visible` com contorno.
- [ ] GREEN: `keydown` no `document` enquanto aberto; `hashchange`/`popstate`; foco no link de `[data-nav]`; CSS do header e do menu; compensação da largura da barra.
- [ ] Commit `fix: menu fecha de qualquer ponto, segue o histórico e não pula nem cruza a marca`.

### Task 7: Formulário, telefone e mensagem (I36, I37, I38)

- [ ] RED unitários: `formatPhone` com 6 dígitos; cursor com 2 dígitos; e-mail com espaço no meio, sem ponto no domínio, sem usuário, com espaço no fim (aceito); zero de DDD; `+351`; dígitos de largura total; nome com ponto final; caractere inválido vira �.
- [ ] RED e2e: marcação incompleta não navega e mostra o link; editar depois de enviar esconde o link e limpa o aviso; foco fica no botão durante o intervalo; IME não embaralha o número; contorno de foco nos campos; primeiro erro centralizado no WebKit.
- [ ] GREEN nos módulos de máscara, validação, mensagem e formulário.
- [ ] Commit `fix: formulário, máscara do telefone e mensagem robustos a entradas incomuns`.

### Task 8: CSS de estados, impressão, sem JS e semântica (I39–I46, listas do I48)

- [ ] RED com emulação (`forcedColors`, `reducedMotion`, `media: 'print'`, contexto de toque, JS desligado) e medições de estilo computado e contraste.
- [ ] GREEN: regras por media query, `overflow-wrap`, botões que quebram, `min-height` do header, `print-color-adjust`, `<noscript>` com o header estático, botão flutuante dentro do rodapé com anel de foco, `role="list"`; e os ajustes sem efeito (`will-change`, `figure-unveil`, tokens).
- [ ] Commit `fix(a11y): alto contraste, movimento reduzido, toque, impressão e página sem JS`.

### Task 9: Entrega e desempenho (I47, I49)

- [ ] RED: nenhum `<link rel="stylesheet">` no HTML; favicons PNG servidos e ligados; `_headers` no `dist`; balança assenta antes (limiar de 0,1 px); `sizes` do retrato.
- [ ] GREEN: `build.inlineStylesheets: 'always'`, PNGs gerados a partir do SVG, `public/_headers`, limiares de assentamento, `sizes`.
- [ ] Commit `perf: CSS embutido, cache longo dos assets, favicons PNG e balança que para antes`.

### Task 10: Mutantes que sobreviviam, tipos e documentação

- [ ] Testes unitários para os mutantes sobreviventes da auditoria (limiares de rolagem, assentamento, pratos, máscara); e2e para opacidade do CTA após a troca, barra de progresso, indicador, etapas, palavras, botão flutuante no rodapé, reenvio duplo e `noopener`.
- [ ] `querySelector<T>` com conversão trocado por `instanceof` onde o tipo importa.
- [ ] README (comandos, `npx playwright test` precisa de build, três motores) e nota de registro histórico no topo dos planos.
- [ ] Commit `test: mata os mutantes que sobreviviam e atualiza a documentação`.

### Task 11: Varredura final linha por linha

- [ ] Revisores novos em paralelo (lógica; marcação e CSS; configs, testes e docs), com a spec e os rulings.
- [ ] Achados verificados e corrigidos com teste que falha antes.
- [ ] Comparador `599ec06` → HEAD: toda diferença com ID I26–I49 ou refatoração.
- [ ] `npm run verify` (três motores) e `npm run test:visual` verdes; snapshots regenerados só onde a spec manda.
- [ ] Merge fast-forward em `main`, só local.
