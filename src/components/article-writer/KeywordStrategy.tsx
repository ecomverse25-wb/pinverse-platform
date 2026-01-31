/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";


import { useState, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { KeywordCluster, Product } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowRight, Save, Database, Trash2, FileSpreadsheet } from "lucide-react";
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
                    const msg = e instanceof Error ? e.message : "Unknown error";
                    const time = new Date().toLocaleTimeString();
                    toast({ title: `Save Failed (${time})`, description: msg, variant: "destructive" });
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

    const processProductData = async (data: any[], filename: string) => {
        // Helper to safely get value from object with case-insensitive check
        const getValue = (obj: any, keys: string[]) => {
            if (Array.isArray(obj)) return undefined;
            for (const key of keys) {
                const val = obj[key];
                if (val !== undefined && val !== null && val !== '') return String(val).trim();

                const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
                if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) return String(obj[foundKey]).trim();
            }
            return '';
        };

        const parsedProducts: Product[] = data.map((row: any) => {
            const name = getValue(row, ['name', 'product name', 'title', 'product_name']) || (Array.isArray(row) ? String(row[0] || '') : '');
            const link = getValue(row, ['link', 'url', 'product link', 'product_url', 'affiliate_link']) || (Array.isArray(row) ? String(row[1] || '') : '');
            const image = getValue(row, ['image', 'image_url', 'image url', 'img', 'src']) || (Array.isArray(row) ? String(row[2] || '') : '');

            return { name, link, image };
        }).filter((p: Product) => p.name && p.name.length > 1); // Loosened validation

        if (parsedProducts.length === 0) {
            toast({ title: "No Products Found", description: "Could not identify products. Check headers: Name, Link, Image.", variant: "destructive" });
            return;
        }

        setProducts(parsedProducts);

        try {
            const result = await saveProductsAction(parsedProducts, filename);
            if (result.success) {
                setStatus(`Uploaded ${parsedProducts.length} products to DB`);
                toast({ title: "Success", description: `${parsedProducts.length} products saved to DB.`, variant: "success" });
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error("Product save failed", e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            const time = new Date().toLocaleTimeString();
            toast({ title: `Save Failed (${time})`, description: msg, variant: "destructive" });
        }
    };

    const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        if (isExcel) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                processProductData(data, file.name);
            };
            reader.readAsBinaryString(file);
        } else {
            // CSV Fallback
            Papa.parse(file, {
                complete: (results) => {
                    processProductData(results.data, file.name);
                },
                header: true,
                skipEmptyLines: true
            });
        }
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
            <Card className="flex flex-col h-full bg-white dark:bg-slate-950">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            1. Keywords Data
                        </div>
                        {status && <Badge variant="outline" className="text-xs bg-white">{status}</Badge>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                    {/* Saved Files List */}
                    {savedFiles.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Database className="w-4 h-4" /> Your Saved Lists
                            </h4>
                            <ScrollArea className="h-32 border rounded-md bg-white text-slate-900">
                                <div className="p-2 space-y-1">
                                    {savedFiles.map(file => (
                                        <div
                                            key={file.id}
                                            onClick={() => handleLoadFile(file)}
                                            className="flex justify-between items-center p-2 text-sm hover:bg-slate-100 cursor-pointer rounded group transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Save className="w-3 h-3 text-slate-500" />
                                                <span>{file.filename}</span>
                                                <span className="text-xs text-slate-400">({new Date(file.created_at).toLocaleDateString()})</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50"
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

                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 cursor-pointer relative shrink-0 transition-colors bg-white">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleKeywordUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="space-y-2">
                            <p className="font-medium text-slate-900">Upload New CSV</p>
                            <p className="text-xs text-slate-500">Appends to your database</p>
                        </div>
                    </div>

                    {loading && <p className="text-sm text-center animate-pulse text-slate-600">Clustering keywords...</p>}

                    {clusters.length > 0 && (
                        <div className="bg-slate-50 p-4 rounded-md flex-1 min-h-[150px] overflow-y-auto border border-slate-100">
                            <h4 className="font-semibold mb-2 text-slate-900">Active Clusters ({clusters.length})</h4>
                            <ul className="space-y-2 text-sm">
                                {clusters.map((c, i) => (
                                    <li key={i} className="flex justify-between p-2 bg-white rounded border border-slate-200 shadow-sm">
                                        <span className="text-slate-800">{c.topic}</span>
                                        <span className="text-slate-400">{c.keywords.length} kw</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="flex flex-col h-full bg-white dark:bg-slate-950">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        2. Product Database
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 cursor-pointer relative shrink-0 transition-colors bg-white">
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            onChange={handleProductUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="space-y-2">
                            <p className="font-medium text-slate-900">Upload Products</p>
                            <p className="text-xs text-slate-500">Supports CSV, Excel (.xlsx, .xls)</p>
                            <p className="text-xs text-slate-400">Headers: Name, Link, Image</p>
                        </div>
                    </div>

                    {products.length > 0 ? (
                        <div className="bg-green-50 p-6 rounded-md flex-1 flex flex-col items-center justify-center border border-green-100">
                            <h4 className="font-semibold mb-2 text-green-800">Active Session Products</h4>
                            <p className="text-5xl font-bold text-green-600 my-4">{products.length}</p>
                            <p className="text-sm text-green-700 text-center">Ready for matching in Content Engine.</p>
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-6 rounded-md flex-1 flex items-center justify-center border border-slate-100 text-slate-400 text-sm">
                            <p>No products loaded yet.</p>
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
