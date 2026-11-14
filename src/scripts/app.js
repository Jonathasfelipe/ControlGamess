// Interações do portal: menu, filtros, pesquisa e notícias em atualização automática.
document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.getElementById('menu-toggle');
  const navigation = document.getElementById('site-nav');
  menuButton?.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
  });
  navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menu');
  }));

  const featuredGrid = document.getElementById('featured-news-grid');
  const newsGrid = featuredGrid || document.getElementById('news-grid');
  const buttons = [...document.querySelectorAll('.filter-chip')];
  const search = document.getElementById('news-search');
  const noResults = document.getElementById('no-results');
  const status = document.getElementById('news-status');
  const statusCopy = status?.querySelector('.news-status-copy');
  const refreshButton = document.getElementById('news-refresh');
  const nfsu2Grid = document.getElementById('nfsu2-updates');
  const nfsu2Empty = document.getElementById('nfsu2-empty');
  const nfsu2Status = document.getElementById('nfsu2-status');
  const nfsu2StatusCopy = nfsu2Status?.querySelector('.news-status-copy');
  const nfsu2RefreshButton = document.getElementById('nfsu2-refresh');
  const config = window.CONTROL_GAMES_NEWS || {
    endpoint: '/api/news',
    staticEndpoint: './news-feed.json',
    refreshIntervalMs: 5 * 60 * 1000,
    maxItems: 20,
    featuredMaxItems: 20,
    curatedItems: []
  };
  let currentFilter = 'todos';
  let isLoading = false;
  let isLoadingNfsu2 = false;
  let featuredCarousel = null;
  let latestCarousel = null;

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealSelector = '.intro-copy, .edition-note, .section-header, .news-live-bar, .filters, .nfsu2-hero, .nfsu2-subsection-head, .nfsu2-highlights-grid > *, .nfsu2-info-grid > *, .topics-inner, .games-grid > *, .about-inner';
  const revealObserver = !reduceMotion && 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      }, { threshold: 0.12, rootMargin: '0px 0px -28px 0px' })
    : null;

  function observeReveals(root = document) {
    const items = [...root.querySelectorAll(revealSelector)].filter(item => !item.classList.contains('scroll-reveal'));
    items.forEach((item, index) => {
      item.classList.add('scroll-reveal');
      item.style.setProperty('--reveal-delay', Math.min(index % 5, 4) * 55 + 'ms');
      if (!revealObserver) item.classList.add('is-visible');
      else revealObserver.observe(item);
    });
  }

  observeReveals();

  function gameFor(item) {
    const declared = String(item?.game || '').toLowerCase();
    if (declared === 'nfsu2' || declared === 'outbreak') return declared;
    const text = normalize([item?.title, item?.summary, item?.source].join(' '));
    if (/(need for speed|nfsu2|underground 2)/.test(text)) return 'nfsu2';
    if (/(resident evil outbreak|outbreak web|outbreakweb)/.test(text)) return 'outbreak';
    return 'general';
  }

  function updateStatus(message, state) {
    if (statusCopy) statusCopy.textContent = message;
    if (status) status.dataset.state = state || 'idle';
    refreshButton?.classList.toggle('is-loading', state === 'loading');
  }

  function updateCards() {
    const query = normalize(search?.value || '').trim();
    let visible = 0;
    for (const card of newsGrid?.querySelectorAll('.news-card') || []) {
      const categories = (card.dataset.category || '').split(' ');
      const categoryMatches = currentFilter === 'todos' || categories.includes(currentFilter);
      const searchMatches = !query || normalize(card.innerText + ' ' + (card.dataset.search || '')).includes(query);
      card.hidden = !(categoryMatches && searchMatches);
      if (!card.hidden) visible++;
    }
    if (noResults) noResults.hidden = visible > 0;
    featuredCarousel?.refresh(true);
  }

  function setupNewsCarousel(trackId, previousId, nextId, positionId) {
    const track = document.getElementById(trackId);
    const previous = document.getElementById(previousId);
    const next = document.getElementById(nextId);
    const position = document.getElementById(positionId);
    if (!track || !previous || !next || !position) return null;

    function cards() {
      return [...track.querySelectorAll('.news-card')].filter(card => !card.hidden);
    }

    function activeIndex(visibleCards) {
      if (!visibleCards.length) return -1;
      const center = track.getBoundingClientRect().left + track.clientWidth / 2;
      let closest = 0;
      let distance = Infinity;
      visibleCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const currentDistance = Math.abs(rect.left + rect.width / 2 - center);
        if (currentDistance < distance) {
          closest = index;
          distance = currentDistance;
        }
      });
      return closest;
    }

    function refresh() {
      const visibleCards = cards();
      const index = activeIndex(visibleCards);
      position.textContent = index < 0 ? '0 / 0' : (index + 1) + ' / ' + visibleCards.length;
      previous.disabled = index <= 0;
      next.disabled = index < 0 || index >= visibleCards.length - 1;
    }

    function move(direction) {
      const visibleCards = cards();
      if (!visibleCards.length) return;
      const index = activeIndex(visibleCards);
      const target = visibleCards[Math.max(0, Math.min(visibleCards.length - 1, index + direction))];
      const trackRect = track.getBoundingClientRect();
      const cardRect = target.getBoundingClientRect();
      const left = track.scrollLeft + cardRect.left - trackRect.left - (track.clientWidth - cardRect.width) / 2;
      track.scrollTo({ left, behavior: 'smooth' });
    }

    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        move(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });

    let frame = 0;
    track.addEventListener('scroll', () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        refresh();
      });
    }, { passive: true });
    window.addEventListener('resize', refresh, { passive: true });
    refresh();
    return {
      refresh(reset = false) {
        if (reset) track.scrollTo({ left: 0, behavior: 'auto' });
        requestAnimationFrame(refresh);
      }
    };
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.filter || 'todos';
      for (const option of buttons) {
        const active = option === button;
        option.classList.toggle('selected', active);
        option.setAttribute('aria-pressed', String(active));
      }
      updateCards();
    });
  }
  search?.addEventListener('input', updateCards);

  for (const link of document.querySelectorAll('[data-news-filter]')) {
    link.addEventListener('click', () => {
      currentFilter = link.dataset.newsFilter || 'todos';
      for (const option of buttons) {
        const active = option.dataset.filter === currentFilter;
        option.classList.toggle('selected', active);
        option.setAttribute('aria-pressed', String(active));
      }
      updateCards();
      const dropdown = link.closest('.nav-categories');
      if (dropdown) dropdown.open = false;
    });
  }

  function element(tagName, className, text) {
    const result = document.createElement(tagName);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }

  function categoriesFor(item) {
    const text = normalize((item.title || '') + ' ' + (item.summary || ''));
    const game = gameFor(item);
    const allowedCategories = new Set([
      'lancamentos', 'retro', 'classicos', 'remakes', 'remasters', 'demakes', 'antigos',
      'atualizacoes', 'luta', 'corrida', 'terror', 'sobrevivencia', 'multiplayer', 'singleplayer'
    ]);
    const declaredCategories = Array.isArray(item.categories) ? item.categories : [];
    const categories = declaredCategories.filter(category => allowedCategories.has(category));
    if (/(retro|remake|remaster|demake|classico|classic|8 bit|16 bit|pixel art|old school)/.test(text) || game === 'nfsu2' || game === 'outbreak') categories.push('retro');
    if (/(remake|reimagining|refeito)/.test(text)) categories.push('remakes');
    if (/(remaster|remasterizado|versao remasterizada)/.test(text)) categories.push('remasters');
    if (/(demake)/.test(text)) categories.push('demakes');
    if (/(classico|classic|classics)/.test(text) || game === 'nfsu2' || game === 'outbreak') categories.push('classicos');
    if (/(antigo|old school|old game|retro|classic|classico|arcade)/.test(text) || game === 'nfsu2' || game === 'outbreak') categories.push('antigos');
    if (game === 'nfsu2' || /(update|atualizacao|patch|dlc|expansao|temporada|season|modo novo|correcao|fix)/.test(text)) categories.push('atualizacoes');
    if (/(lancamento|lanca|launch|release|chega|disponivel|pre order|pre venda|anunciado|anuncia)/.test(text)) categories.push('lancamentos');
    if (/(fighting|fighter|jogo de luta|luta|versus)/.test(text)) categories.push('luta');
    if (/(racing|corrida|race car|rally|motorsport|street racer)/.test(text) || game === 'nfsu2') categories.push('corrida');
    if (/(horror|terror|survival horror)/.test(text) || game === 'outbreak') categories.push('terror');
    if (/(survival|survivor|sobrevivencia|sobreviver)/.test(text) || game === 'outbreak') categories.push('sobrevivencia');
    if (/(multiplayer|multi player|co-op|coop|online play|online multiplayer)/.test(text) || game === 'nfsu2' || game === 'outbreak') categories.push('multiplayer');
    if (/(single.player|single player|singleplayer|solo play|offline mode|campanha solo)/.test(text) || game === 'outbreak') categories.push('singleplayer');
    if (!categories.length) categories.push('lancamentos');
    return [...new Set(categories)];
  }

  function categoryLabel(categories) {
    if (categories.includes('retro')) return 'RETRO + REMAKES';
    if (categories.includes('atualizacoes')) return 'ATUALIZACOES';
    return 'LANCAMENTOS';
  }

  function formatDate(value) {
    if (!value) return 'PROJETO';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'RECENTE';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
      .format(date).replace('.', '').toUpperCase();
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  }

  function imageForItem(item) {
    const catalog = config.imageCatalog || {};
    const game = gameFor(item);
    if (game === 'nfsu2') return safeExternalUrl(catalog.nfsu2);
    if (game === 'outbreak') return safeExternalUrl(catalog.outbreak);

    const text = normalize([item?.title, item?.summary, item?.source].join(' '));
    const imageRules = [
      [/grand theft auto vi|gta vi/, 'gta'],
      [/sonic racing|crossworlds/, 'sonic'],
      [/tomb raider iv|tomb raider v|tomb raider vi/, 'tombRaider46'],
      [/tomb raider i|tomb raider ii|tomb raider iii/, 'tombRaider13'],
      [/silent hill 2/, 'silentHill2'],
      [/metal gear solid.*delta|snake eater/, 'metalGearDelta'],
      [/dead space/, 'deadSpace'],
      [/resident evil 4|re4/, 'residentEvil4'],
      [/street fighter 6/, 'streetFighter6'],
      [/doom/, 'doom']
    ];
    const match = imageRules.find(([pattern]) => pattern.test(text));
    return match ? safeExternalUrl(catalog[match[1]]) : '';
  }

  function createNewsCard(item) {
    const url = safeExternalUrl(item.url);
    if (!url || !item.title) return null;

    const game = gameFor(item);
    const categories = categoriesFor(item);
    const label = game === 'nfsu2'
      ? 'NFSU2 · ATUALIZAÇÕES'
      : game === 'outbreak'
        ? 'RESIDENT EVIL OUTBREAK'
        : categoryLabel(categories);
    const card = element('article', 'news-card live-news-card');
    card.dataset.game = game;
    card.dataset.category = categories.join(' ');
    card.dataset.search = [item.title, item.summary, item.source].join(' ');

    const image = element('a', 'news-image image-frame live-news-image');
    image.dataset.game = game;
    image.href = url;
    image.target = '_blank';
    image.rel = 'noopener noreferrer';
    image.setAttribute('aria-label', 'Abrir notícia: ' + item.title);
    const fallback = element('span', 'image-fallback text-only');
    fallback.setAttribute('aria-hidden', 'true');
    fallback.append(element('small', '', item.source || 'CONTROL GAMES'));
    fallback.append(element('span', '', label));
    image.append(fallback);
    const imageSource = safeExternalUrl(item.image) || imageForItem(item);
    if (imageSource) {
      fallback.hidden = true;
      const artwork = element('img', 'news-artwork');
      artwork.src = imageSource;
      artwork.alt = item.imageAlt || 'Arte oficial ou imagem de referência de ' + item.title;
      artwork.loading = 'lazy';
      artwork.decoding = 'async';
      if (item.imageFit === 'contain') artwork.style.objectFit = 'contain';
      artwork.addEventListener('error', () => {
        artwork.remove();
        fallback.hidden = false;
      }, { once: true });
      image.append(artwork);
    }

    const body = element('div', 'card-body');
    const meta = element('div', 'story-meta');
    meta.append(element('span', 'tag', label));
    const time = element('time', '', formatDate(item.publishedAt));
    if (item.publishedAt) time.dateTime = item.publishedAt;
    meta.append(time);

    const heading = element('h3');
    const titleLink = element('a', '', item.title);
    titleLink.href = url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    heading.append(titleLink);

    const summary = element('p', '', item.summary || 'Leia o comunicado completo na fonte original.');
    const source = element('span', 'card-source', 'Fonte: ' + (item.source || 'Fonte consultada'));
    body.append(meta, heading, summary, source);
    card.append(image, body);
    return card;
  }

  function mergeNewsItems(liveItems) {
    const curatedItems = Array.isArray(config.curatedItems) ? config.curatedItems : [];
    const merged = new Map();
    for (const item of [...curatedItems, ...(Array.isArray(liveItems) ? liveItems : [])]) {
        const key = safeExternalUrl(item?.url) || normalize(item?.title);
        if (!key) continue;
        const existing = merged.get(key);
        if (!existing) {
          merged.set(key, item);
          continue;
        }
        merged.set(key, {
          ...existing,
          ...item,
          image: item.image || existing.image,
          imageAlt: item.imageAlt || existing.imageAlt,
          imageFit: item.imageFit || existing.imageFit,
          categories: Array.isArray(item.categories) && item.categories.length ? item.categories : existing.categories,
          game: item.game || existing.game
        });
    }
    return [...merged.values()].sort((a, b) => {
        const dateA = new Date(a?.publishedAt || 0).getTime() || 0;
        const dateB = new Date(b?.publishedAt || 0).getTime() || 0;
        return dateB - dateA;
    });
  }

  function renderFeatured(items) {
    if (!featuredGrid) return;
    const maxItems = Math.max(10, Number(config.featuredMaxItems) || 20);
    const cards = items.slice(0, maxItems).map(createNewsCard).filter(Boolean);
    if (cards.length) {
      cards.forEach((card, index) => {
        card.classList.add('featured-news-card');
        card.style.setProperty('--card-order', index);
      });
      featuredGrid.replaceChildren(...cards);
      featuredCarousel?.refresh(true);
    }
  }

  function renderFeaturedFallback() {
    if (!featuredGrid || !newsGrid) return;
    const cards = [...newsGrid.querySelectorAll('.news-card')].slice(0, 3).map(source => {
      const card = source.cloneNode(true);
      card.removeAttribute('id');
      const game = gameFor({
        title: card.querySelector('h3')?.textContent,
        summary: card.querySelector('.card-body p')?.textContent,
        source: card.querySelector('.card-source')?.textContent
      });
      card.dataset.game = game;
      card.classList.add('featured-news-card');
      return card;
    });
    if (cards.length) {
      cards.forEach((card, index) => card.style.setProperty('--card-order', index));
      featuredGrid.replaceChildren(...cards);
      featuredCarousel?.refresh(true);
    }
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  function formatNfsu2Date(value) {
    const date = new Date(value + 'T12:00:00Z');
    if (Number.isNaN(date.getTime())) return 'DATA NÃO INFORMADA';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date).replace(/\./g, '').toUpperCase();
  }

  function updateNfsu2Status(message, state) {
    if (nfsu2StatusCopy) nfsu2StatusCopy.textContent = message;
    if (nfsu2Status) nfsu2Status.dataset.state = state || 'idle';
    nfsu2RefreshButton?.classList.toggle('is-loading', state === 'loading');
  }

  function createNfsu2UpdateCard(release) {
    if (!release || !release.date) return null;
    const changes = Array.isArray(release.changes) ? release.changes : [];
    const fixes = Array.isArray(release.fixes) ? release.fixes : [];
    if (!changes.length && !fixes.length) return null;

    const card = element('details', 'nfsu2-update-card');
    const summary = element('summary', 'nfsu2-update-summary');
    const meta = element('div', 'nfsu2-update-meta');
    meta.append(element('span', 'nfsu2-update-kind', 'RELEASE'));
    meta.append(element('time', '', formatNfsu2Date(release.date)));
    meta.append(element('span', 'nfsu2-update-count', String(changes.length + fixes.length) + ' notas'));
    summary.append(meta);
    card.append(summary);

    function appendGroup(title, entries) {
      if (!entries.length) return;
      card.append(element('h4', 'nfsu2-update-group-title', title));
      const list = element('ul', 'nfsu2-update-list');
      for (const entry of entries) {
        if (!entry || typeof entry.text !== 'string' || !entry.text.trim()) continue;
        const row = element('li');
        if (entry.area) {
          row.append(element('strong', '', entry.area));
          row.append(document.createTextNode(': '));
        }
        row.append(document.createTextNode(entry.text));
        list.append(row);
      }
      card.append(list);
    }
    appendGroup('Novidades', changes);
    appendGroup('Correções', fixes);

    const source = element('a', 'nfsu2-update-source', 'Abrir changelog completo ↗');
    source.href = 'https://github.com/th0mk/nfsu2-web/blob/main/CHANGELOG.md';
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    card.append(source);
    return card;
  }

  async function loadNfsu2Updates() {
    if (isLoadingNfsu2 || !nfsu2Grid) return;
    if (window.location.protocol === 'file:') {
      updateNfsu2Status('Resumo editorial disponível acima; o changelog automático depende do servidor local.', 'offline');
      return;
    }

    isLoadingNfsu2 = true;
    if (nfsu2RefreshButton) nfsu2RefreshButton.disabled = true;
    updateNfsu2Status('Buscando o changelog mais recente...', 'loading');

    try {
      const response = await fetch(config.nfsu2Endpoint || '/api/nfsu2-updates', { cache: 'no-store' });
      if (!response.ok) throw new Error('Changelog indisponível');
      const payload = await response.json();
      if (!Array.isArray(payload.items) || !payload.items.length) throw new Error('Changelog sem atualizações');
      const cards = payload.items
        .slice(0, Math.max(1, Number(config.nfsu2MaxItems) || 12))
        .map(createNfsu2UpdateCard)
        .filter(Boolean);
      if (!cards.length) throw new Error('Nenhuma atualização válida');

      nfsu2Grid.replaceChildren(...cards);
      if (nfsu2Empty) nfsu2Empty.hidden = true;
      const time = formatTime(payload.updatedAt);
      updateNfsu2Status(
        'Changelog do site · texto original em inglês' +
          (payload.stale ? ' · cópia em cache' : time ? ' · consulta às ' + time : ''),
        payload.stale ? 'offline' : 'live'
      );
    } catch {
      const hasLiveCards = Boolean(nfsu2Grid.querySelector('.nfsu2-update-card'));
      updateNfsu2Status(
        hasLiveCards
          ? 'O changelog não respondeu; mantendo a última cópia carregada.'
          : 'Changelog indisponível agora; os resumos em português acima continuam disponíveis.',
        'offline'
      );
    } finally {
      isLoadingNfsu2 = false;
      if (nfsu2RefreshButton) nfsu2RefreshButton.disabled = false;
    }
  }

  async function loadNews() {
    if (isLoading || !newsGrid) return;
    if (window.location.protocol === 'file:') {
      updateStatus('Arquivo editorial carregado. O feed ao vivo depende do servidor local.', 'offline');
      return;
    }

    isLoading = true;
    if (refreshButton) refreshButton.disabled = true;
    updateStatus('Buscando as notícias mais recentes...', 'loading');

    try {
      const endpoints = [...new Set([config.endpoint, config.staticEndpoint].filter(Boolean))];
      let payload = null;
      let feedEndpoint = '';
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { cache: 'no-store' });
          if (!response.ok) continue;
          const candidate = await response.json();
          if (!Array.isArray(candidate.items) || !candidate.items.length) continue;
          payload = candidate;
          feedEndpoint = endpoint;
          break;
        } catch {}
      }
      if (!payload) throw new Error('Feed ao vivo e cópia publicada indisponíveis');

      const items = mergeNewsItems(payload.items.slice(0, Math.max(1, Number(config.maxItems) || 20)));
      const cards = items.map(createNewsCard).filter(Boolean);
      if (!cards.length) throw new Error('Feed sem notícias válidas');

      cards.forEach((card, index) => card.style.setProperty('--card-order', index));
      if (newsGrid !== featuredGrid) newsGrid.replaceChildren(...cards);
      renderFeatured(items);
      updateCards();
      const sourceCount = Number(payload.sourcesAvailable) || 1;
      const time = formatTime(payload.updatedAt);
      const cadence = feedEndpoint === config.staticEndpoint
        ? 'feed publicado automaticamente pelo GitHub'
        : 'consulta automática a cada 5 min';
      updateStatus(sourceCount + ' fontes monitoradas · ' + cadence + (time ? ' · consulta às ' + time : ''), 'live');
    } catch {
      const hasLiveCards = Boolean(newsGrid.querySelector('.live-news-card'));
      updateStatus(
        hasLiveCards
          ? 'Feed ao vivo sem resposta; mantendo a seleção editorial e as notícias já carregadas.'
          : 'Feed ao vivo indisponível; a seleção editorial desta página continua disponível.',
        'offline'
      );
    } finally {
      isLoading = false;
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  function setupCarouselAutoplay(trackId, previousId, nextId) {
    const track = document.getElementById(trackId);
    const previous = document.getElementById(previousId);
    const next = document.getElementById(nextId);
    if (!track || !previous || !next) return;

    window.setInterval(() => {
      const visibleCards = [...track.querySelectorAll('.news-card')].filter(card => !card.hidden);
      if (document.hidden || visibleCards.length < 2) return;
      if (next.disabled) track.scrollTo({ left: 0, behavior: 'smooth' });
      else next.click();
    }, 6500);
  }

  featuredCarousel = setupNewsCarousel('featured-news-grid', 'featured-prev', 'featured-next', 'featured-position');
  setupCarouselAutoplay('featured-news-grid', 'featured-prev', 'featured-next');
  latestCarousel = setupNewsCarousel('news-grid', 'latest-prev', 'latest-next', 'latest-position');
  renderFeatured(mergeNewsItems([]));

  refreshButton?.addEventListener('click', () => {
    loadNews();
    loadNfsu2Updates();
  });
  nfsu2RefreshButton?.addEventListener('click', loadNfsu2Updates);
  loadNews();
  loadNfsu2Updates();
  window.setInterval(() => {
    loadNews();
    loadNfsu2Updates();
  }, Math.max(60 * 1000, Number(config.refreshIntervalMs) || 5 * 60 * 1000));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadNews();
      loadNfsu2Updates();
    }
  });
});
// Usa uma captura direta do Outbreakweb nos cartões sobre Resident Evil Outbreak.
(() => {
  const outbreakArtwork = 'https://cdn.mos.cms.futurecdn.net/snceJn5PGe8hubG74csFrE.jpg';
  const applyOutbreakArtwork = () => {
    document.querySelectorAll('.featured-news-card').forEach((card) => {
      if (!/resident evil outbreak|outbreakweb/i.test(card.textContent || '')) return;
      const image = card.querySelector('img.news-artwork');
      if (!image || image.src === outbreakArtwork) return;
      image.src = outbreakArtwork;
      image.alt = 'Captura de Resident Evil Outbreak rodando no Outbreakweb';
    });
  };
  const startOutbreakArtwork = () => {
    const target = document.getElementById('featured-news-grid');
    if (!target) return;
    const observer = new MutationObserver(() => {
      observer.disconnect();
      applyOutbreakArtwork();
      observer.observe(target, { childList: true, subtree: true });
    });
    applyOutbreakArtwork();
    observer.observe(target, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startOutbreakArtwork, { once: true });
  } else {
    startOutbreakArtwork();
  }
})();
