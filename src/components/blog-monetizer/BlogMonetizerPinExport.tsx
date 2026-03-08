"use client";

import { useState, useCallback, useEffect } from "react";
import type { BlogArticle, PinData } from "./BlogMonetizer.types";
import { generatePinTextsAction } from "@/app/actions/blog-monetizer/generate-pin-text";

// ─── Types ───

type PinStyle = "collage" | "text-top" | "text-middle" | "text-bottom";

interface PinSettings {
    targetKeyword: string;
    annotatedInterests: string;
    pinStyle: PinStyle;
}

interface BlogMonetizerPinExportProps {
    articles: BlogArticle[];
    wpBaseUrl: string;
    geminiKey: string;
    geminiModel?: string;
}

// ─── Validation ───

function validatePinDescription(description: string, maxChars: number = 400): string {
    let cleaned = description;
    cleaned = cleaned.replace(/#\w+/g, "").trim();
    cleaned = cleaned.replace(/\*\*/g, "").trim();
    cleaned = cleaned.replace(/\*/g, "").trim();
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    cleaned = cleaned.replace(/[,\s]+$/, "").trim();
    if (cleaned.length > maxChars) {
        cleaned = cleaned.substring(0, maxChars);
        const lastSpace = cleaned.lastIndexOf(" ");
        if (lastSpace > maxChars - 30) {
            cleaned = cleaned.substring(0, lastSpace);
        }
        if (!cleaned.endsWith(".") && !cleaned.endsWith("!") && !cleaned.endsWith("?")) {
            cleaned = cleaned + ".";
        }
    }
    return cleaned;
}

// ─── Canvas Helpers ───

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + " " + words[i];
        if (ctx.measureText(testLine).width <= maxWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = words[i];
            if (lines.length >= 2) {
                if (i < words.length - 1) {
                    const l = lines[1] || currentLine;
                    lines[1] = l.length > 3 ? l.substring(0, l.length - 3) + "..." : l;
                }
                break;
            }
        }
    }
    if (lines.length < 2) lines.push(currentLine);
    return lines.slice(0, 2);
}

async function loadImageForCanvas(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => {
            const img2 = new Image();
            img2.onload = () => resolve(img2);
            img2.onerror = reject;
            img2.src = url;
        };
        img.src = url;
    });
}

function drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dx: number, dy: number,
    dw: number, dh: number
) {
    const scale = Math.max(dw / img.width, dh / img.height);
    const sw = dw / scale;
    const sh = dh / scale;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function applyTextBottomOverlay(ctx: CanvasRenderingContext2D, title: string, W: number, H: number) {
    const grad = ctx.createLinearGradient(0, H * 0.55, 0, H);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.80)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    ctx.font = "bold 58px Arial, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 8;
    const lines = wrapText(ctx, title, W - 80);
    const startY = H * 0.78;
    lines.forEach((line, i) => {
        ctx.fillText(line, W / 2, startY + i * 74);
    });
    ctx.shadowBlur = 0;
}

async function applyPinOverlay(
    imageUrl: string,
    title: string,
    style: PinStyle,
    sectionImages?: string[]
): Promise<string> {
    const W = 1000;
    const H = 1778;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return imageUrl;

    try {
        if (style === "collage" && sectionImages && sectionImages.length > 0) {
            const imgs = await Promise.all(sectionImages.slice(0, 3).map(loadImageForCanvas));
            if (imgs.length >= 3) {
                drawImageCover(ctx, imgs[0], 0, 0, W, Math.floor(H / 2));
                drawImageCover(ctx, imgs[1], 0, Math.floor(H / 2), Math.floor(W / 2), Math.floor(H / 2));
                drawImageCover(ctx, imgs[2], Math.floor(W / 2), Math.floor(H / 2), Math.floor(W / 2), Math.floor(H / 2));
            } else if (imgs.length === 2) {
                drawImageCover(ctx, imgs[0], 0, 0, W, Math.floor(H / 2));
                drawImageCover(ctx, imgs[1], 0, Math.floor(H / 2), W, Math.floor(H / 2));
            } else {
                drawImageCover(ctx, imgs[0], 0, 0, W, H);
            }
            applyTextBottomOverlay(ctx, title, W, H);
        } else {
            const img = await loadImageForCanvas(imageUrl);
            drawImageCover(ctx, img, 0, 0, W, H);

            if (style === "text-top") {
                const grad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
                grad.addColorStop(0, "rgba(0,0,0,0.78)");
                grad.addColorStop(1, "rgba(0,0,0,0)");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, W, H * 0.45);

                ctx.font = "bold 58px Arial, sans-serif";
                ctx.fillStyle = "#FFFFFF";
                ctx.textAlign = "center";
                ctx.shadowColor = "rgba(0,0,0,0.9)";
                ctx.shadowBlur = 8;
                const lines = wrapText(ctx, title, W - 80);
                const startY = H * 0.13;
                lines.forEach((line, i) => {
                    ctx.fillText(line, W / 2, startY + i * 74);
                });
                ctx.shadowBlur = 0;
            } else if (style === "text-middle") {
                ctx.font = "bold 60px Arial, sans-serif";
                const lines = wrapText(ctx, title, W - 120);
                const lineH = 76;
                const boxH = lines.length * lineH + 70;
                const boxY = H * 0.42 - boxH / 2;
                const rx = 40, rw = W - 80;
                ctx.fillStyle = "rgba(0,0,0,0.72)";
                ctx.beginPath();
                ctx.roundRect(rx, boxY, rw, boxH, 24);
                ctx.fill();

                ctx.fillStyle = "#FFFFFF";
                ctx.textAlign = "center";
                ctx.shadowColor = "rgba(0,0,0,0.8)";
                ctx.shadowBlur = 6;
                lines.forEach((line, i) => {
                    ctx.fillText(line, W / 2, boxY + 55 + i * lineH);
                });
                ctx.shadowBlur = 0;
            } else {
                // text-bottom (default)
                applyTextBottomOverlay(ctx, title, W, H);
            }
        }
        return canvas.toDataURL("image/jpeg", 0.92);
    } catch {
        return imageUrl;
    }
}

// ─── Component ───

export default function BlogMonetizerPinExport({ articles, wpBaseUrl, geminiKey, geminiModel }: BlogMonetizerPinExportProps) {
    // ─── Pin Settings (persisted to localStorage) ───
    const [pinSettings, setPinSettings] = useState<PinSettings>(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem("bm-pin-settings");
                if (saved) return JSON.parse(saved);
            } catch { /* use defaults */ }
        }
        const firstKeyword = articles.find(a => a.status === "ready" || a.status === "published")?.keyword || "";
        return { targetKeyword: firstKeyword, annotatedInterests: "", pinStyle: "text-bottom" as PinStyle };
    });

    useEffect(() => {
        localStorage.setItem("bm-pin-settings", JSON.stringify(pinSettings));
    }, [pinSettings]);

    const [generatingText, setGeneratingText] = useState(false);
    const [applyingOverlays, setApplyingOverlays] = useState(false);
    const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);

    // ─── Build pin data ───
    const buildPins = useCallback((): PinData[] => {
        const newPins: PinData[] = [];
        const FAQ_HEADINGS = [
            "frequently asked questions", "faq", "f.a.q", "common questions",
            "questions and answers", "q&a", "q & a", "people also ask", "questions about",
        ];
        for (const article of articles) {
            if (article.status !== "ready" && article.status !== "published") continue;
            if (article.featuredImageUrl) {
                newPins.push({
                    imageUrl: article.featuredImageUrl,
                    title: article.title.slice(0, 100),
                    description: article.metaDescription || article.title,
                    destinationUrl: article.wpLink || wpBaseUrl || "",
                    sourceArticleKeyword: article.keyword,
                    sectionHeading: article.title,
                    type: "featured",
                });
            }
            for (const img of article.sectionImages) {
                const headingLower = img.h2Title.toLowerCase().trim();
                const isFAQ = img.isFAQ || FAQ_HEADINGS.some(f => headingLower.includes(f));
                if (isFAQ || !img.imageUrl) continue;
                newPins.push({
                    imageUrl: img.imageUrl,
                    title: img.h2Title.slice(0, 100),
                    description: `${img.h2Title} - ${article.keyword}`,
                    destinationUrl: article.wpLink || wpBaseUrl || "",
                    sourceArticleKeyword: article.keyword,
                    sectionHeading: img.h2Title,
                    type: "section",
                });
            }
        }
        return newPins;
    }, [articles, wpBaseUrl]);

    const [editablePins, setEditablePins] = useState<PinData[]>(buildPins);

    const refreshPins = useCallback(() => {
        setEditablePins(buildPins());
    }, [buildPins]);

    const updatePin = (index: number, field: keyof PinData, value: string) => {
        setEditablePins(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    // ─── Gemini Pin Text Generation ───
    const generatePinTexts = async (pinIndices?: number[]) => {
        if (!geminiKey) { alert("Gemini API key required. Please add it in Setup."); return; }
        setGeneratingText(true);

        const targetPins = pinIndices
            ? pinIndices.map(i => ({ idx: i, pin: editablePins[i] }))
            : editablePins.map((pin, idx) => ({ idx, pin }));


        try {
            const result = await generatePinTextsAction(
                targetPins.map(p => ({ sectionHeading: p.pin.sectionHeading })),
                pinSettings.targetKeyword,
                pinSettings.annotatedInterests,
                geminiKey,
                geminiModel || "gemini-2.5-flash",
            );

            if (!result.success || !result.results) {
                throw new Error(result.error || "Pin text generation failed.");
            }

            setEditablePins(prev => {
                const copy = [...prev];
                for (const r of result.results!) {
                    const actualIndex = targetPins[r.pinIndex]?.idx;
                    if (actualIndex !== undefined && copy[actualIndex]) {
                        copy[actualIndex] = {
                            ...copy[actualIndex],
                            title: r.title.slice(0, 100),
                            description: validatePinDescription(r.description, 400),
                        };
                    }
                }
                return copy;
            });
        } catch (err) {
            console.error("[PinExport] Text generation failed:", err);
            alert(err instanceof Error ? err.message : "Pin text generation failed.");
        }
        setGeneratingText(false);
    };

    // ─── Apply Overlays to All Pins ───
    const applyAllOverlays = async () => {
        setApplyingOverlays(true);
        // First generate text if not already done
        if (!generatingText) {
            await generatePinTexts();
        }

        // Collect all section images for collage mode
        const allSectionImageUrls = editablePins.filter(p => p.type === "section" && p.imageUrl).map(p => p.imageUrl);

        const updatedPins = [...editablePins];
        for (let i = 0; i < updatedPins.length; i++) {
            const pin = updatedPins[i];
            if (!pin.imageUrl) continue;
            try {
                const overlayUrl = await applyPinOverlay(
                    pin.imageUrl,
                    pin.title,
                    pinSettings.pinStyle,
                    pinSettings.pinStyle === "collage" ? allSectionImageUrls : undefined,
                );
                updatedPins[i] = { ...pin, overlayImageUrl: overlayUrl };
            } catch {
                // Keep original image
            }
        }
        setEditablePins(updatedPins);
        setApplyingOverlays(false);
    };

    // ─── Regenerate Single Pin Text ───
    const regenerateSingleText = async (idx: number) => {
        setRegeneratingIdx(idx);
        await generatePinTexts([idx]);

        // Also apply overlay for this pin
        const pin = editablePins[idx];
        if (pin?.imageUrl) {
            try {
                const allSectionImageUrls = editablePins.filter(p => p.type === "section" && p.imageUrl).map(p => p.imageUrl);
                const overlayUrl = await applyPinOverlay(
                    pin.imageUrl,
                    pin.title,
                    pinSettings.pinStyle,
                    pinSettings.pinStyle === "collage" ? allSectionImageUrls : undefined,
                );
                setEditablePins(prev => {
                    const copy = [...prev];
                    if (copy[idx]) copy[idx] = { ...copy[idx], overlayImageUrl: overlayUrl };
                    return copy;
                });
            } catch { /* keep original */ }
        }
        setRegeneratingIdx(null);
    };

    // ─── Download All as ZIP ───
    const downloadAllAsZip = async () => {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        for (let i = 0; i < editablePins.length; i++) {
            const pin = editablePins[i];
            const imgUrl = pin.overlayImageUrl || pin.imageUrl;
            try {
                if (imgUrl.startsWith("data:")) {
                    const base64 = imgUrl.split(",")[1];
                    zip.file(`pin-${i + 1}-${pin.sourceArticleKeyword.replace(/\s+/g, "-")}.jpg`, base64, { base64: true });
                } else {
                    const response = await fetch(imgUrl);
                    const blob = await response.blob();
                    zip.file(`pin-${i + 1}-${pin.sourceArticleKeyword.replace(/\s+/g, "-")}.jpg`, blob);
                }
            } catch { /* Skip failed */ }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pinterest-pins.zip";
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─── Download Single as 9:16 ───
    const downloadSingle = (pin: PinData, idx: number) => {
        const imgUrl = pin.overlayImageUrl || pin.imageUrl;
        const link = document.createElement("a");
        link.href = imgUrl;
        link.download = `pin-${idx + 1}-${pin.sourceArticleKeyword.replace(/\s+/g, "-")}.jpg`;
        link.click();
    };

    // ─── Copy All Descriptions ───
    const copyAllDescriptions = () => {
        const text = editablePins.map(p => `${p.title}\n${p.description}\n${p.destinationUrl}`).join("\n\n---\n\n");
        navigator.clipboard.writeText(text);
    };

    // ─── Export CSV ───
    const exportCSV = () => {
        const headers = ["Title", "Description", "Image URL", "Destination URL", "Type", "Keyword"];
        const rows = editablePins.map(p => [
            `"${p.title.replace(/"/g, '""')}"`,
            `"${p.description.replace(/"/g, '""')}"`,
            p.overlayImageUrl || p.imageUrl,
            p.destinationUrl,
            p.type,
            p.sourceArticleKeyword,
        ].join(","));
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pinterest-pins.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─── Styles ───
    const inputStyle: React.CSSProperties = {
        width: "100%", background: "#0f1623", border: "1px solid #334155",
        borderRadius: 8, color: "#e2e8f0", padding: "8px 12px", fontSize: 14,
    };
    const selectStyle: React.CSSProperties = {
        ...inputStyle, cursor: "pointer",
    };
    const goldBtnStyle: React.CSSProperties = {
        background: "#f0c040", color: "#0f1623", border: "none", borderRadius: 8,
        padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14,
    };
    const secondaryBtnStyle: React.CSSProperties = {
        background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8,
        color: "#e2e8f0", padding: "8px 16px", cursor: "pointer", fontSize: 14,
    };

    // ─── Empty State ───
    if (editablePins.length === 0) {
        return (
            <div style={{
                background: "#1a2035", borderRadius: 12, border: "1px solid #334155", padding: 40, textAlign: "center",
            }}>
                <p style={{ color: "#94a3b8", fontSize: 16 }}>📌 No pins available yet.</p>
                <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>Generate articles with images first, then come back here to export Pinterest pins.</p>
                <button onClick={refreshPins} style={{ ...secondaryBtnStyle, marginTop: 16 }}>
                    🔄 Refresh Pins
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* ━━━━━━━━ SETTINGS BAR ━━━━━━━━ */}
            <div style={{
                background: "#1a2035", borderRadius: 12, border: "1px solid #334155",
                padding: 20, marginBottom: 20,
            }}>
                <h4 style={{ color: "#f0c040", fontSize: 14, fontWeight: 600, marginBottom: 16, margin: 0 }}>⚙️ Pin Settings</h4>
                <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
                    gap: 16, marginTop: 12,
                }}>
                    {/* Target Keyword */}
                    <div>
                        <label style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
                            Target Keyword
                        </label>
                        <input
                            type="text"
                            value={pinSettings.targetKeyword}
                            onChange={e => setPinSettings(prev => ({ ...prev, targetKeyword: e.target.value }))}
                            placeholder="e.g. Italian chicken recipes"
                            style={inputStyle}
                        />
                    </div>

                    {/* Annotated Interests */}
                    <div>
                        <label style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
                            Annotated Interests
                        </label>
                        <input
                            type="text"
                            value={pinSettings.annotatedInterests}
                            onChange={e => setPinSettings(prev => ({ ...prev, annotatedInterests: e.target.value }))}
                            placeholder="e.g. healthy, meal prep, weeknight dinners"
                            style={inputStyle}
                        />
                        <span style={{ color: "#64748b", fontSize: 10 }}>Comma-separated — woven naturally into descriptions</span>
                    </div>

                    {/* Pin Style */}
                    <div>
                        <label style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
                            Pin Style
                        </label>
                        <select
                            value={pinSettings.pinStyle}
                            onChange={e => setPinSettings(prev => ({ ...prev, pinStyle: e.target.value as PinStyle }))}
                            style={selectStyle}
                        >
                            <option value="collage">Collage — Multiple Images</option>
                            <option value="text-top">Basic — Text at Top</option>
                            <option value="text-middle">Basic — Text at Middle</option>
                            <option value="text-bottom">Basic — Text at Bottom</option>
                        </select>
                    </div>

                    {/* Aspect Ratio (display only) */}
                    <div>
                        <label style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
                            Aspect Ratio
                        </label>
                        <div style={{
                            ...inputStyle, display: "flex", alignItems: "center",
                            cursor: "default", color: "#f0c040", fontWeight: 600,
                        }}>
                            📌 9:16 — Tall Portrait
                        </div>
                    </div>
                </div>
            </div>

            {/* ━━━━━━━━ ACTION BAR ━━━━━━━━ */}
            <div style={{
                display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center",
            }}>
                <span style={{
                    background: "#f0c040", color: "#0f1623", padding: "4px 12px",
                    borderRadius: 20, fontWeight: 700, fontSize: 13,
                }}>
                    📌 {editablePins.length} pins ready
                </span>
                <button
                    onClick={applyAllOverlays}
                    disabled={applyingOverlays || generatingText}
                    style={{ ...goldBtnStyle, opacity: applyingOverlays || generatingText ? 0.6 : 1 }}
                >
                    {applyingOverlays || generatingText ? "⏳ Processing..." : "✨ Apply to All Pins"}
                </button>
                <button onClick={downloadAllAsZip} style={goldBtnStyle}>
                    ⬇️ Download All as ZIP
                </button>
                <button onClick={copyAllDescriptions} style={secondaryBtnStyle}>
                    📋 Copy All Descriptions
                </button>
                <button onClick={exportCSV} style={{ ...secondaryBtnStyle, background: "#065f46", borderColor: "#059669", color: "#d1fae5" }}>
                    📤 Export CSV for Pinterest
                </button>
                <button onClick={refreshPins} style={secondaryBtnStyle}>
                    🔄 Refresh
                </button>
            </div>

            {/* ━━━━━━━━ PIN GRID ━━━━━━━━ */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: 16,
            }}>
                {editablePins.map((pin, i) => (
                    <div
                        key={i}
                        style={{
                            background: "#1a2035",
                            borderRadius: 12,
                            border: "1px solid #334155",
                            overflow: "hidden",
                        }}
                    >
                        {/* Image */}
                        <div style={{ position: "relative" }}>
                            <img
                                src={pin.overlayImageUrl || pin.imageUrl}
                                alt={pin.title}
                                style={{ width: "100%", aspectRatio: "9/16", objectFit: "cover", display: "block" }}
                            />
                            <span style={{
                                position: "absolute", top: 8, left: 8,
                                background: pin.type === "featured" ? "#f0c040" : "#3b82f6",
                                color: "#0f1623", padding: "2px 8px", borderRadius: 6,
                                fontSize: 11, fontWeight: 700,
                            }}>
                                {pin.type === "featured" ? "⭐ Featured" : "📷 Section"}
                            </span>
                            {pin.overlayImageUrl && (
                                <span style={{
                                    position: "absolute", top: 8, right: 8,
                                    background: "#10b981", color: "#fff", padding: "2px 6px", borderRadius: 6,
                                    fontSize: 10, fontWeight: 700,
                                }}>
                                    ✓ Overlay
                                </span>
                            )}
                        </div>

                        {/* Pin Info */}
                        <div style={{ padding: 14 }}>
                            <label style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>Pin Title (max 100)</label>
                            <input
                                type="text"
                                maxLength={100}
                                value={pin.title}
                                onChange={(e) => updatePin(i, "title", e.target.value)}
                                style={{
                                    width: "100%", background: "#0f1623", border: "1px solid #334155",
                                    borderRadius: 6, color: "#e2e8f0", padding: "6px 10px", fontSize: 13,
                                    marginBottom: 8,
                                }}
                            />

                            <label style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>Pin Description (max 400)</label>
                            <textarea
                                maxLength={400}
                                rows={3}
                                value={pin.description}
                                onChange={(e) => updatePin(i, "description", e.target.value)}
                                style={{
                                    width: "100%", background: "#0f1623", border: "1px solid #334155",
                                    borderRadius: 6, color: "#e2e8f0", padding: "6px 10px", fontSize: 13,
                                    resize: "vertical", marginBottom: 4,
                                }}
                            />
                            <div style={{ textAlign: "right", fontSize: 10, color: pin.description.length > 380 ? "#ef4444" : "#64748b", marginBottom: 8 }}>
                                {pin.description.length}/400
                            </div>

                            <label style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>Destination URL</label>
                            <input
                                type="text"
                                value={pin.destinationUrl}
                                onChange={(e) => updatePin(i, "destinationUrl", e.target.value)}
                                style={{
                                    width: "100%", background: "#0f1623", border: "1px solid #334155",
                                    borderRadius: 6, color: "#e2e8f0", padding: "6px 10px", fontSize: 13,
                                    marginBottom: 10,
                                }}
                            />

                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <button
                                    onClick={() => regenerateSingleText(i)}
                                    disabled={regeneratingIdx === i}
                                    style={{
                                        flex: 1, ...secondaryBtnStyle, padding: "6px 0", textAlign: "center",
                                        fontSize: 12, opacity: regeneratingIdx === i ? 0.6 : 1,
                                    }}
                                >
                                    {regeneratingIdx === i ? "⏳..." : "✨ Regen Text"}
                                </button>
                                <button
                                    onClick={() => downloadSingle(pin, i)}
                                    style={{
                                        flex: 1, ...secondaryBtnStyle, padding: "6px 0", textAlign: "center", fontSize: 12,
                                    }}
                                >
                                    ⬇️ Download
                                </button>
                                <a
                                    href={`https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(pin.destinationUrl)}&media=${encodeURIComponent(pin.overlayImageUrl || pin.imageUrl)}&description=${encodeURIComponent(pin.description)}`}
                                    target="_blank"
                                    rel="noopener"
                                    style={{
                                        flex: 1, background: "#e60023", border: "none", borderRadius: 8,
                                        color: "#fff", padding: "6px 0", textAlign: "center", textDecoration: "none",
                                        fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                >
                                    📌 Pin
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
