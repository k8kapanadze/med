import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazily instantiate so a missing key throws a clean, catchable error
// instead of crashing at module load time.
let genAIClient: GoogleGenerativeAI | null = null;
function getGenAIClient(): GoogleGenerativeAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Add it in Vercel > Project > Settings > Environment Variables."
      );
    }
    genAIClient = new GoogleGenerativeAI(apiKey);
  }
  return genAIClient;
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  try {
    const query = (req.query?.query || req.query?.name) as string | undefined;

    if (!query || typeof query !== "string" || !query.trim()) {
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
      // Defensive fallback in case the model wraps the JSON in a code fence
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      parsedJson = JSON.parse(cleaned);
    }

    return res.status(200).json(parsedJson);
  } catch (err: any) {
    console.error("[Gemini Med Detail] Error:", err);
    return res.status(500).json({
      error: err?.message || "სერვერის შეცდომა მონაცემების მიღებისას.",
    });
  }
}
