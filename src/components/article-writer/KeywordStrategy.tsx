/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";


import { useState, useEffect } from "react";
import Papa from "papaparse";
import { KeywordCluster, Product } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowRight, Save, Database, Trash2 } from "lucide-react";
import { saveKeywordFileAction, getUserKeywordsAction, deleteKeywordFileAction, saveProductsAction, DBKeywordFile } from "@/app/actions/user-actions";
import { useToast } from "@/components/ui/use-toast";

interface KeywordStrategyProps {
    clusters: KeywordCluster[];
    setClusters: (clusters: KeywordCluster[]) => void;
    products: Product[];
    setProducts: (products: Product[]) => void;
    onNext: () => void;
}

export default function KeywordStrategy({ clusters, setClusters, products, setProducts, onNext }: KeywordStrategyProps) {
    const [loading, setLoading] = useState(false);
    const [savedFiles, setSavedFiles] = useState<DBKeywordFile[]>([]);
    const [status, setStatus] = useState("");
    const { toast } = useToast();

    // Load saved files on mount
    useEffect(() => {
        loadSavedFiles();
    }, []);

    const loadSavedFiles = async () => {
        try {
            const result = await getUserKeywordsAction();
            if (result.success && result.data) {
                setSavedFiles(result.data);
            } else {
                console.error("Failed to load user files", result.error);
            }
        } catch (e) {
            console.error("Failed to load user files", e);
        }
    };

    const handleKeywordUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setStatus("Parsing CSV...");
        Papa.parse(file, {
            complete: async (results) => {
                const rawKeywords = results.data.flat().filter(k => typeof k === 'string' && k.length > 2) as string[];
                const newClusters = simpleCluster(rawKeywords);
                setClusters(newClusters);
                setLoading(false);
                setStatus("Clustered! Saving to DB...");

                // Auto-save to DB
                try {
                    const result = await saveKeywordFileAction(file.name, newClusters);
                    if (result.success) {
                        await loadSavedFiles();
                        setStatus("Saved to Database!");
                        toast({ title: "Saved", description: "Keywords saved to database.", variant: "success" });
                    } else {
                        throw new Error(result.error);
                    }
                } catch (e) {
                    console.error("Failed to save", e);
                    setStatus("Error saving to DB");
                    toast({ title: "Save Failed", description: "Could not save keywords.", variant: "destructive" });
                }
            },
            header: false,
            skipEmptyLines: true
        });
    };

    const handleLoadFile = (file: DBKeywordFile) => {
        setClusters(file.content);
        setStatus(`Loaded ${file.filename}`);
    };

    const handleDeleteFile = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this file?")) return;
        try {
            const result = await deleteKeywordFileAction(id);
            if (result.success) {
                await loadSavedFiles();
                toast({ title: "Deleted", description: "File deleted.", variant: "success" });
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Delete failed.", variant: "destructive" });
        }
    };

    const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            complete: async (results) => {
                const parsedProducts: Product[] = results.data.map((row: unknown) => {
                    // Type assertion for row as it comes from Papa Parse
                    const r = row as Record<string, string> | string[];
                    return {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any

                        name: (r as any)['Name'] || (r as any)['name'] || (Array.isArray(r) ? r[0] : ''),
                        link: (r as any)['Link'] || (r as any)['link'] || (Array.isArray(r) ? r[1] : ''),
                        image: (r as any)['Image_URL'] || (r as any)['image_url'] || (r as any)['Image'] || (Array.isArray(r) ? r[2] : ''),

                    };
                }).filter((p: Product) => p.name && p.link);

                setProducts(parsedProducts);

                try {
                    const result = await saveProductsAction(parsedProducts, file.name);
                    if (result.success) {
                        setStatus(`Uploaded ${parsedProducts.length} products to DB`);
                        toast({ title: "Success", description: `${parsedProducts.length} products saved to DB.`, variant: "success" });
                    } else {
                        throw new Error(result.error);
                    }
                } catch (e) {
                    console.error("Product save failed", e);
                    toast({ title: "Save Failed", description: "Could not save products.", variant: "destructive" });
                }
            },
            header: true,
            skipEmptyLines: true
        });
    };

    // A very basic text clustering function
    const simpleCluster = (keywords: string[]): KeywordCluster[] => {
        const clusters: Record<string, string[]> = {};

        keywords.forEach(keyword => {
            const clean = keyword.toLowerCase().trim();
            const words = clean.split(' ');
            const topic = words.slice(0, 2).join(' ');

            if (!clusters[topic]) {
                clusters[topic] = [];
            }
            clusters[topic].push(keyword);
        });

        return Object.entries(clusters)
            .map(([topic, kws]) => ({ topic: topic.toUpperCase(), keywords: kws }))
            .sort((a, b) => b.keywords.length - a.keywords.length);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            1. Keywords Data
                        </div>
                        {status && <Badge variant="outline" className="text-xs">{status}</Badge>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                    {/* Saved Files List */}
                    {savedFiles.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Database className="w-4 h-4" /> Your Saved Lists
                            </h4>
                            <ScrollArea className="h-32 border rounded-md">
                                <div className="p-2 space-y-1">
                                    {savedFiles.map(file => (
                                        <div
                                            key={file.id}
                                            onClick={() => handleLoadFile(file)}
                                            className="flex justify-between items-center p-2 text-sm hover:bg-secondary cursor-pointer rounded group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Save className="w-3 h-3 text-muted-foreground" />
                                                <span>{file.filename}</span>
                                                <span className="text-xs text-muted-foreground">({new Date(file.created_at).toLocaleDateString()})</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500"
                                                onClick={(e) => handleDeleteFile(file.id, e)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:bg-slate-50/5 cursor-pointer relative shrink-0">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleKeywordUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="space-y-2">
                            <p className="font-medium">Upload New CSV</p>
                            <p className="text-xs text-muted-foreground">Appends to your database</p>
                        </div>
                    </div>

                    {loading && <p className="text-sm text-center animate-pulse">Clustering keywords...</p>}

                    {clusters.length > 0 && (
                        <div className="bg-secondary/20 p-4 rounded-md flex-1 min-h-[150px] overflow-y-auto">
                            <h4 className="font-semibold mb-2">Active Clusters ({clusters.length})</h4>
                            <ul className="space-y-2 text-sm">
                                {clusters.map((c, i) => (
                                    <li key={i} className="flex justify-between p-2 bg-background rounded border">
                                        <span>{c.topic}</span>
                                        <span className="text-muted-foreground">{c.keywords.length} kw</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        2. Product Database
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:bg-slate-50/5 cursor-pointer relative shrink-0">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleProductUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="space-y-2">
                            <p className="font-medium">Upload Products CSV</p>
                            <p className="text-xs text-muted-foreground">Headers: Name, Link, Image_URL</p>
                        </div>
                    </div>

                    {products.length > 0 && (
                        <div className="bg-secondary/20 p-4 rounded-md flex-1">
                            <h4 className="font-semibold mb-2">Active Session Products</h4>
                            <p className="text-4xl font-bold text-green-500">{products.length}</p>
                            <p className="text-sm text-muted-foreground mt-2">These products are ready for matching in the Content Engine.</p>
                        </div>
                    )}

                    <div className="pt-4 mt-auto flex justify-end">
                        <Button
                            onClick={onNext}
                            disabled={clusters.length === 0}
                            className="w-full md:w-auto"
                        >
                            Continue to Content Engine <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
