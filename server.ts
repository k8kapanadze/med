import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";

// Georgian section labels we look for on a medication detail page, and the
// short key we store the extracted text under. Order doesn't matter here —
// extractLabeledSection() scans against ALL_LABELS to know where a section
// ends regardless of which one starts first on the page.
// \w in JS only matches [A-Za-z0-9_], NOT Georgian letters — so a plain
// \w* after a Georgian stem matches zero characters and silently fails to
// absorb case/plural endings (e.g. "მოვლენ" + "ები"). Use the Mkhedruli
// Unicode block instead so suffix matching actually works.
const GEO = "[\\u10A0-\\u10FF]*";
const SECTION_LABELS: { key: "indications" | "sideEffects" | "mechanismOfAction" | "contraindications" | "composition" | "dosage"; pattern: RegExp }[] = [
  { key: "indications", pattern: new RegExp(`ჩვენებ${GEO}|ინდიკაც${GEO}`, "i") },
  { key: "sideEffects", pattern: new RegExp(`გვერდით${GEO}\\s*(?:მოვლენ${GEO}|ეფექტ${GEO})|არასასურველ${GEO}\\s*რეაქც${GEO}`, "i") },
  { key: "mechanismOfAction", pattern: new RegExp(`მოქმედების\\s*მექანიზმ${GEO}|ფარმაკოლოგიურ${GEO}\\s*თვისებ${GEO}|ფარმაკოდინამიკ${GEO}`, "i") },
  { key: "contraindications", pattern: new RegExp(`უკუჩვენებ${GEO}`, "i") },
  { key: "composition", pattern: new RegExp(`შემადგენლობ${GEO}`, "i") },
  { key: "dosage", pattern: new RegExp(`დოზირებ${GEO}|მიღების\\s*წესი`, "i") },
];
const ANY_LABEL = new RegExp(SECTION_LABELS.map(l => `(?:${l.pattern.source})`).join("|"), "i");

/**
 * Flattens a Cheerio-parsed page into one line of text per "leaf" element
 * (an element with no child elements). This gives us rough block-level line
 * breaks without depending on any particular CSS class or DOM structure,
 * which is what makes it survive markup changes on the pharmacy sites.
 */
function extractBlockLines($: cheerio.CheerioAPI): string[] {
  $("script, style, nav, header, footer, noscript").remove();
  const lines: string[] = [];
  $("body")
    .find("*")
    .each((_, el) => {
      const $el = $(el);
      if ($el.children().length === 0) {
        const text = $el.text().replace(/\s+/g, " ").trim();
        if (text) lines.push(text);
      }
    });
  return lines;
}

/**
 * For a given label pattern (e.g. "ჩვენებები"), find the line where it
 * appears and collect the text that follows — either the remainder of that
 * same line (if the label and content share a line, e.g. "ჩვენებები: ...")
 * or subsequent lines — stopping as soon as another known section label is
 * encountered, or after a reasonable number of lines/characters.
 */
function extractLabeledSection(lines: string[], labelPattern: RegExp): string {
  const labelRe = new RegExp(`(${labelPattern.source})\\s*[:։\\-]?\\s*`, "i");
  let collected: string[] = [];
  let capturing = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!capturing) {
      const match = line.match(labelRe);
      if (match) {
        capturing = true;
        const rest = line.slice((match.index || 0) + match[0].length).trim();
        if (rest) collected.push(rest);
        continue;
      }
    } else {
      // Stop if this line starts a different known section.
      if (ANY_LABEL.test(line) && line.length < 60) break;
      collected.push(line);
      if (collected.join(" ").length > 900 || collected.length > 12) break;
    }
  }

  return collected.join(" ").replace(/\s+/g, " ").trim().slice(0, 1000);
}

function extractMedicationSections(html: string) {
  const $ = cheerio.load(html);
  const lines = extractBlockLines($);
  const result: Record<string, string> = {};
  for (const { key, pattern } of SECTION_LABELS) {
    const text = extractLabeledSection(lines, pattern);
    if (text) result[key] = text;
  }
  return result;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json());

  // CORS headers
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  // Proxy for Aversi
  app.get("/api/aversi/*", async (req, res) => {
    try {
      const subPath = req.params[0] || "";
      const queryParams = new URLSearchParams(req.query as any).toString();
      const targetUrl = `https://www.aversi.ge/${subPath}${queryParams ? "?" + queryParams : ""}`;
      
      console.log(`[Proxy Aversi] Fetching: ${targetUrl}`);
      
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "ka-GE,ka;q=0.9,en-US;q=0.8,en;q=0.7",
          "Referer": "https://www.aversi.ge/",
        }
      });
      
      const text = await response.text();
      res.header("Content-Type", "text/html; charset=utf-8");
      return res.send(text);
    } catch (err: any) {
      console.error("Aversi Proxy error:", err);
      return res.status(500).send(`Aversi proxy error: ${err.message}`);
    }
  });

  // Proxy for PSP
  app.get("/api/psp/*", async (req, res) => {
    try {
      const subPath = req.params[0] || "";
      const queryParams = new URLSearchParams(req.query as any).toString();
      const targetUrl = `https://psp.ge/${subPath}${queryParams ? "?" + queryParams : ""}`;
      
      console.log(`[Proxy PSP] Fetching: ${targetUrl}`);
      
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "ka-GE,ka;q=0.9,en-US;q=0.8,en;q=0.7",
          "Referer": "https://psp.ge/",
        }
      });
      
      const text = await response.text();
      res.header("Content-Type", "text/html; charset=utf-8");
      return res.send(text);
    } catch (err: any) {
      console.error("PSP Proxy error:", err);
      return res.status(500).send(`PSP proxy error: ${err.message}`);
    }
  });

  // Fetches a single medication detail page and extracts the clinical
  // annotation sections (indications, side effects, mechanism of action,
  // etc.) so the frontend can auto-fill the form instead of relying on the
  // hardcoded lookup table. `source` picks which host to resolve a relative
  // path against; `url` may be a full URL or a path relative to that host.
  app.get("/api/med-detail", async (req, res) => {
    try {
      const source = (req.query.source as string) === "aversi" ? "aversi" : "psp";
      const rawUrl = (req.query.url as string) || "";
      if (!rawUrl) {
        return res.status(400).json({ error: "Missing 'url' query param" });
      }

      const base = source === "aversi" ? "https://www.aversi.ge" : "https://psp.ge";
      const targetUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `${base}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

      // Only ever follow links onto the pharmacy domain we were asked about,
      // so this endpoint can't be turned into an open proxy for arbitrary URLs.
      const targetHost = new URL(targetUrl).hostname;
      if (!targetHost.endsWith("aversi.ge") && !targetHost.endsWith("psp.ge")) {
        return res.status(400).json({ error: "URL must be on aversi.ge or psp.ge" });
      }

      console.log(`[Med Detail] Fetching: ${targetUrl}`);
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ka-GE,ka;q=0.9,en-US;q=0.8,en;q=0.7",
          "Referer": base + "/",
        }
      });

      if (!response.ok) {
        return res.status(502).json({ error: `Upstream returned ${response.status}` });
      }

      const html = await response.text();
      const sections = extractMedicationSections(html);
      return res.json({ url: targetUrl, source, ...sections });
    } catch (err: any) {
      console.error("Med detail extraction error:", err);
      return res.status(500).json({ error: err.message || "Extraction failed" });
    }
  });

  // Legacy sync-pharmacy endpoint mapped as a backward compatibility router
  app.get("/api/sync-pharmacy", async (req, res) => {
    return res.json({ message: "Deprecated. Use direct proxy endpoints instead." });
  });

  // Vite middleware for development or Static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Clinical Support Server running on http://localhost:${PORT}`);
  });
}

startServer();
