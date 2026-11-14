# Control Games — código editável

Portal de notícias e projetos independentes. O jogo Perdidos no Espaço está unificado em uma página: o menu preto animado aparece primeiro; **Iniciar Jogo** inicia a partida na mesma tela; `P` (ou `Escape`) abre o menu de pausa e retorno.

## Executar localmente

1. Instale Node.js 18 ou mais recente.
2. Abra um terminal nesta pasta e execute `node server.mjs`.
3. Acesse <http://localhost:4173>.
4. Para abrir diretamente o jogo, acesse <http://localhost:4173/games/space-invaders/index.html>.

O portal usa o servidor local para notícias ao vivo. O GitHub Pages publica apenas arquivos estáticos e não executa `server.mjs`; hospede o servidor Node separadamente para manter a API dinâmica. O workflow em `.github/workflows/update-news.yml` publica o feed estático em `news-feed.json` a cada 15 minutos quando há novidades.

## Estrutura

- `index.html`: entrada do portal.
- `src/scripts/app.js`: filtros, pesquisa e atualização das notícias.
- `src/styles/`: estilos do portal e do jogo.
- `games/space-invaders/index.html`: página única de menu e gameplay.
- `src/scripts/space-invaders/`: animação do menu, lógica do jogo e ajuste do canvas.
- `assets/images/`: artes e sprites organizados por uso.
- `tools/`: geradores de recursos visuais (Python + Pillow).
- `archive/experiments/`: scripts antigos não usados pelo jogo.

## Onde editar

- Portal: `index.html`, `src/scripts/app.js` e `src/styles/`.
- Menu e fluxo da partida: `games/space-invaders/index.html` e `src/scripts/space-invaders/menu.js`.
- Regras e estados: `src/scripts/space-invaders/game.js`.
- Naves: `assets/images/space-invaders/ships/`.
- Fundos: `assets/images/space-invaders/backgrounds/`.
- Efeitos e planetas: `assets/Space Invaders/imagens/effects/`.

Não há dependências npm. O servidor atende em `127.0.0.1`; em hospedagem, configure `HOST=0.0.0.0` e a variável `PORT` do serviço.
