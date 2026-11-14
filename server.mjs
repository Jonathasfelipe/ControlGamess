import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number.parseInt(process.env.PORT || '4173', 10);
const HOST = process.env.HOST || '127.0.0.1';
const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_NEWS_PER_SOURCE = 12;
const NFSU2_CHANGELOG_URL = 'https://nfsu2.xyz/changelog.json';
const NFSU2_CACHE_TTL_MS = 5 * 60 * 1000;

const SOURCES = [
  { name: 'PlayStation.Blog BR', url: 'https://blog.br.playstation.com/feed/' },
  { name: 'Xbox Wire em Português', url: 'https://news.xbox.com/pt-br/feed/' },
  { name: 'Steam News', url: 'https://store.steampowered.com/feeds/news.xml' }
];

let cachedNews = null;
let cacheExpiresAt = 0;
let cachedNfsu2Updates = null;
let nfsu2CacheExpiresAt = 0;

function decodeEntities(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      try { return String.fromCodePoint(Number.parseInt(code, 16)); } catch { return ''; }
    })
    .replace(/&#(\d+);/g, (_, code) => {
      try { return String.fromCodePoint(Number.parseInt(code, 10)); } catch { return ''; }
    })
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => ({
      amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '
    })[entity.toLowerCase()]);
}

function plainText(value, maxLength = 360) {
  return decodeEntities(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function tagValue(block, names) {
  for (const name of names) {
    const tag = name;
    const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}\\s*>`, 'i'));
    if (match) return match[1].trim();
  }
  return '';
}

function feedEntries(xml) {
  const itemMatches = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi)];
  if (itemMatches.length) return itemMatches.map(match => match[1]);
  return [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry\s*>/gi)].map(match => match[1]);
}

function itemLink(block, feedUrl) {
  const linkTags = [...block.matchAll(/<(?:[\w.-]+:)?link\b([^>]*)\/?\s*>/gi)];
  for (const match of linkTags) {
    const attributes = match[1];
    const href = attributes.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) {
      const rel = attributes.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!rel || rel === 'alternate') return new URL(decodeEntities(href), feedUrl).href;
    }
  }
  const rawLink = tagValue(block, ['link']);
  if (!rawLink) return '';
  try { return new URL(decodeEntities(rawLink), feedUrl).href; } catch { return ''; }
}

function itemImage(block, feedUrl) {
  const candidates = [];
  for (const match of block.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    candidates.push(match[1]);
  }
  for (const match of block.matchAll(/<(?:[\w.-]+:)?thumbnail\b([^>]*)\/?\s*>/gi)) {
    const url = match[1].match(/\burl\s*=\s*["']([^"']+)["']/i)?.[1];
    if (url) candidates.push(url);
  }
  for (const match of block.matchAll(/<(?:[\w.-]+:)?content\b([^>]*)\/?\s*>/gi)) {
    const attributes = match[1];
    const type = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1] || '';
    const medium = attributes.match(/\bmedium\s*=\s*["']([^"']+)["']/i)?.[1] || '';
    const url = attributes.match(/\burl\s*=\s*["']([^"']+)["']/i)?.[1];
    if (url && (medium.toLowerCase() === 'image' || type.toLowerCase().startsWith('image/'))) candidates.push(url);
  }
  for (const match of block.matchAll(/<enclosure\b([^>]*)\/?\s*>/gi)) {
    const attributes = match[1];
    const type = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1] || '';
    const url = attributes.match(/\burl\s*=\s*["']([^"']+)["']/i)?.[1];
    if (url && type.toLowerCase().startsWith('image/')) candidates.push(url);
  }

  for (const candidate of candidates) {
    try {
      const image = new URL(decodeEntities(candidate), feedUrl);
      if (image.protocol === 'https:') return image.href;
    } catch {}
  }
  return '';
}

function parseFeed(xml, source) {
  return feedEntries(xml).map(block => {
    const title = plainText(tagValue(block, ['title']), 220);
    const summary = plainText(tagValue(block, ['content:encoded', 'content', 'description', 'summary']), 360);
    const link = itemLink(block, source.url);
    const image = itemImage(block, source.url);
    const dateText = tagValue(block, ['pubDate', 'published', 'updated', 'dc:date']);
    const timestamp = Date.parse(plainText(dateText, 100));
    if (!title || !link || !Number.isFinite(timestamp)) return null;

    let safeLink;
    try {
      safeLink = new URL(link);
      if (safeLink.protocol !== 'https:') return null;
    } catch {
      return null;
    }

    return {
      title,
      summary,
      url: safeLink.href,
      source: source.name,
      publishedAt: new Date(timestamp).toISOString(),
      ...(image ? { image } : {})
    };
  }).filter(Boolean);
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
  return parseFeed(await response.text(), source).slice(0, MAX_NEWS_PER_SOURCE);
}

async function getNews() {
  if (cachedNews && Date.now() < cacheExpiresAt) return cachedNews;

  const [results, nfsu2] = await Promise.all([
    Promise.allSettled(SOURCES.map(fetchSource)),
    getNfsu2Updates().catch(error => {
      console.error('Não foi possível incluir as atualizações do NFSU2 no feed:', error.message);
      return null;
    })
  ]);
  const fulfilled = results.filter(result => result.status === 'fulfilled');
  const news = fulfilled.flatMap(result => result.value);
  const nfsu2Items = (nfsu2?.items || []).map(release => {
    const changes = Array.isArray(release.changes) ? release.changes : [];
    const fixes = Array.isArray(release.fixes) ? release.fixes : [];
    const first = changes[0] || fixes[0];
    if (!first) return null;
    const describe = entry => [entry.area, entry.text].filter(Boolean).join(': ');
    const details = [...changes.slice(0, 3), ...fixes.slice(0, 2)].map(describe);
    return {
      title: ('Need for Speed Underground 2: ' + describe(first)).slice(0, 180),
      summary: details.join(' · ').slice(0, 420),
      url: 'https://nfsu2.xyz/',
      source: 'NFSU2.xyz · changelog',
      game: 'nfsu2',
      publishedAt: new Date(release.date + 'T12:00:00.000Z').toISOString()
    };
  }).filter(Boolean);
  news.push(...nfsu2Items);

  if (!fulfilled.length && !nfsu2Items.length) {
    const reasons = results.map(result => result.reason?.message || 'falha desconhecida').join('; ');
    throw new Error(reasons || 'Fontes de notícias indisponíveis');
  }

  const unique = new Map();
  for (const item of news) {
    const key = item.url + '|' + item.title;
    if (!unique.has(key)) unique.set(key, item);
  }
  const sorted = [...unique.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  cachedNews = {
    updatedAt: new Date().toISOString(),
    sourcesAvailable: fulfilled.length + (nfsu2Items.length ? 1 : 0),
    items: sorted.slice(0, 36)
  };
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cachedNews;
}

function parseNfsu2Changelog(releases) {
  const items = [];
  for (const release of releases.slice(0, 16)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(release?.date || ''))) continue;
    const readEntries = list => (Array.isArray(list) ? list : []).map(entry => ({
      area: typeof entry?.[0] === 'string' ? entry[0].trim().slice(0, 60) : '',
      text: typeof entry?.[1] === 'string' ? entry[1].trim().slice(0, 420) : ''
    })).filter(entry => entry.text);
    const changes = readEntries(release.changes);
    const fixes = readEntries(release.fixes);
    if (changes.length || fixes.length) items.push({ date: release.date, changes, fixes });
  }
  return items;
}

async function getNfsu2Updates() {
  if (cachedNfsu2Updates && Date.now() < nfsu2CacheExpiresAt) return cachedNfsu2Updates;

  try {
    const response = await fetch(NFSU2_CHANGELOG_URL, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('nfsu2.xyz: HTTP ' + response.status);
    const body = await response.text();
    if (body.length > 2_000_000) throw new Error('Changelog acima do limite esperado');
    const releases = JSON.parse(body);
    if (!Array.isArray(releases)) throw new Error('Formato de changelog inesperado');
    const items = parseNfsu2Changelog(releases);
    if (!items.length) throw new Error('Changelog sem atualizações legíveis');

    cachedNfsu2Updates = { updatedAt: new Date().toISOString(), items };
    nfsu2CacheExpiresAt = Date.now() + NFSU2_CACHE_TTL_MS;
    return cachedNfsu2Updates;
  } catch (error) {
    if (cachedNfsu2Updates) return { ...cachedNfsu2Updates, stale: true };
    throw error;
  }
}

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.mp3', 'audio/mpeg'],
  ['.wav', 'audio/wav'],
  ['.ogg', 'audio/ogg'],
  ['.m4a', 'audio/mp4'],
  ['.aac', 'audio/aac'],
  ['.aif', 'audio/aiff'],
  ['.aiff', 'audio/aiff'],
  ['.flac', 'audio/flac'],
  ['.mov', 'video/quicktime'],
  ['.mp4', 'video/mp4']
]);

function sendJson(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://localhost');

  if (requestUrl.pathname === '/api/nfsu2-updates') {
    if (request.method !== 'GET') {
      response.writeHead(405, { allow: 'GET' });
      response.end('Method not allowed');
      return;
    }
    try {
      sendJson(response, 200, await getNfsu2Updates());
    } catch (error) {
      console.error('Não foi possível atualizar o changelog do NFSU2:', error.message);
      sendJson(response, 502, { error: 'O changelog do NFSU2 está indisponível no momento.' });
    }
    return;
  }

  if (requestUrl.pathname === '/api/news') {
    if (request.method !== 'GET') {
      response.writeHead(405, { allow: 'GET' });
      response.end('Method not allowed');
      return;
    }
    try {
      sendJson(response, 200, await getNews());
    } catch (error) {
      console.error('Não foi possível atualizar os feeds:', error.message);
      sendJson(response, 502, { error: 'Os feeds de notícias estão indisponíveis no momento.' });
    }
    return;
  }

  if (request.method !== 'GET') {
    response.writeHead(405, { allow: 'GET' });
    response.end('Method not allowed');
    return;
  }

  let pathname;
  try { pathname = decodeURIComponent(requestUrl.pathname); } catch {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const filePath = resolve(WEB_ROOT, `.${pathname}`);
  if (!filePath.startsWith(`${WEB_ROOT}${sep}`) || !contentTypes.has(extname(filePath).toLowerCase())) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      'content-type': contentTypes.get(extname(filePath).toLowerCase()),
      'cache-control': extname(filePath).toLowerCase() === '.html' ? 'no-cache' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff'
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Control Games disponível em http://${HOST}:${PORT}`);
});
