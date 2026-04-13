import { NextRequest, NextResponse } from "next/server";

const LANG_NAMES: Record<string, string> = {
  fr: "French", en: "English", es: "Spanish"
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromLang } = body;

    if (!fromLang) {
      return NextResponse.json({ error: "Missing fromLang" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY manquante dans .env.local");
      return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    // ── Mode 1 : texte simple ──────────────────
    if (body.text) {
      const result = await translateText(body.text, fromLang);
      return NextResponse.json(result);
    }

    // ── Mode 2 : plusieurs champs en 1 appel ──
    if (body.fields) {
      const fields = body.fields as Record<string, string>;
      const fieldEntries = Object.entries(fields).filter(([, v]) => v.trim());

      if (!fieldEntries.length) {
        return NextResponse.json({ error: "No fields to translate" }, { status: 400 });
      }

      const fieldList = fieldEntries.map(([k, v]) => `"${k}": "${v}"`).join("\n");

      const prompt = `Translate these ${LANG_NAMES[fromLang]} texts into French, English, and Spanish.
Return ONLY a valid JSON object where each key maps to an object with "fr", "en", "es".
Keep the original language value exactly as provided. No markdown, no extra text.

Fields:
${fieldList}

JSON:`;

      const response = await callClaude(prompt);

      console.log("Claude response:", JSON.stringify(response).slice(0, 300));

      if (response.error) {
        console.error("Claude API error:", response.error);
        return NextResponse.json({ error: response.error.message || "Claude error" }, { status: 500 });
      }

      const raw = response.content?.[0]?.text || "{}";
      const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error("No JSON in response:", clean);
        return NextResponse.json({ error: "No JSON in response" }, { status: 500 });
      }

      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Missing text or fields" }, { status: 400 });

  } catch (err: any) {
    console.error("Translation error:", err);
    return NextResponse.json({ error: err.message || "Translation failed" }, { status: 500 });
  }
}

async function translateText(text: string, fromLang: string) {
  const prompt = `Translate this ${LANG_NAMES[fromLang]} text into French, English, and Spanish.
Return ONLY a valid JSON object with keys "fr", "en", "es". No markdown, no explanation.
Keep the original language value exactly as provided.

Text: "${text}"

JSON:`;

  const response = await callClaude(prompt);

  if (response.error) throw new Error(response.error.message || "Claude error");

  const raw   = response.content?.[0]?.text || "{}";
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");
  return JSON.parse(jsonMatch[0]);
}

async function callClaude(prompt: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Claude HTTP error:", res.status, errText);
    throw new Error(`Claude HTTP ${res.status}`);
  }

  return await res.json();
}
