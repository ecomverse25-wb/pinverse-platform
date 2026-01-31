"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, FileText, Image as ImageIcon, Layers, Search } from "lucide-react";
import KeywordStrategy from "./KeywordStrategy";
import ContentEngine from "./ContentEngine";
import PinFactory from "./PinFactory";
import PromptSettings from "./PromptSettings";

// Shared Types
export interface KeywordCluster {
    topic: string;
    keywords: string[];
}

export interface Product {
    name: string;
    link: string;
    image: string;
}

export interface ArticleData {
    topic: string;
    title: string;
    content: string; // HTML
    heroImage?: string; // URL for Pin Factory
    wpLink?: string;
}

import PinterestResearch from "./PinterestResearch";

export default function ArticleWriterTool() {
    const [activeTab, setActiveTab] = useState("research");

    // Global State (Persists across tabs)
    const [apiKey, setApiKey] = useState("");
    const [activePinterestToken, setActivePinterestToken] = useState("");
    const [apiProvider, setApiProvider] = useState<"gemini" | "openai">("gemini");

    // WordPress Creds
    const [wpUrl, setWpUrl] = useState("");
    const [wpUser] = useState("");

    const [wpPassword, setWpPassword] = useState("");


    // Data
    const [clusters, setClusters] = useState<KeywordCluster[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [generatedArticles, setGeneratedArticles] = useState<ArticleData[]>([]);

    const handleAddKeywordsFromResearch = (newKeywords: string[]) => {
        // Simple logic to add to a "Research" cluster or general pool
        // For now, let's create a new cluster if it doesn't exist
        const researchCluster = clusters.find(c => c.topic === "TREND RESEARCH");

        let updatedClusters;
        if (researchCluster) {
            updatedClusters = clusters.map(c =>
                c.topic === "TREND RESEARCH"
                    ? { ...c, keywords: [...new Set([...c.keywords, ...newKeywords])] }
                    : c
            );
        } else {
            updatedClusters = [{ topic: "TREND RESEARCH", keywords: newKeywords }, ...clusters];
        }

        setClusters(updatedClusters);
    };

    return (
        <div className="space-y-6">
            {/* API Configuration & Settings Header */}
            <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">AI Provider</label>
                            <select
                                className="w-full p-2 rounded-md border bg-background"
                                value={apiProvider}
                                onChange={(e) => setApiProvider(e.target.value as "gemini" | "openai")}

                            >
                                <option value="gemini">Google Gemini</option>
                                {/* <option value="openai">OpenAI (Coming Soon)</option> */}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">AI API Key</label>
                            <input
                                type="password"
                                className="w-full p-2 rounded-md border bg-background"
                                placeholder="sk-..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Pinterest Token (Optional)</label>
                            <input
                                type="password"
                                className="w-full p-2 rounded-md border bg-background"
                                placeholder="For real trends data"
                                value={activePinterestToken}
                                onChange={(e) => setActivePinterestToken(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">WordPress URL</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md border bg-background"
                                placeholder="https://mysite.com"
                                value={wpUrl}
                                onChange={(e) => setWpUrl(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">WP App Password</label>
                            <input
                                type="password"
                                className="w-full p-2 rounded-md border bg-background"
                                placeholder="abcd efgh ..."
                                value={wpPassword}
                                onChange={(e) => setWpPassword(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-14">
                    <TabsTrigger value="research" className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-base">
                        <Search className="w-5 h-5" />
                        0. Research
                    </TabsTrigger>
                    <TabsTrigger value="strategy" className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-base">
                        <Layers className="w-5 h-5" />
                        1. Strategy & Data
                    </TabsTrigger>
                    <TabsTrigger value="content" className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-base">
                        <FileText className="w-5 h-5" />
                        2. Content Engine
                    </TabsTrigger>
                    <TabsTrigger value="pins" className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-base">
                        <ImageIcon className="w-5 h-5" />
                        3. Pin Factory
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-base">
                        <Settings className="w-5 h-5" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="research">
                        <PinterestResearch
                            pinterestToken={activePinterestToken}
                            onAddKeywords={handleAddKeywordsFromResearch}
                        />
                    </TabsContent>

                    <TabsContent value="strategy">
                        <KeywordStrategy
                            clusters={clusters}
                            setClusters={setClusters}
                            products={products}
                            setProducts={setProducts}
                            onNext={() => setActiveTab('content')}
                        />
                    </TabsContent>

                    <TabsContent value="content">
                        <ContentEngine
                            clusters={clusters}
                            products={products}
                            apiKey={apiKey}
                            wpCredentials={{ url: wpUrl, user: wpUser, password: wpPassword }}
                            articles={generatedArticles}
                            setArticles={setGeneratedArticles}
                            onNext={() => setActiveTab('pins')}
                        />
                    </TabsContent>

                    <TabsContent value="pins">
                        <PinFactory
                            articles={generatedArticles}
                        />
                    </TabsContent>

                    <TabsContent value="settings">
                        <PromptSettings />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
