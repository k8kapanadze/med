import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as cheerio from "cheerio";

/**
 * GET /api/med-detail?url=https://www.aversi.ge/...
 *
 * Fetches a pharmacy product page through ScraperAPI (which handles
 * Cloudflare's JS challenge / CAPTCHA on our behalf) instead of hitting
 * the target site directly, then extracts the relevant fields with Cheerio.
 */

const SCRAPER_API_ENDPOINT = "https://api.scraperapi.com";

// Keeps Georgian (Mkhedruli) text intact while stripping stray whitespace/noise.
const GEORGIAN_TEXT_REGEX = /[^\u10A0-\u10FF\u0020-\u007E\u00A0-\u00FF0-9%.,/-]+/g;

function cleanText(raw: string): string {
  return raw
    .replace(GEORGIAN_TEXT_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface MedDetailResult {
  source: string;
  name: string | null;
  price: string | null;
  availability: string | null;
  rawTitle: string | null;
}

async function fetchViaScraperApi(targetUrl: string): Promise<string> {
  const apiKey = process.env.SCRAPER_API_KEY;

  if (!apiKey) {
    throw new Error("SCRAPER_API_KEY is not configured in environment variables.");
  }

  const proxyUrl = new URL(SCRAPER_API_ENDPOINT);
  proxyUrl.searchParams.set("api_key", apiKey);
  proxyUrl.searchParams.set("url", targetUrl);
  // render=true asks ScraperAPI to run a real headless browser, which is
  // usually required to clear Cloudflare's JS challenge.
  proxyUrl.searchParams.set("render", "true");
  proxyUrl.searchParams.set("country_code", "ge");

  const response = await fetch(proxyUrl.toString(), {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(
      `ScraperAPI request failed with status ${response.status}: ${response.statusText}`
    );
  }

  return response.text();
}

function parseMedPage(html: string, source: string): MedDetailResult {
  const $ = cheerio.load(html);

  const rawTitle = $("title").first().text() || null;

  // NOTE: these selectors are placeholders — inspect the real Aversi/PSP
  // product page DOM and swap in the actual class/id names before relying
  // on this in production.
  const name = cleanText(
    $("h1.product-title, .product-name, h1").first().text()
  ) || null;

  const price = cleanText(
    $(".price, .product-price, [data-price]").first().text()
  ) || null;

  const availabilityRaw = cleanText(
    $(".availability, .stock-status, .in-stock").first().text()
  );

  return {
    source,
    name,
    price,
    availability: availabilityRaw || null,
    rawTitle,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const targetUrl = req.query.url as string | undefined;

  if (!targetUrl) {
    return res.status(400).json({ error: "Missing required 'url' query parameter." });
  }

  let source: string;
  try {
    source = new URL(targetUrl).hostname;
  } catch {
    return res.status(400).json({ error: "The 'url' parameter is not a valid URL." });
  }

  try {
    const html = await fetchViaScraperApi(targetUrl);
    const result = parseMedPage(html, source);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("[med-detail] Scraping failed:", err);
    return res.status(500).json({
      error: "Scraping API failed or Cloudflare blocked the proxy.",
      detail: err?.message ?? String(err),
    });
  }
}
