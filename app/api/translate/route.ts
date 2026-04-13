import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text, fromLang } = await req.json();

    if (!text || !fromLang) {
      return NextResponse.json({ error: "Missing text or fromLang" }, { status: 400 });
    }

    const langNames: Record<string, string> = {
      fr: "French", en: "English", es: "Spanish"
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Translate this ${langNames[fromLang]} text into the other 2 languages.
Return ONLY a valid JSON object with keys "fr", "en", "es". No markdown, no explanation, no extra text.
Keep the original language value exactly as provided.

Text: "${text}"

JSON:`
        }]
      })
    });

    const data = await response.json();

    if (!data.content?.[0]?.text) {
      return NextResponse.json({ error: "No response from Claude" }, { status: 500 });
    }

    const raw   = data.content[0].text;
    const clean = raw.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Translation failed" }, { status: 500 });
  }
}
