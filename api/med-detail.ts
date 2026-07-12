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

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use GET or POST." });
  }

  try {
    // Vercel can hand back a duplicated query param as an array (?query=a&query=b),
    // and some clients may POST a JSON body instead of using a query string — handle both.
    const rawQuery =
      req.query?.query ?? req.query?.name ?? req.body?.query ?? req.body?.name;
    const query = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "Query or name parameter is required." });
    }

    console.log(`[Gemini Med Detail] Querying for: ${query}`);

    const genAI = getGenAIClient();

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
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

    // If Gemini's safety filters blocked the prompt/response, there's no usable text —
    // surface that clearly instead of letting .text() throw an opaque error.
    const blockReason = result.response.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(`Gemini blocked the request (reason: ${blockReason}).`);
    }

    const responseText = result.response.text();

    if (!responseText || !responseText.trim()) {
      throw new Error("Empty response from Gemini.");
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      // Defensive fallback in case the model wraps the JSON in a code fence anyway
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      try {
        parsedJson = JSON.parse(cleaned);
      } catch {
        console.error("[Gemini Med Detail] Non-JSON response:", responseText.slice(0, 300));
        throw new Error("Gemini returned a non-JSON response.");
      }
    }

    return res.status(200).json(parsedJson);
  } catch (err: any) {
    console.error("[Gemini Med Detail] Error:", err);
    return res.status(500).json({
      error: err?.message || "სერვერის შეცდომა მონაცემების მიღებისას.",
    });
  }
}
