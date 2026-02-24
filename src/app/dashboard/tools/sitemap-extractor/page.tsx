"use client";

import React, { useState, useRef } from "react";
import { Upload, Download, FileText, AlertTriangle, Loader2, Search, ExternalLink } from "lucide-react";
import { extractBatch, type ExtractedProduct } from "@/app/actions/sitemap-extractor/extract";

export default function SitemapExtractorPage() {
    const [urls, setUrls] = useState<string[]>([]);
    const [results, setResults] = useState<ExtractedProduct[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [failedCount, setFailedCount] = useState(0);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── XML Upload & Parse ─────────────────────────────────────────
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setError("");

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const trimmed = text.trimStart();

            // Content-based validation: accept any file whose content is XML
            if (!trimmed.startsWith("<?xml") && !trimmed.includes("<urlset") && !trimmed.includes("<loc")) {
                setError("Invalid file format. Please upload an XML sitemap file.");
                setUrls([]);
                setResults([]);
                return;
            }

            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "application/xml");
            const locElements = xml.getElementsByTagName("loc");
            const extracted: string[] = [];
            for (let i = 0; i < locElements.length; i++) {
                const url = locElements[i].textContent?.trim();
                if (url) extracted.push(url);
            }

            if (extracted.length === 0) {
                setError("Invalid sitemap file. No <loc> tags found.");
                setUrls([]);
                setResults([]);
                return;
            }

            setError("");
            setUrls(extracted);
            setResults([]);
            setFailedCount(0);
        };
        reader.readAsText(file);
    };

    // ── Fetch & Extract ────────────────────────────────────────────
    const handleExtract = async () => {
        if (urls.length === 0) return;
        setIsProcessing(true);
        setResults([]);
        setFailedCount(0);
        setProgress({ current: 0, total: urls.length });

        const BATCH_SIZE = 10;
        let allResults: ExtractedProduct[] = [];
        let totalFailed = 0;

        for (let i = 0; i < urls.length; i += BATCH_SIZE) {
            const batch = urls.slice(i, i + BATCH_SIZE);
            const batchResult = await extractBatch(batch);
            allResults = [...allResults, ...batchResult.results];
            totalFailed += batchResult.failedCount;
            setResults([...allResults]);
            setFailedCount(totalFailed);
            setProgress({ current: Math.min(i + BATCH_SIZE, urls.length), total: urls.length });
        }

        setIsProcessing(false);
    };

    // ── CSV Download ───────────────────────────────────────────────
    const handleDownloadCSV = () => {
        if (results.length === 0) return;
        const headers = "Name,Link,Image";
        const rows = results.map(
            (r) =>
                `"${(r.name || "").replace(/"/g, '""')}","${r.link}","${r.image}"`
        );
        const csv = "\uFEFF" + [headers, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        const date = new Date().toISOString().slice(0, 10);
        link.download = `sitemap-products-${date}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div style={{ color: "var(--foreground)" }}>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <FileText className="w-8 h-8" style={{ color: "var(--primary)" }} />
                    Sitemap Product Extractor
                </h1>
                <p style={{ color: "var(--muted)" }}>
                    Upload a product sitemap XML to extract product names, links, and images for CSV export.
                </p>
            </div>

            {/* Upload Card */}
            <div
                className="rounded-2xl p-6 mb-6"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5" style={{ color: "var(--accent)" }} />
                    Upload Sitemap XML
                </h2>

                <div
                    className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition hover:opacity-80"
                    style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--muted)" }} />
                    <p className="font-medium" style={{ color: "var(--foreground)" }}>
                        {fileName ? fileName : "Click to upload product-sitemap.xml"}
                    </p>
                    <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                        Upload any XML sitemap file (WooCommerce sitemaps supported)
                    </p>
                </div>

                {/* Error message */}
                {error && (
                    <div
                        className="mt-4 flex items-center gap-2 px-4 py-3 rounded-lg"
                        style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
                    >
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: "#EF4444" }} />
                        <span className="text-sm font-medium" style={{ color: "#EF4444" }}>
                            {error}
                        </span>
                    </div>
                )}

                {/* URL count & Extract button */}
                {urls.length > 0 && (
                    <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Search className="w-5 h-5" style={{ color: "#22C55E" }} />
                            <span className="font-semibold" style={{ color: "#22C55E" }}>
                                Found {urls.length} product URL{urls.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                        <button
                            onClick={handleExtract}
                            disabled={isProcessing}
                            className="px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-2 transition disabled:opacity-50 shadow-lg hover:scale-105"
                            style={{ background: "var(--primary)", color: "#0F172A" }}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> Extracting…
                                </>
                            ) : (
                                "Extract Products →"
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            {isProcessing && (
                <div
                    className="rounded-2xl p-6 mb-6"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                            Processing {progress.current} of {progress.total} products…
                        </span>
                        <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>
                            {progressPercent}%
                        </span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${progressPercent}%`,
                                background: "linear-gradient(90deg, var(--primary), var(--accent))",
                            }}
                        />
                    </div>
                    {failedCount > 0 && (
                        <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#F59E0B" }}>
                            <AlertTriangle className="w-3 h-3" /> {failedCount} URL{failedCount !== 1 ? "s" : ""} failed (skipped)
                        </p>
                    )}
                </div>
            )}

            {/* Results Table */}
            {results.length > 0 && (
                <div
                    className="rounded-2xl p-6 mb-6"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                        <div>
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                Extracted Products
                            </h2>
                            <p className="text-sm" style={{ color: "var(--muted)" }}>
                                {results.length} product{results.length !== 1 ? "s" : ""} extracted
                                {failedCount > 0 && (
                                    <span style={{ color: "#F59E0B" }}> · {failedCount} failed</span>
                                )}
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadCSV}
                            className="px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition"
                            style={{ background: "var(--accent)", color: "white" }}
                        >
                            <Download className="w-4 h-4" /> Download CSV
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: "var(--secondary)" }}>
                                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>#</th>
                                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Image</th>
                                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Name</th>
                                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((product, idx) => (
                                    <tr key={idx} className="transition hover:opacity-90" style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--muted)" }}>{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            {product.image ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-12 h-12 object-cover rounded-lg"
                                                    style={{ border: "1px solid var(--border)" }}
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "var(--secondary)" }}>
                                                    <FileText className="w-5 h-5" style={{ color: "var(--muted)" }} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)", maxWidth: "300px" }}>
                                            <span className="line-clamp-2">{product.name || "—"}</span>
                                        </td>
                                        <td className="px-4 py-3" style={{ maxWidth: "300px" }}>
                                            <a
                                                href={product.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 hover:underline text-xs break-all"
                                                style={{ color: "var(--accent)" }}
                                            >
                                                {product.link.replace(/^https?:\/\/(www\.)?/, "").slice(0, 50)}
                                                {product.link.length > 60 ? "…" : ""}
                                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty state when no results and not processing */}
            {!isProcessing && results.length === 0 && urls.length === 0 && (
                <div
                    className="rounded-2xl p-12 text-center"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                        style={{ background: "var(--secondary)" }}
                    >
                        <FileText className="w-10 h-10" style={{ color: "var(--muted)" }} />
                    </div>
                    <h3 className="text-xl font-medium mb-2" style={{ color: "var(--foreground)" }}>
                        No sitemap uploaded
                    </h3>
                    <p className="max-w-md mx-auto" style={{ color: "var(--muted)" }}>
                        Upload a product-sitemap.xml file to extract product names, links, and images. Supports WooCommerce and standard XML sitemaps.
                    </p>
                </div>
            )}
        </div>
    );
}
