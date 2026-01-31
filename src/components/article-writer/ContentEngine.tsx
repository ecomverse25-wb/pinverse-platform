"use client";

import { useState } from "react";
import { KeywordCluster, Product, ArticleData, WPCredentials } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Check, Share, RefreshCw, ArrowRight } from "lucide-react";

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
}

import { usePrompts } from "./usePrompts";
import { PromptCategory } from "./prompts";

// ... existing imports

export default function ContentEngine({ clusters, products, apiKey, wpCredentials, articles, setArticles, onNext }: ContentEngineProps) {
    const [selectedTopic, setSelectedTopic] = useState<KeywordCluster | null>(null);
    const [generating, setGenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);
    // const [statusMsg, setStatusMsg] = useState("");
    const { toast } = useToast();

    // Load prompts
    const { prompts } = usePrompts();


    const handleGenerate = async () => {
        if (!selectedTopic || !apiKey) {
            toast({ title: "Missing Information", description: "Please select a topic and ensure API Key is set.", variant: "destructive" });
            return;
        }

        setGenerating(true);
        toast({ title: "Started", description: "Matching products and generating article..." });

        // 1. Find Matching Products
        const topicLower = selectedTopic.topic.toLowerCase();
        let matched = products.filter(p => p.name.toLowerCase().includes(topicLower));

        // Fallback to random 3 if no match
        if (matched.length === 0 && products.length > 0) {
            matched = products.sort(() => 0.5 - Math.random()).slice(0, 3);
        } else {
            matched = matched.slice(0, 3); // Top 3 matches
        }

        // 2. Construct Prompt
        const productHTML = matched.map(p =>
            `<div class="my-6 p-4 border rounded-lg shadow-sm bg-white max-w-sm mx-auto">
                <img src="${p.image}" alt="${p.name}" class="w-full h-64 object-cover rounded-md mb-4" />
                <h3 class="font-bold text-lg mb-2 text-slate-900">${p.name}</h3>
                <a href="${p.link}" class="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors no-underline">Check Price</a>
             </div>`
        ).join("\n");

        // Simple Heuristic for Category (can be improved with UI selector later)
        let category: PromptCategory = 'general';
        if (topicLower.includes('decor') || topicLower.includes('room') || topicLower.includes('home')) category = 'home_decor';
        else if (topicLower.includes('fashion') || topicLower.includes('outfit') || topicLower.includes('wear') || topicLower.includes('style')) category = 'fashion';
        else if (topicLower.includes('food') || topicLower.includes('recipe') || topicLower.includes('cook') || topicLower.includes('meal')) category = 'food';

        const basePrompt = prompts[category] || prompts['general'];
        const itemCount = 5; // Default for now, could extract from title if needed

        const prompt = basePrompt
            .replace(/{title}/g, selectedTopic.topic)
            .replace(/{itemCount}/g, itemCount.toString())
            .replace(/{date}/g, new Date().toDateString())
            + `\n\nIMPORTANT: You MUST embed the following HTML Product Cards naturally within the body: \n${productHTML}\n\nOutput ONLY HTML code starting with <h1>.`;

        try {
            const result = await generateArticleAction(prompt, apiKey);

            if (result.error || !result.content) {
                throw new Error(result.error || "Generation failed");
            }

            const content = result.content;

            // Extract Title from H1
            const titleMatch = content.match(/<h1>(.*?)<\/h1>/i);
            const title = titleMatch ? titleMatch[1] : selectedTopic.topic; // Basic extraction

            // Extract a Hero Image candidate (first product image or null)
            const heroImage = matched.length > 0 ? matched[0].image : undefined;

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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Topic Selector */}
            <Card className="col-span-1 bg-white dark:bg-slate-950">
                <CardHeader>
                    <CardTitle>Select Topic</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px]">
                        {clusters.map((c, i) => (
                            <div
                                key={i}
                                onClick={() => setSelectedTopic(c)}
                                className={`p-3 mb-2 rounded-lg cursor-pointer border transition-colors ${selectedTopic?.topic === c.topic ? 'bg-primary/10 border-primary' : 'hover:bg-slate-100'} text-slate-900 border-slate-200`}
                            >
                                <div className="font-semibold">{c.topic}</div>
                                <div className="text-xs text-slate-500">{c.keywords.length} keywords</div>
                            </div>
                        ))}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Middle: Generator & Preview */}
            <Card className="col-span-2 bg-white dark:bg-slate-950">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Content Studio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 items-center bg-slate-50 border border-slate-100 p-4 rounded-lg">
                        <div className="flex-1">
                            <span className="text-sm font-medium text-slate-500">Chosen Topic: </span>
                            <span className="font-bold text-lg text-slate-900">{selectedTopic?.topic || "None"}</span>
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

                    {/* Generated Articles List */}
                    <div className="space-y-4 mt-6">
                        {articles.map((article, idx) => (
                            <Card key={idx} className="overflow-hidden border-slate-200 bg-white">
                                <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center px-4">
                                    <h3 className="font-bold truncate max-w-md text-slate-900">{article.title}</h3>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant={article.wpStatus === 'draft' ? "outline" : "default"}
                                            onClick={() => publishToWP(article, idx)}
                                            disabled={publishing || article.wpStatus === 'draft'}
                                        >
                                            {article.wpStatus === 'draft'
                                                ? <span className="text-green-600 flex items-center"><Check className="w-3 h-3 mr-1" /> Draft Saved</span>
                                                : <span className="flex items-center"><Share className="w-3 h-3 mr-1" /> Send to WP</span>
                                            }
                                        </Button>
                                    </div>
                                </div>
                                {/* White background enforced for article content for better readability */}
                                <div className="p-8 max-h-[600px] overflow-y-auto text-base prose prose-slate max-w-none bg-white text-slate-900 rounded-b-lg shadow-inner">
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
