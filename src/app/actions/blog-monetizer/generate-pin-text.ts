"use server";

import { GoogleGenAI } from "@google/genai";

interface PinTextInput {
    sectionHeading: string;
}

interface PinTextResult {
    pinIndex: number;
    title: string;
    description: string;
}

export async function generatePinTextsAction(
    pins: PinTextInput[],
    targetKeyword: string,
    annotatedInterests: string,
    geminiKey: string,
    geminiModel: string = "gemini-2.5-flash",
): Promise<{ success: boolean; results?: PinTextResult[]; error?: string }> {
    if (!geminiKey) return { success: false, error: "Gemini API key is missing." };

    const prompt = `Generate unique Pinterest pin titles and descriptions.
Target keyword: "${targetKeyword}"
Annotated interests: "${annotatedInterests}"

Generate for ${pins.length} pins. Each pin has a topic:
${pins.map((p, i) => `${i + 1}. ${p.sectionHeading}`).join("\n")}

TITLE RULES (max 100 characters):
- Include target keyword naturally
- Unique per pin — specific to the section topic
- Click-worthy and clear
- No hashtags
- No years (2024/2025/2026)

DESCRIPTION RULES (strict, max 400 characters):
1. LENGTH: 300-400 characters total. Count carefully.
2. NO HASHTAGS: Zero # symbols anywhere in the description.
3. NO MARKDOWN: No ** bold, no * italic, no formatting at all. Plain readable text only.
4. TARGET KEYWORD — use EXACTLY as written: "${targetKeyword}"
   - Include it ONCE maximum
   - Do NOT alter, pluralize, split, or rephrase it
   - Use it as-is in a natural sentence
5. ANNOTATED INTERESTS — use EXACTLY as written: "${annotatedInterests}"
   - Include 2-3 of the provided interest words/phrases
   - Use each EXACTLY as provided — do not alter them
   - Weave naturally into sentences, not listed together
6. STRUCTURE: 2-3 natural sentences.
   Sentence 1: Compelling hook about section topic.
   Sentence 2: Include keyword + 1-2 interests naturally.
   Sentence 3 (optional): Benefit or value statement.
7. NO FILLER: No "Click to learn more", "Save this pin", "Check out our website" or similar phrases.

Return JSON array ONLY — no explanation, no markdown:
[{"pinIndex":0,"title":"...","description":"..."}]`;

    try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: { parts: [{ text: prompt }] },
        });
        const responseText = response.text?.trim() || "";
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return { success: false, error: "No valid JSON in response." };

        const results: PinTextResult[] = JSON.parse(jsonMatch[0]);
        return { success: true, results };
    } catch (err) {
        console.error("[PinText] Generation error:", err);
        return { success: false, error: err instanceof Error ? err.message : "Pin text generation failed." };
    }
}
