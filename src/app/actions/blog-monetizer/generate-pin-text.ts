// v3.2
"use server";

import { GoogleGenAI } from "@google/genai";

interface PinTextInput {
    sectionHeading: string;
}

interface PinTextResult {
    pinIndex: number;
    title: string;
    description: string;
    suggestedInterests: string;
}

/**
 * Generate pin texts for ALL pins in a single batch call (used as fallback).
 */
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
- Include target keyword naturally as a creative variation
- Unique per pin — specific to the section topic
- Click-worthy and clear
- No hashtags
- No years (2024/2025/2026)
- No ** markdown
- Must NOT be a copy of the section heading — be creative
- Maximum 1 emoji prefix allowed

DESCRIPTION RULES (strict, 150-300 characters):
1. LENGTH: 150-300 characters total. Count carefully.
2. NO HASHTAGS: Zero # symbols anywhere.
3. NO MARKDOWN: No ** bold, no * italic, no formatting. Plain text only.
4. NO YEARS: Never include 2024, 2025, 2026 or any year.
5. TARGET KEYWORD: Include "${targetKeyword}" ONCE naturally.
6. ANNOTATED INTERESTS: Include 2-3 of "${annotatedInterests}" naturally woven in.
7. STRUCTURE: 2-3 natural human-like sentences. No filler phrases.

Also suggest 3-5 comma-separated Pinterest interests related to each pin topic.

Return JSON array ONLY — no explanation, no markdown:
[{"pinIndex":0,"title":"...","description":"...","suggestedInterests":"interest1, interest2, interest3"}]`;

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

/**
 * Generate a SINGLE pin's title and description independently.
 * Used for per-pin independent generation with dedup awareness.
 */
export async function generateSinglePinTextAction(
    sectionHeading: string,
    targetKeyword: string,
    annotatedInterests: string,
    existingTitles: string[],
    geminiKey: string,
    geminiModel: string = "gemini-2.5-flash",
): Promise<{ success: boolean; title?: string; description?: string; suggestedInterests?: string; error?: string }> {
    if (!geminiKey) return { success: false, error: "Gemini API key is missing." };

    const existingTitlesBlock = existingTitles.length > 0
        ? `\nALREADY USED TITLES (you MUST NOT duplicate any of these):\n${existingTitles.map((t, i) => `${i + 1}. "${t}"`).join("\n")}\n`
        : "";

    const prompt = `Generate a UNIQUE Pinterest pin title and description for this topic.

Topic: "${sectionHeading}"
Target keyword: "${targetKeyword}"
Annotated interests: "${annotatedInterests}"
${existingTitlesBlock}
TITLE RULES (max 100 characters):
- Include target keyword naturally as a creative VARIATION — do not just copy it
- Must be UNIQUE and DIFFERENT from every title listed above
- Click-worthy, specific to the topic
- No hashtags, no years (2024/2025/2026), no ** markdown
- Maximum 1 emoji prefix allowed
- Must NOT be a copy of the article title

DESCRIPTION RULES (strict, 150-300 characters):
1. LENGTH: 150-300 characters total. Count carefully.
2. NO HASHTAGS: Zero # symbols anywhere.
3. NO MARKDOWN: No ** bold, no * italic. Plain text only.
4. NO YEARS: Never include any year numbers.
5. TARGET KEYWORD: Include "${targetKeyword}" ONCE naturally.
6. ANNOTATED INTERESTS: Naturally weave in 2-3 of: "${annotatedInterests}".
7. STYLE: Human-like, conversational, 2-3 natural sentences. No filler like "Click to learn" or "Save this pin".

Also suggest 3-5 comma-separated Pinterest interests.

Return JSON object ONLY — no explanation, no markdown:
{"title":"...","description":"...","suggestedInterests":"interest1, interest2, interest3"}`;

    try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: { parts: [{ text: prompt }] },
        });
        const responseText = response.text?.trim() || "";
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return { success: false, error: "No valid JSON in response." };

        const result = JSON.parse(jsonMatch[0]) as { title: string; description: string; suggestedInterests?: string };

        // Clean up
        let title = result.title.replace(/\*\*/g, "").replace(/#\w+/g, "").trim().slice(0, 100);
        let description = result.description.replace(/\*\*/g, "").replace(/#\w+/g, "").replace(/\*/g, "").trim();

        // Enforce 150-300 char range
        if (description.length > 400) {
            description = description.substring(0, 400);
            const lastSpace = description.lastIndexOf(" ");
            if (lastSpace > 370) description = description.substring(0, lastSpace);
            if (!description.endsWith(".") && !description.endsWith("!") && !description.endsWith("?")) {
                description += ".";
            }
        }

        // Remove years
        title = title.replace(/\b(202[0-9])\b/g, "").replace(/\s+/g, " ").trim();
        description = description.replace(/\b(202[0-9])\b/g, "").replace(/\s+/g, " ").trim();

        return {
            success: true,
            title,
            description,
            suggestedInterests: result.suggestedInterests || annotatedInterests,
        };
    } catch (err) {
        console.error("[PinText] Single generation error:", err);
        return { success: false, error: err instanceof Error ? err.message : "Pin text generation failed." };
    }
}
