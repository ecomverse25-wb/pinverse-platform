"use server";

import { GoogleGenAI } from "@google/genai";

export async function generateImageWithGoogleImagen({
    prompt,
    geminiApiKey,
    model = "imagen-4.0-generate-preview",
    aspectRatio = "9:16",
    imgbbApiKey,
}: {
    prompt: string;
    geminiApiKey: string;
    model?: string;
    aspectRatio?: string;
    imgbbApiKey?: string;
}): Promise<string | null> {
    try {
        console.log("[Imagen] Starting generation with model:", model);
        console.log("[Imagen] Aspect ratio:", aspectRatio);
        console.log("[Imagen] Prompt length:", prompt.length);

        const isImagenModel = model.startsWith("imagen-");
        const isGeminiImageModel = model.startsWith("gemini-");
        let base64 = "";

        if (isImagenModel) {
            // Imagen API
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            const response = await ai.models.generateImages({
                model: model,
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: aspectRatio as "1:1" | "9:16" | "16:9" | "4:3" | "3:4",
                    safetyFilterLevel: "BLOCK_ONLY_HIGH" as any,
                    personGeneration: "DONT_ALLOW" as any,
                },
            });

            console.log("[Imagen] Response received:", !!response);
            const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
            if (!imageBytes) {
                console.error("[Imagen] No imageBytes in response:", JSON.stringify(response));
                return null;
            }
            base64 = typeof imageBytes === "string" ? imageBytes : Buffer.from(imageBytes).toString("base64");
        } else if (isGeminiImageModel) {
            // Gemini native image generation
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            const response = await ai.models.generateContent({
                model: model,
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: {
                    responseModalities: ["IMAGE", "TEXT"],
                    imageConfig: {
                        aspectRatio: aspectRatio,
                        numberOfImages: 1,
                    } as any,
                },
            });
            const parts = response.candidates?.[0]?.content?.parts ?? [];
            for (const part of parts) {
                if (part.inlineData?.mimeType?.startsWith("image/") && part.inlineData?.data) {
                    base64 = part.inlineData.data;
                    break;
                }
            }
            if (!base64) {
                console.error("[Imagen] No image data in Gemini content response.");
                return null;
            }
        }

        if (!base64) return null;

        // Upload to ImgBB if key provided
        if (imgbbApiKey) {
            try {
                const formData = new FormData();
                formData.append("image", base64);
                const res = await fetch(
                    `https://api.imgbb.com/1/upload?key=${imgbbApiKey}`,
                    { method: "POST", body: formData }
                );
                const data = await res.json();
                if (data.data?.url) return data.data.url;
            } catch (imgbbError) {
                console.error("[Imagen] ImgBB upload failed:", imgbbError);
                // Fall through to return data URL
            }
        }

        // Return as data URL if no ImgBB or ImgBB failed
        return `data:image/png;base64,${base64}`;
    } catch (error: unknown) {
        console.error("[Imagen] FULL ERROR:", error);
        console.error("[Imagen] Error message:", error instanceof Error ? error.message : String(error));
        console.error("[Imagen] Error stack:", error instanceof Error ? error.stack : "no stack");

        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(formatImagenError(msg));
    }
}

function formatImagenError(msg: string): string {
    const lower = msg.toLowerCase();
    if (lower.includes("permission_denied") || lower.includes("billing")) {
        return "⚠️ Google Imagen requires billing enabled on your Google account. Visit aistudio.google.com → Billing, or switch to Replicate.";
    }
    if (lower.includes("resource_exhausted") || lower.includes("quota")) {
        return "⚠️ Google Imagen quota exceeded. Try again later or switch to Replicate for image generation.";
    }
    if (lower.includes("api_key_invalid") || lower.includes("invalid api key")) {
        return "⚠️ Invalid Gemini API key. Please check your key in Setup.";
    }
    return msg; // Instead of "Image generation failed: ${msg}", let's return raw msg so user can see it
}
