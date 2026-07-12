import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";

let genAIClient: GoogleGenerativeAI | null = null;
function getGenAIClient() {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY in the Secrets / Environment panel.");
    }
    genAIClient = new GoogleGenerativeAI(apiKey);
  }
  return genAIClient;
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

  // Gemini Med Detail Autocomplete Endpoint (mirrors /api/med-detail.ts used on Vercel)
  app.get("/api/med-detail", async (req, res) => {
    try {
      const query = req.query.query || req.query.name;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query or name parameter is required." });
      }

      console.log(`[Gemini Med Detail] Querying for: ${query}`);
      const genAI = getGenAIClient();

      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
        systemInstruction:
          "შენ ხარ გამოცდილი კლინიკური ფარმაკოლოგი (expert clinical pharmacologist). " +
          "მომხმარებელი მოგცემს მედიკამენტის სახელს. შენ უნდა უპასუხო მხოლოდ ვალიდური, " +
          "დამუშავებადი JSON ობიექტით — არანაირი დამატებითი ტექსტი, ახსნა, ან Markdown " +
          "ფორმატირება (არანაირი ```json ბლოკი). JSON ობიექტს უნდა ჰქონდეს ზუსტად ეს " +
          "სამი გასაღები: \"indications\" (ჩვენებები), \"sideEffects\" (გვერდითი მოვლენები), " +
          "\"mechanism\" (მოქმედების მექანიზმი). ყველა მნიშვნელობა დაწერე პროფესიულ, " +
          "კლინიკურ ქართულ ენაზე, მკაფიო და ზუსტი სამედიცინო ტერმინოლოგიით.",
      });

      const result = await model.generateContent(
        `მედიკამენტი: ${query.trim()}\n\nდააბრუნე ინფორმაცია ამ მედიკამენტის შესახებ ზემოთ აღწერილი JSON ფორმატით.`
      );

      const responseText = result.response.text();
      if (!responseText) {
        throw new Error("Empty response from Gemini.");
      }

      let parsedJson: any;
      try {
        parsedJson = JSON.parse(responseText);
      } catch {
        const cleaned = responseText.replace(/```json|```/g, "").trim();
        parsedJson = JSON.parse(cleaned);
      }

      return res.json(parsedJson);
    } catch (err: any) {
      console.error("[Gemini Med Detail] Error:", err);
      return res.status(500).json({
        error: err.message || "სერვერის შეცდომა მონაცემების მიღებისას."
      });
    }
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
