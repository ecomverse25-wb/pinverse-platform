"use server";

import { GoogleGenAI } from "@google/genai";
import type { ImageStyle, ImageDimensions } from "@/components/blog-monetizer/BlogMonetizer.types";
import { IMAGE_STYLE_SUFFIXES } from "@/components/blog-monetizer/BlogMonetizer.types";

// ─── Dimension → Replicate aspect ratio mapping ───

function getDimensionConfig(dimensions: ImageDimensions): { width: number; height: number; ratio: string } {
    switch (dimensions) {
        case '1024x1536': return { width: 1024, height: 1536, ratio: '2:3' };
        case '1536x864': return { width: 1536, height: 864, ratio: '16:9' };
        case '1024x1024': return { width: 1024, height: 1024, ratio: '1:1' };
        default: return { width: 1024, height: 1536, ratio: '2:3' };
    }
}

// ─── Generate Featured Image Prompt via Gemini ───

export async function generateFeaturedImagePromptAction(
    title: string,
    contentSummary: string,
    promptTemplate: string,
    apiKey: string,
    model: string = "gemini-2.5-flash"
): Promise<{ success?: boolean; prompt?: string; error?: string }> {
    if (!apiKey) return { error: "Gemini API key is missing." };

    const filledTemplate = promptTemplate
        .replace(/\{title\}/g, title)
        .replace(/\{content\}/g, contentSummary);

    const systemPrompt = `${filledTemplate}\n\nOutput ONLY an image generation prompt. No explanation. No headers. Just the prompt text. 2-3 sentences max.`;

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: systemPrompt }] }
        });

        const text = response.text?.trim();
        if (!text) return { error: "No prompt generated." };

        return { success: true, prompt: text };
    } catch (error: unknown) {
        console.error("Image prompt generation error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { error: msg };
    }
}

// ─── Build Final Image Prompt with Style Suffix ───

function buildFinalPrompt(basePrompt: string, style: ImageStyle, colorMood: string): string {
    let final = basePrompt;

    // Append style suffix
    const suffix = IMAGE_STYLE_SUFFIXES[style];
    if (suffix) {
        final += suffix;
    }

    // Append color mood
    if (colorMood.trim()) {
        final += `, color palette: ${colorMood.trim()}`;
    }

    // Always append global suffix
    final += ", no text, no watermarks, no people, high resolution, Pinterest-worthy, portrait orientation";

    return final;
}

// ─── Generate Image via Replicate ───

async function generateImageViaReplicate(
    prompt: string,
    replicateKey: string,
    aspectRatio: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
        // Try flux-1.1-pro first
        const models = [
            "black-forest-labs/flux-1.1-pro",
            "black-forest-labs/flux-dev",
            "stability-ai/sdxl",
        ];

        for (const modelEndpoint of models) {
            try {
                const response = await fetch("https://api.replicate.com/v1/predictions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Token ${replicateKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        version: modelEndpoint,
                        input: {
                            prompt,
                            aspect_ratio: aspectRatio,
                            num_outputs: 1,
                        },
                    }),
                });

                if (!response.ok) continue;

                const prediction = await response.json();
                const predictionId = prediction.id;

                // Poll for result
                let attempts = 0;
                const maxAttempts = 90;
                while (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const statusResponse = await fetch(
                        `https://api.replicate.com/v1/predictions/${predictionId}`,
                        { headers: { "Authorization": `Token ${replicateKey}` } }
                    );
                    const statusData = await statusResponse.json();

                    if (statusData.status === "succeeded") {
                        const imageUrl = Array.isArray(statusData.output)
                            ? statusData.output[0]
                            : statusData.output;
                        return { success: true, imageUrl };
                    }
                    if (statusData.status === "failed") break;
                    attempts++;
                }
            } catch {
                continue;
            }
        }

        return { success: false, error: "All image models failed." };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: msg };
    }
}

// ─── Upload to ImgBB ───

export async function uploadToImgBBAction(
    imageUrl: string,
    imgbbKey: string
): Promise<{ success?: boolean; url?: string; error?: string }> {
    if (!imgbbKey) return { error: "ImgBB API key is missing." };

    try {
        // Download image
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) return { error: "Failed to download image." };

        const blob = await imgResponse.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const base64 = buffer.toString("base64");

        // Upload to ImgBB
        const formData = new FormData();
        formData.append("key", imgbbKey);
        formData.append("image", base64);

        const uploadResponse = await fetch("https://api.imgbb.com/1/upload", {
            method: "POST",
            body: formData,
        });

        if (!uploadResponse.ok) {
            return { error: "ImgBB upload failed." };
        }

        const data = await uploadResponse.json();
        if (data.success && data.data?.url) {
            return { success: true, url: data.data.url };
        }
        return { error: "ImgBB response invalid." };
    } catch (error: unknown) {
        console.error("ImgBB upload error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { error: msg };
    }
}

// ─── Generate Featured Image (Full Flow) ───

export async function generateFeaturedImageAction(
    title: string,
    contentSummary: string,
    promptTemplate: string,
    style: ImageStyle,
    colorMood: string,
    dimensions: ImageDimensions,
    geminiKey: string,
    replicateKey: string,
    imgbbKey: string,
    geminiModel: string = "gemini-2.5-flash"
): Promise<{ success?: boolean; imageUrl?: string; prompt?: string; error?: string }> {
    // Phase 1: Get prompt from Gemini
    const promptResult = await generateFeaturedImagePromptAction(
        title, contentSummary, promptTemplate, geminiKey, geminiModel
    );
    if (!promptResult.success || !promptResult.prompt) {
        return { error: promptResult.error || "Failed to generate image prompt." };
    }

    // Phase 2: Build final prompt with style suffix
    const finalPrompt = buildFinalPrompt(promptResult.prompt, style, colorMood);

    // Phase 3: Generate image
    const dimConfig = getDimensionConfig(dimensions);
    const imgResult = await generateImageViaReplicate(finalPrompt, replicateKey, dimConfig.ratio);
    if (!imgResult.success || !imgResult.imageUrl) {
        return { error: imgResult.error || "Image generation failed." };
    }

    // Phase 4: Upload to ImgBB for permanent URL
    if (imgbbKey) {
        const uploadResult = await uploadToImgBBAction(imgResult.imageUrl, imgbbKey);
        if (uploadResult.success && uploadResult.url) {
            return { success: true, imageUrl: uploadResult.url, prompt: finalPrompt };
        }
    }

    // Return Replicate URL if ImgBB fails/unavailable
    return { success: true, imageUrl: imgResult.imageUrl, prompt: finalPrompt };
}

// ─── Generate H2 Section Image ───

export async function generateH2ImageAction(
    h2Topic: string,
    niche: string,
    replicateKey: string,
    imgbbKey: string
): Promise<{ success?: boolean; imageUrl?: string; error?: string }> {
    if (!replicateKey) return { error: "Replicate API key is missing." };

    const prompt = `High quality lifestyle photography, ${h2Topic}, ${niche} blog style, bright natural lighting, clean aesthetic, visually appealing, no text overlay, professional editorial photography, Pinterest-worthy composition, portrait orientation, no text, no watermarks, no people, high resolution`;

    const result = await generateImageViaReplicate(prompt, replicateKey, "2:3");
    if (!result.success || !result.imageUrl) {
        return { error: result.error || "Section image generation failed." };
    }

    // Upload to ImgBB
    if (imgbbKey) {
        const uploadResult = await uploadToImgBBAction(result.imageUrl, imgbbKey);
        if (uploadResult.success && uploadResult.url) {
            return { success: true, imageUrl: uploadResult.url };
        }
    }

    return { success: true, imageUrl: result.imageUrl };
}
