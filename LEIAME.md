# Landing page — Diogo Menani (Astro)

## Rodar no computador

Precisa do Node.js 22 ou mais novo.

```bash
npm install       # instala as dependências (só na primeira vez)
npm run dev       # abre o site em http://localhost:4321 e recarrega ao editar
npm run build     # gera o site final na pasta dist/
npm run preview   # testa o build final
npm run check     # verifica erros de tipo nos componentes
```

## Onde editar

- `src/data/site.ts`: WhatsApp, e-mail, endereço, horário, OAB, redes sociais, áreas de atuação, temas do seletor, etapas, compromissos e dúvidas (FAQ). O que aparece em vários lugares da página vem daqui.
- `src/components/`: uma seção por arquivo (`Header`, `Hero`, `Sobre`, `Areas`, `Processo`, `Manifesto`, `Duvidas`, `Contato`, `Footer`, `WhatsAppFab`), mais `Icon` (ícones Tabler), `Monogram` e `Themis`.
- `src/scripts/motion.ts`: animações e interações (revelações na rolagem, física da balança, menu, FAQ e formulário).
- `src/styles/global.css`: cores, tipografia, layout e animações em CSS.
- `src/data/brand.ts`: vetores do logo e da Têmis. Não precisa mexer.
- `public/`: favicon e SVGs da marca.

## O que ainda falta preencher

Em `src/data/site.ts`: número da OAB e UF, cidade, e-mail, endereço, horário e LinkedIn; em `credentials`, formação, especialização e ano de início. As 6 áreas de atuação são sugestões para o Diogo confirmar.

Foto do Diogo: salve a foto (vertical, 4:5) em `public/diogo.jpg` e siga o comentário em `src/components/Sobre.astro`.

## Publicar

Na Vercel ou na Netlify, importe o projeto com o comando de build `npm run build` e a pasta de saída `dist`. Em qualquer outra hospedagem de site estático, basta enviar o conteúdo de `dist/`.

## Imagens originais

`1000162846.jpg` (logo) e `1000162853.jpg` (Têmis) são os arquivos enviados originalmente; a página usa as versões vetorizadas.

## Design

O canvas com o design continua em https://claude.ai/artifact/VVqWz3kdkCy5zTdU58ksYP, mas o código oficial do site agora é este projeto Astro.
