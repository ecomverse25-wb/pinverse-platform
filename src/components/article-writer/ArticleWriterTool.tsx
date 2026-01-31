"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, FileText, Image as ImageIcon, Layers } from "lucide-react";
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

import { getUser } from "@/lib/supabase";
import { saveUserDataAction, loadUserDataAction } from "@/app/actions/user-data-actions";
import { useEffect } from "react";

export default function ArticleWriterTool() {
    const [activeTab, setActiveTab] = useState("strategy");

    // Load initial data
    useEffect(() => {
        const load = async () => {
            const { user } = await getUser();
            if (user) {
                const data = await loadUserDataAction(user.id);
                if (data.clusters) setClusters(data.clusters);
                if (data.products) setProducts(data.products);
                if (data.articles) setGeneratedArticles(data.articles);
            }
        };
        load();
    }, []);

    const saveData = async (key: string, value: any) => {
        const { user } = await getUser();
        if (user) {
            await saveUserDataAction(user.id, key, value);
        }
    };

    // Wrappers to save on state change
    const updateClusters = (newClusters: KeywordCluster[]) => {
        setClusters(newClusters);
        saveData('clusters', newClusters);
    };

    const updateProducts = (newProducts: Product[]) => {
        setProducts(newProducts);
        saveData('products', newProducts);
    };

    const updateArticles = (newArticles: ArticleData[]) => {
        setGeneratedArticles(newArticles);
        saveData('articles', newArticles);
    };

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
                <TabsList className="grid w-full grid-cols-4 h-14 bg-muted p-1 rounded-lg">
                    <TabsTrigger value="strategy" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-base">
                        <Layers className="w-5 h-5" />
                        1. Strategy & Data
                    </TabsTrigger>
                    <TabsTrigger value="content" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-base">
                        <FileText className="w-5 h-5" />
                        2. Content Engine
                    </TabsTrigger>
                    <TabsTrigger value="pins" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-base">
                        <ImageIcon className="w-5 h-5" />
                        3. Pin Factory
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-base">
                        <Settings className="w-5 h-5" />
                        Settings
                    </TabsTrigger>
                </TabsList>


                <TabsContent value="strategy">
                    <KeywordStrategy
                        clusters={clusters}
                        setClusters={updateClusters}
                        products={products}
                        setProducts={updateProducts}
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
                        setArticles={updateArticles}
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
            </Tabs>
        </div>
    );
}
