"use client";

import { useState } from "react";
import { KeywordCluster, Product, ArticleData, WPCredentials } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Check, Share, RefreshCw, ArrowRight, Trash2, FileText, AlertCircle, Clock, Camera } from "lucide-react";

import { generateArticleAction } from "@/app/actions/ai-actions";
import { publishPostAction } from "@/app/actions/wp-actions";
import { useToast } from "@/components/ui/use-toast";

interface ContentEngineProps {
    clusters: KeywordCluster[];
    products: Product[];
    apiKey: string;
    wpCredentials: WPCredentials;
    articles: ArticleData[];
    setArticles: (articles: ArticleData[]) => void;
    onNext: () => void;
    selectedModel?: string;
}

import { usePrompts } from "./usePrompts";
import { PromptCategory } from "./prompts";

// --- Stop words for keyword extraction ---
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'it', 'that', 'this', 'are', 'was',
    'be', 'has', 'had', 'have', 'will', 'would', 'could', 'should', 'may',
    'can', 'do', 'does', 'did', 'not', 'no', 'so', 'if', 'its', 'your',
    'my', 'our', 'their', 'we', 'you', 'he', 'she', 'they', 'me', 'him',
    'her', 'us', 'them', 'what', 'which', 'who', 'whom', 'how', 'when',
    'where', 'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'than', 'too', 'very', 'just', 'about', 'above',
    'after', 'again', 'also', 'any', 'as', 'before', 'between', 'best',
    'into', 'out', 'over', 'own', 'same', 'then', 'these', 'those', 'up',
]);

// --- Fuzzy product matching for an H2 heading ---
function findBestProductMatch(h2Text: string, products: Product[], usedIndices: Set<number>): { product: Product; index: number } | null {
    const h2Words = h2Text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
    if (h2Words.length === 0 || products.length === 0) return null;

    let bestScore = 0;
    let bestIdx = -1;

    for (let i = 0; i < products.length; i++) {
        if (usedIndices.has(i)) continue; // avoid reusing the same product
        const nameLower = products[i].name.toLowerCase();
        let score = 0;
        for (const word of h2Words) {
            if (nameLower.includes(word)) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
        }
    }

    if (bestScore > 0 && bestIdx >= 0) {
        return { product: products[bestIdx], index: bestIdx };
    }
    return null;
}

// --- Dark-themed product card HTML ---
function buildProductCardHTML(product: Product): string {
    return `<div style="margin: 1.5rem auto; padding: 1rem; border: 1px solid #334155; border-radius: 0.75rem; background: #252d3d; max-width: 24rem; text-align: center;">
        <img src="${product.image}" alt="${product.name}" style="width: 100%; height: 16rem; object-fit: cover; border-radius: 0.5rem; margin-bottom: 1rem;" />
        <h3 style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem; color: #ffffff;">${product.name}</h3>
        <a href="${product.link}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #f0c040; color: #1a1f2e; padding: 0.5rem 1.5rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none;">Check Price</a>
    </div>`;
}

// --- Placeholder card when no product match ---
function buildPlaceholderCardHTML(h2Text: string): string {
    return `<div style="margin: 1.5rem auto; padding: 2rem 1rem; border: 2px dashed #334155; border-radius: 0.75rem; background: #252d3d; max-width: 24rem; text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.5;">📷</div>
        <p style="font-size: 0.85rem; color: #94a3b8; margin: 0;">${h2Text}</p>
        <span style="display: inline-block; margin-top: 0.5rem; padding: 0.15rem 0.5rem; border-radius: 9999px; background: #334155; color: #94a3b8; font-size: 0.7rem;">AI Generated Image</span>
    </div>`;
}

// --- Inject product cards after each H2 section ---
function injectProductCards(html: string, products: Product[]): string {
    // Split the HTML at each <h2> tag to identify sections
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    const h2Matches: { text: string; index: number }[] = [];
    let match;
    while ((match = h2Regex.exec(html)) !== null) {
        // Strip HTML tags from the H2 text for matching
        const plainText = match[1].replace(/<[^>]*>/g, '').trim();
        h2Matches.push({ text: plainText, index: match.index });
    }

    if (h2Matches.length === 0) return html;

    // For each H2, find the best product match
    const usedIndices = new Set<number>();
    const injections: { position: number; cardHTML: string }[] = [];

    for (let i = 0; i < h2Matches.length; i++) {
        const h2 = h2Matches[i];
        // Find the end of this H2's section (before next H2 or end of content)
        const nextH2Start = i + 1 < h2Matches.length ? h2Matches[i + 1].index : html.length;

        // Find the best insertion point — right before the next H2 or end
        const bestMatch = findBestProductMatch(h2.text, products, usedIndices);

        let cardHTML: string;
        if (bestMatch) {
            usedIndices.add(bestMatch.index);
            cardHTML = buildProductCardHTML(bestMatch.product);
        } else {
            cardHTML = buildPlaceholderCardHTML(h2.text);
        }

        injections.push({ position: nextH2Start, cardHTML });
    }

    // Insert from end to start so positions stay valid
    let result = html;
    for (let i = injections.length - 1; i >= 0; i--) {
        const { position, cardHTML } = injections[i];
        result = result.slice(0, position) + cardHTML + result.slice(position);
    }

    return result;
}

// --- Sanitize rendered content for dark theme ---
function sanitizeContent(html: string): string {
    let cleaned = html;

    // Strip code fences: ```html, ```, etc.
    cleaned = cleaned.replace(/```[\w]*\s*/g, '').replace(/```/g, '');

    // Style H1 white, H2 gold
    cleaned = cleaned.replace(/<h1([^>]*)>/gi, '<h1$1 style="color: #ffffff;">');
    cleaned = cleaned.replace(/<h2([^>]*)>/gi, '<h2$1 style="color: #f0c040;">');

    // Fix any inline product cards that Gemini might have generated with light bg
    cleaned = cleaned.replace(/bg-white/g, 'bg-[#252d3d]');
    cleaned = cleaned.replace(/text-slate-900/g, 'text-white');

    return cleaned;
}


// --- Helper: Status Badge ---
const StatusBadge = ({ status }: { status: ArticleData['wpStatus'] }) => {
    const variants = {
        'published': { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: Check, label: 'Published' },
        'publish': { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: Check, label: 'Published' },
        'draft': { bg: 'bg-green-500/10', text: 'text-green-500', icon: FileText, label: 'WP Draft' },
        'failed': { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertCircle, label: 'Failed' },
        'unsent': { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: Clock, label: 'Ready' }
    };

    const config = variants[status || 'unsent'] || variants['unsent'];
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.text} text-xs font-bold border border-current/20`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
};

export default function ContentEngine({ clusters, products, apiKey, wpCredentials, articles, setArticles, onNext, selectedModel }: ContentEngineProps) {
    const [selectedTopic, setSelectedTopic] = useState<KeywordCluster | null>(null);
    const [generating, setGenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const { toast } = useToast();

    // Load prompts
    const { prompts } = usePrompts();

    // --- Undoable Delete ---
    const handleDeleteArticle = (index: number) => {
        const deleted = articles[index];
        const updated = articles.filter((_, i) => i !== index);

        // Optimistic Update
        setArticles(updated);

        toast({
            title: "Article Deleted",
            description: `Deleted "${deleted.title}"`,
            action: (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        // Undo: Insert back at original index
                        const restored = [...updated];
                        restored.splice(index, 0, deleted);
                        setArticles(restored);
                    }}
                >
                    Undo
                </Button>
            ),
        });
    };



    const handleGenerate = async () => {
        if (!selectedTopic || !apiKey) {
            toast({ title: "Missing Information", description: "Please select a topic and ensure API Key is set.", variant: "destructive" });
            return;
        }

        setGenerating(true);
        toast({ title: "Started", description: `Generating article with ${selectedModel || 'Gemini'}...` });

        // Extract item count from topic title (e.g. "10 Best Kitchen Ideas" → 10)
        const numberMatch = selectedTopic.topic.match(/(\d+)/);
        const itemCount = numberMatch ? parseInt(numberMatch[1], 10) : 5;

        // Simple Heuristic for Category
        const topicLower = selectedTopic.topic.toLowerCase();
        let category: PromptCategory = 'general';
        if (topicLower.includes('decor') || topicLower.includes('room') || topicLower.includes('home')) category = 'home_decor';
        else if (topicLower.includes('fashion') || topicLower.includes('outfit') || topicLower.includes('wear') || topicLower.includes('style')) category = 'fashion';
        else if (topicLower.includes('food') || topicLower.includes('recipe') || topicLower.includes('cook') || topicLower.includes('meal')) category = 'food';

        const basePrompt = prompts[category] || prompts['general'];

        const prompt = basePrompt
            .replace(/{title}/g, selectedTopic.topic)
            .replace(/{itemCount}/g, itemCount.toString())
            .replace(/{date}/g, new Date().toDateString())
            + `\n\nIMPORTANT: Do NOT include any product cards, affiliate links, or images in the article. Just write the pure article content with proper HTML headings and paragraphs. Product cards will be inserted automatically.\n\nOutput ONLY HTML code starting with <h1>.`;

        try {
            const result = await generateArticleAction(prompt, apiKey, selectedModel);

            if (result.error || !result.content) {
                throw new Error(result.error || "Generation failed");
            }

            let content = result.content;

            // Sanitize: strip code fences, apply dark heading styles
            content = sanitizeContent(content);

            // Inject product cards after each H2 section
            content = injectProductCards(content, products);

            // Extract Title from H1
            const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : selectedTopic.topic;

            // Extract a Hero Image candidate (first product image or null)
            const heroImage = products.length > 0 ? products[0].image : undefined;

            const newArticle: ArticleData = {
                topic: selectedTopic.topic,
                title: title,
                content: content,
                heroImage: heroImage,
                wpStatus: 'unsent'
            };

            setArticles([...articles, newArticle]);
            toast({ title: "Success", description: "Article successfully generated!", variant: "success" });
        } catch (error: unknown) {

            console.error(error);
            const msg = error instanceof Error ? error.message : "Unknown error";
            toast({ title: "Generation Failed", description: msg, variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const publishToWP = async (article: ArticleData, index: number) => {
        if (!wpCredentials.url || !wpCredentials.user || !wpCredentials.password) {
            toast({ title: "Error", description: "Missing WordPress Credentials in Strategy/Settings.", variant: "destructive" });
            return;
        }

        setPublishing(true);
        toast({ title: "Publishing", description: "Sending to WordPress..." });

        try {
            // Use Server Action instead of Client Service
            const result = await publishPostAction(article, wpCredentials);

            if (result.error || !result.link) {
                throw new Error(result.error || "Failed to publish post");
            }

            // Update article status
            const updated = [...articles];
            updated[index] = {
                ...article,
                wpLink: result.link,
                wpStatus: 'draft'
            };
            setArticles(updated);
            toast({ title: "Published", description: "Article saved as draft in WordPress.", variant: "success" });

        } catch (error: unknown) {

            console.error(error);
            const msg = error instanceof Error ? error.message : "Unknown error";
            toast({ title: "Publish Error", description: msg, variant: "destructive" });
            const updated = [...articles];
            updated[index] = { ...article, wpStatus: 'failed' };
            setArticles(updated);
        } finally {
            setPublishing(false);
        }
    };

    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    // --- Bulk Actions ---
    const toggleSelection = (index: number) => {
        if (selectedIndices.includes(index)) {
            setSelectedIndices(selectedIndices.filter(i => i !== index));
        } else {
            setSelectedIndices([...selectedIndices, index]);
        }
    };

    const handleBulkDelete = () => {
        const remaining = articles.filter((_, i) => !selectedIndices.includes(i));
        const deletedCount = articles.length - remaining.length;
        setArticles(remaining);
        setSelectedIndices([]);

        toast({ title: "Bulk Delete", description: `Removed ${deletedCount} articles.` });
    };

    const handleBulkPublish = async () => {
        const toPublishIndices = selectedIndices.filter(i => articles[i].wpStatus !== 'publish' && articles[i].wpStatus !== 'published');

        if (toPublishIndices.length === 0) {
            toast({ title: "Info", description: "No selected articles need publishing." });
            return;
        }

        setPublishing(true);
        toast({ title: "Bulk Publish", description: `Publishing ${toPublishIndices.length} articles...` });

        // Sequential publish to avoid overwhelming server
        for (const idx of toPublishIndices) {
            await publishToWP(articles[idx], idx);
        }

        setPublishing(false);
        toast({ title: "Done", description: "Bulk publishing complete." });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            {/* Left: Topic Selector */}
            <Card className="col-span-1 bg-[#0f172a] border-slate-800 text-white shadow-lg">
                <CardHeader>
                    <CardTitle className="text-yellow-500">Select Topic</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px]">
                        {clusters.map((c, i) => (
                            <div
                                key={i}
                                onClick={() => setSelectedTopic(c)}
                                className={`p-3 mb-2 rounded-lg cursor-pointer border transition-colors ${selectedTopic?.topic === c.topic ? 'bg-primary/10 border-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-900'} text-foreground border-border`}
                            >
                                <div className="font-semibold">{c.topic}</div>
                                <div className="text-xs text-muted-foreground">{c.keywords.length} keywords</div>
                            </div>
                        ))}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Middle: Generator & Preview — Dark Theme */}
            <Card className="col-span-2 bg-gray-800 border border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">Content Studio</CardTitle>
                    {articles.length > 0 && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedIndices(articles.map((_, i) => i))}>All</Button>
                            <Button variant="outline" size="sm" onClick={() => setSelectedIndices([])}>None</Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 items-center bg-gray-900/50 border border-gray-700 p-4 rounded-lg">
                        <div className="flex-1">
                            <span className="text-sm font-medium text-gray-400">Chosen Topic: </span>
                            <span className="font-bold text-lg text-white">{selectedTopic?.topic || "None"}</span>
                        </div>
                        <Button
                            onClick={handleGenerate}
                            disabled={generating || !selectedTopic}
                            className="w-40"
                        >
                            {generating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                            Generate Article
                        </Button>
                    </div>

                    {/* Bulk Action Bar */}
                    {selectedIndices.length > 0 && (
                        <div className="flex items-center justify-between bg-primary/5 p-3 rounded-md border border-primary/20 animate-in fade-in slide-in-from-top-2">
                            <span className="text-sm font-medium ml-2 text-white">{selectedIndices.length} Selected</span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>Delete Selected</Button>
                                <Button size="sm" onClick={handleBulkPublish} disabled={publishing}>Publish Selected</Button>
                            </div>
                        </div>
                    )}

                    {/* Generated Articles List */}
                    <div className="space-y-4 mt-6">
                        {articles.map((article, idx) => (
                            <Card key={idx} className={`overflow-hidden border transition-all ${selectedIndices.includes(idx) ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-gray-700 bg-gray-800'}`}>
                                <div className="bg-gray-900/50 p-3 border-b border-gray-700 flex justify-between items-center px-4">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary"
                                            checked={selectedIndices.includes(idx)}
                                            onChange={() => toggleSelection(idx)}
                                        />
                                        <h3 className="font-bold truncate max-w-md text-white">{article.title}</h3>
                                        <StatusBadge status={article.wpStatus} />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-gray-400 hover:text-destructive"
                                            onClick={() => handleDeleteArticle(idx)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant={article.wpStatus === 'draft' ? "outline" : "default"}
                                            className={article.wpStatus !== 'draft' ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                                            onClick={() => publishToWP(article, idx)}
                                            disabled={publishing || article.wpStatus === 'draft'}
                                        >
                                            {article.wpStatus === 'draft'
                                                ? <span className="text-green-600 dark:text-green-400 flex items-center"><Check className="w-3 h-3 mr-1" /> Draft Saved</span>
                                                : <span className="flex items-center"><Share className="w-3 h-3 mr-1" /> Send to WP</span>
                                            }
                                        </Button>
                                    </div>
                                </div>
                                {/* Dark themed article preview */}
                                <div className="p-8 max-h-[600px] overflow-y-auto text-base max-w-none bg-[#1a1f2e] text-[#e2e8f0] rounded-b-lg shadow-inner"
                                    style={{ lineHeight: '1.8' }}
                                >
                                    <div dangerouslySetInnerHTML={{ __html: article.content }} />
                                </div>
                            </Card>
                        ))}
                    </div>

                    {articles.length > 0 && (
                        <div className="flex justify-end mt-4">
                            <Button onClick={onNext} variant="secondary">
                                Go to Pin Factory <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
