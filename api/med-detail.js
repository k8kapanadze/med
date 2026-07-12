import * as cheerio from 'cheerio';

// Only keep Georgian (\u10A0-\u10FF), Latin letters, digits and basic
// punctuation. Pharmacy sites frequently serve mixed/garbled encodings for
// secondary fields (e.g. mojibake in generic-name cells) — this strips
// anything outside the expected character set instead of showing it raw.
const ALLOWED_TEXT = /[\u10A0-\u10FF\sA-Za-z0-9.,%()/\-+]+/g;

function cleanText(raw) {
  if (!raw) return '';
  const matches = raw.match(ALLOWED_TEXT);
  return matches ? matches.join(' ').replace(/\s+/g, ' ').trim() : '';
}

function parsePrice(raw) {
  if (!raw) return undefined;
  const digitsOnly = raw.replace(/[^\d.]/g, '');
  if (!digitsOnly) return undefined;
  const value = parseFloat(digitsOnly);
  return Number.isNaN(value) ? undefined : value;
}

const UPSTREAM_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ka-GE,ka;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function fetchHtml(url, referer) {
  const response = await fetch(url, {
    headers: { ...UPSTREAM_HEADERS, Referer: referer, Origin: referer },
  });
  if (!response.ok) {
    throw new Error(`Upstream request failed with status ${response.status}`);
  }
  return response.text();
}

function extractItems($, selectors, source) {
  const items = [];
  $(selectors.container).each((_, el) => {
    const node = $(el);

    const tradeName = cleanText(node.find(selectors.tradeName).first().text());
    if (!tradeName) return;

    const genericName = cleanText(node.find(selectors.generic).first().text());
    const price = parsePrice(node.find(selectors.price).first().text());
    const dosageForm =
      cleanText(node.find(selectors.form).first().text()) || 'Tablet';

    items.push({ tradeName, genericName, price, dosageForm, source });
  });
  return items;
}

const SOURCES = {
  aversi: {
    label: 'Aversi',
    buildUrl: (term) =>
      `https://www.aversi.ge/ka/medikamentebi?search=${encodeURIComponent(term)}`,
    referer: 'https://www.aversi.ge/',
    selectors: {
      container: '.product-layout, .product-thumb, .item, .product-item, .med-item',
      tradeName: '.name, .title, h4, h5, a.name, .product-name',
      generic: '.inn, .generic, .composition, .subtitle',
      price: '.price, .price-new, .med-price',
      form: '.form, .dosage, .type, .med-form',
    },
  },
  psp: {
    label: 'PSP',
    buildUrl: (term) => `https://psp.ge/ka/search?q=${encodeURIComponent(term)}`,
    referer: 'https://psp.ge/',
    selectors: {
      container: '.product-layout, .product-item, .item, .product-box, .product_box',
      tradeName: '.product-title, .title, .name, h3, h5, .product-name',
      generic: '.active_substance, .generic, .inn',
      price: '.price, .product-price, .item-price',
      form: '.form, .type, .product-form',
    },
  },
};

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.tradeName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed', items: [] });
    return;
  }

  const sourceKey = String(req.query.source || 'psp').toLowerCase();
  const term = String(req.query.q || '').trim();

  if (term.length < 2) {
    res.status(400).json({ error: 'Query must be at least 2 characters', items: [] });
    return;
  }

  const config = SOURCES[sourceKey];
  if (!config) {
    res.status(400).json({ error: `Unknown source: ${sourceKey}`, items: [] });
    return;
  }

  try {
    const html = await fetchHtml(config.buildUrl(term), config.referer);
    const $ = cheerio.load(html);
    const items = dedupe(extractItems($, config.selectors, config.label)).slice(0, 8);

    if (items.length === 0) {
      res.status(404).json({ error: 'Medication not found', items: [] });
      return;
    }

    res.status(200).json({ items, source: config.label });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Scrape failed', items: [] });
  }
}
