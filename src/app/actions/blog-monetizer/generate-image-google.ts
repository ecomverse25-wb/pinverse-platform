"use server";

import { GoogleGenAI } from "@google/genai";

export async function generateImageWithGoogleImagen({
    prompt,
    geminiApiKey,
    model = "imagen-3.0-generate-002",
    aspectRatio = "9:16",
    imgbbApiKey,
}: {
    prompt: string;
    geminiApiKey: string;
    model?: string;
    aspectRatio?: "1:1" | "9:16" | "16:9" | "4:3" | "3:4";
    imgbbApiKey?: string;
}): Promise<string | null> {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateImages({
        model,
        prompt,
        config: {
            numberOfImages: 1,
            aspectRatio,
        },
    });
    const imageBytes =
        response.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) return null;

    if (imgbbApiKey) {
        const formData = new FormData();
        formData.append("key", imgbbApiKey);
        formData.append("image", imageBytes);
        const res = await fetch(
            `https://api.imgbb.com/1/upload`,
            { method: "POST", body: formData }
        );
        const data = await res.json();
        return data.data?.url ?? null;
    }
    return `data:image/png;base64,${imageBytes}`;
}
