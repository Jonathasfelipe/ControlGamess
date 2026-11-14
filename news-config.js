// Configuração das notícias ao vivo do Control Games.
// O endpoint é servido pelo server.mjs; os tempos estão em milissegundos.
window.CONTROL_GAMES_NEWS = Object.freeze({
  endpoint: '/api/news',
  staticEndpoint: './news-feed.json',
  refreshIntervalMs: 5 * 60 * 1000,
  maxItems: 20,
  featuredMaxItems: 40,
  curatedItems: [
    {
      url: 'https://www.rockstargames.com/newswire/article/89834o94713o21/pre-load-grand-theft-auto-vi-now',
      title: 'GTA VI libera o pré-download antes da chegada a Leonida',
      summary: 'A Rockstar confirmou o pré-download digital para PS5 e Xbox Series X|S a partir de 10 de novembro; o lançamento está marcado para 19 de novembro de 2026.',
      source: 'Rockstar Games',
      publishedAt: '2026-11-10',
      image: 'https://www.rockstargames.com/VI/_next/static/media/Jason_Lucia_Rooftop_With_Logos_landscape.04l3xybfa4~6m.jpg?akim=1&imdensity=1&imwidth=1200',
      imageAlt: 'Arte oficial de GTA VI com Jason e Lucia',
      categories: ['lancamentos']
    },
    {
      url: 'https://slayersclub.bethesda.net/en-US/news/doom-doomii-release-notes',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2280/header.jpg',
      title: 'DOOM + DOOM II reúne os clássicos em uma edição aprimorada',
      summary: 'A edição combinada atualiza os FPS de 1993 e 1994, inclui um episódio inédito, mods da comunidade e cooperação e combate online com jogo cruzado.',
      source: 'Bethesda / id Software',
      publishedAt: '2024-08-08',
      categories: ['retro', 'classicos', 'antigos', 'multiplayer', 'singleplayer']
    },
    {
      url: 'https://www.tombraider.com/news/video-games/aspyr-and-crystal-dynamics-reveal-tomb-raider-i-iii-remastered',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2478970/header.jpg',
      title: 'Tomb Raider I–III Remastered traz de volta a trilogia clássica',
      summary: 'A coleção inclui os três jogos originais e suas expansões, melhorias visuais e a opção de alternar entre gráficos e controles clássicos e modernos.',
      source: 'Tomb Raider / Crystal Dynamics',
      publishedAt: '2023-09-14',
      categories: ['retro', 'classicos', 'antigos', 'remasters', 'singleplayer', 'lancamentos']
    },
    {
      url: 'https://blog.playstation.com/2024/10/11/tomb-raider-iv-vi-remastered-launches-feb-14-2025/',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2525380/header.jpg',
      title: 'Tomb Raider IV–VI Remastered completa a coleção clássica de Lara Croft',
      summary: 'A segunda coleção remasteriza The Last Revelation, Chronicles e The Angel of Darkness, com opções gráficas e controles clássicos ou modernos.',
      source: 'Aspyr / PlayStation.Blog',
      publishedAt: '2024-10-11',
      categories: ['retro', 'classicos', 'antigos', 'remasters', 'singleplayer', 'lancamentos']
    },
    {
      url: 'https://www.konami.com/games/us/en/topics/2440/',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2124490/header.jpg',
      title: 'Silent Hill 2 retorna em um remake do clássico de terror psicológico',
      summary: 'A Konami refez o jogo de 2001 para PlayStation 5 e PC, preservando a jornada de James Sunderland enquanto atualiza sua apresentação para a geração atual.',
      source: 'Konami',
      publishedAt: '2024-05-29',
      categories: ['retro', 'classicos', 'antigos', 'remakes', 'terror', 'sobrevivencia', 'singleplayer', 'lancamentos']
    },
    {
      url: 'https://www.konami.com/games/eu/en/topics/18800/',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2417610/header.jpg',
      title: 'Metal Gear Solid Delta: Snake Eater refaz a aventura de 2004',
      summary: 'O remake de Snake Eater mantém a história e a estrutura do original, com gráficos e áudio atualizados e opções de controle clássico ou moderno.',
      source: 'Konami',
      publishedAt: '2025-08-28',
      categories: ['retro', 'classicos', 'antigos', 'remakes', 'sobrevivencia', 'singleplayer', 'lancamentos']
    },
    {
      url: 'https://www.ea.com/games/dead-space/dead-space?setLocale=en-us',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1693980/header.jpg',
      title: 'Dead Space reconstrói o terror de sobrevivência a bordo da USG Ishimura',
      summary: 'O remake amplia a apresentação visual e sonora da aventura de Isaac Clarke, mantendo a luta pela sobrevivência no cargueiro tomado por criaturas.',
      source: 'Electronic Arts',
      publishedAt: '2023-01-27',
      categories: ['retro', 'classicos', 'antigos', 'remakes', 'terror', 'sobrevivencia', 'singleplayer', 'lancamentos']
    },
    {
      url: 'https://game.capcom.com/residentevil/en/news-2198.html',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2050650/header.jpg',
      title: 'Resident Evil 4 volta em uma nova versão do clássico de sobrevivência',
      summary: 'A Capcom anunciou o retorno do jogo de 2005 como uma nova aventura de horror e sobrevivência para plataformas modernas.',
      source: 'Capcom / Resident Evil Portal',
      publishedAt: '2022-06-03',
      categories: ['retro', 'classicos', 'antigos', 'remakes', 'terror', 'sobrevivencia', 'singleplayer', 'lancamentos']
    },
    {
      url: 'https://news.capcomusa.com/2023/04/20/street-fighter-6-showcase-recap/',
      image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1364780/header.jpg',
      title: 'Street Fighter 6 combina luta, campanha solo e encontros online',
      summary: 'World Tour oferece uma jornada para um jogador com avatar próprio; no Battle Hub, os avatares encontram outros jogadores e participam de batalhas online.',
      source: 'Capcom',
      publishedAt: '2023-04-20',
      categories: ['luta', 'multiplayer', 'singleplayer', 'lancamentos']
    },
    {
      url: 'https://nfsu2.xyz/',
      image: 'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ut7hcwupmq1t28ns7m7t.jpg',
      imageAlt: 'Captura de gameplay de Need for Speed Underground 2',
      title: 'Need for Speed Underground 2 ganha uma versão jogável no navegador',
      summary: 'O projeto de fãs recompila o jogo de PC para WebAssembly e usa WebGPU no navegador; a página também destaca recursos como carreira, free roam e corridas online.',
      source: 'nfsu2.xyz · projeto de fãs',
      publishedAt: '2026-11-09',
      game: 'nfsu2',
      categories: ['retro', 'classicos', 'antigos', 'corrida', 'multiplayer', 'singleplayer', 'atualizacoes']
    },
    {
      url: 'https://outbreakweb.com/',
      image: 'https://www.mobygames.com/images/promo/l/51517-resident-evil-outbreak-file-2-wallpaper.jpg',
      imageAlt: 'Arte promocional de Resident Evil Outbreak File 2, publicado pela Capcom',
      title: 'Resident Evil Outbreak File 1 e File 2 podem ser jogados no navegador',
      summary: 'O projeto de preservação permite iniciar os dois jogos sem instalação, solo ou online, com controles de teclado, gamepad e tela sensível ao toque.',
      source: 'Outbreak·Web · projeto de preservação',
      game: 'outbreak',
      categories: ['retro', 'classicos', 'antigos', 'terror', 'sobrevivencia', 'multiplayer', 'singleplayer']
    },
    {
      url: 'https://blog.playstation.com/2026/11/03/sonic-racing-crossworlds-year-two-begins-today-with-duel-mode-new-characters-gadgets-and-more/',
      image: 'https://blog.playstation.com/tachyon/2026/11/d64c152c35c72a8ada76e69f37d3e19546321f3c.jpg?crop_strategy=smart&resize=1088%2C612',
      imageAlt: 'Arte oficial do segundo ano de Sonic Racing CrossWorlds',
      title: 'Sonic Racing: CrossWorlds inicia o segundo ano com modo Duelo',
      summary: 'A atualização de temporada adiciona um modo de confronto e amplia a seleção de personagens, veículos e dispositivos do jogo de corrida.',
      source: 'SEGA / PlayStation.Blog',
      publishedAt: '2026-11-03',
      categories: ['corrida', 'multiplayer', 'atualizacoes']
    }
  ],
  imageCatalog: {
    gta: 'https://www.rockstargames.com/VI/_next/static/media/Jason_Lucia_Rooftop_With_Logos_landscape.04l3xybfa4~6m.jpg?akim=1&imdensity=1&imwidth=1200',
    doom: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2280/header.jpg',
    tombRaider13: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2478970/header.jpg',
    tombRaider46: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2525380/header.jpg',
    silentHill2: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2124490/header.jpg',
    metalGearDelta: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2417610/header.jpg',
    deadSpace: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1693980/header.jpg',
    residentEvil4: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2050650/header.jpg',
    streetFighter6: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1364780/header.jpg',
    nfsu2: 'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ut7hcwupmq1t28ns7m7t.jpg',
    outbreak: 'https://www.mobygames.com/images/promo/l/51517-resident-evil-outbreak-file-2-wallpaper.jpg',
    sonic: 'https://blog.playstation.com/tachyon/2026/11/d64c152c35c72a8ada76e69f37d3e19546321f3c.jpg?crop_strategy=smart&resize=1088%2C612'
  },
  nfsu2Endpoint: '/api/nfsu2-updates',
  nfsu2MaxItems: 16
});
