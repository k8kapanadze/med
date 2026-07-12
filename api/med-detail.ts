import { GoogleGenerativeAI } from "@google/generative-ai";

let genAIClient: GoogleGenerativeAI | null = null;

function getGenAIClient(): GoogleGenerativeAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    genAIClient = new GoogleGenerativeAI(apiKey);
  }
  return genAIClient;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const rawQuery = req.query?.query ?? req.query?.name ?? req.body?.query ?? req.body?.name;
    const query = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "Query parameter is required." });
    }

    console.log(`[Gemini Med Detail] Querying for: ${query}`);

    const genAI = getGenAIClient();
    
    // მოდელის სახელი შეცვლილია სტანდარტულ ფორმატზე, რომელიც არ იწვევს 404 შეცდომას
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-002",
      systemInstruction:
        "შენ ხარ გამოცდილი კლინიკური ფარმაკოლოგი. დააბრუნე მხოლოდ ვალიდური JSON ობიექტი სამი გასაღებით: " +
        "\"indications\", \"sideEffects\", \"mechanism\". არ გამოიყენო Markdown ფორმატირება და არ დაწერო სხვა ტექსტი.",
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `მედიკამენტი: ${query.trim()}` }] }],
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.2 
      },
    });

    const responseText = result.response.text();
    if (!responseText) throw new Error("Empty response from Gemini.");

    // JSON-ის გაწმენდა და დაპარსვა
    const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedJson = JSON.parse(cleanedText);

    return res.status(200).json(parsedJson);
  } catch (err: any) {
    console.error("[Gemini Med Detail] Error:", err);
    return res.status(500).json({ error: err?.message || "სერვერის შეცდომა." });
  }
}
