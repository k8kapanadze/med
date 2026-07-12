import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

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
