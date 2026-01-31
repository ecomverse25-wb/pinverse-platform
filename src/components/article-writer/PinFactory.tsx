"use client";

import { useState } from "react";
import { ArticleData } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, Image as ImageIcon } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useToast } from "@/components/ui/use-toast";

interface PinFactoryProps {
    articles: ArticleData[];
}

interface PinResult {
    articleTitle: string;
    pinTitle: string;
    pinDescription: string;
    destinationLink: string;
    imageBlob: Blob;
    imageName: string;
}

export default function PinFactory({ articles }: PinFactoryProps) {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<PinResult[]>([]);
    const [currentAction, setCurrentAction] = useState("");
    const { toast } = useToast();

    const processImages = async () => {
        setProcessing(true);
        setResults([]);
        toast({ title: "Started", description: "Generating Pinterest assets..." });

        const generatedResults: PinResult[] = [];
        const total = articles.length;

        try {
            for (let i = 0; i < total; i++) {
                const article = articles[i];
                if (!article.heroImage) continue;

                // Update Status
                setCurrentAction(`Processing: ${article.topic}`);
                setProgress(((i) / total) * 100);

                // 1. Generate Metadata
                const pinTitle = article.title;
                const pinDesc = article.topic;

                // TODO: In a real app, we might call AI here to optimize for Pinterest specifically.
                // For speed/prototype, we'll reuse the Article title or do a quick rule-based generic.

                // 2. Generate Image (Canvas)
                const blob = await generatePinCanvas(article.heroImage);
                if (blob) {
                    generatedResults.push({
                        articleTitle: article.title,
                        pinTitle: pinTitle,
                        pinDescription: `Check out our guide on ${article.topic}! ${pinDesc}`,
                        destinationLink: article.wpLink || "https://mysite.com",
                        imageBlob: blob,
                        imageName: `pin_${i + 1}_${article.topic.replace(/\s+/g, '-')}.jpg`
                    });
                }
            }

            setResults(generatedResults);
            setProgress(100);
            setCurrentAction("Done! Ready to Download.");
            toast({ title: "Success", description: `${generatedResults.length} Pins created!`, variant: "success" });

        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            setCurrentAction(`Error: ${msg}`);
            toast({ title: "Generation Failed", description: msg, variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };

    const generatePinCanvas = (imageUrl: string): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1000;
            canvas.height = 1500;

            if (!ctx) return resolve(null);

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                // 1. Draw Blurred Background
                ctx.filter = 'blur(30px)';
                // Draw image to fill canvas (cover)
                const ratio = Math.max(canvas.width / img.width, canvas.height / img.height);
                const centerShift_x = (canvas.width - img.width * ratio) / 2;
                const centerShift_y = (canvas.height - img.height * ratio) / 2;
                ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);

                // Reset filter
                ctx.filter = 'none';

                // 2. Draw Main Image (Centered, max 900px width)
                // Maintain aspect ratio
                const targetWidth = 900;
                const scale = targetWidth / img.width;
                const targetHeight = img.height * scale;

                const x = (canvas.width - targetWidth) / 2;
                const y = (canvas.height - targetHeight) / 2;

                // Add simple shadow
                ctx.shadowColor = "rgba(0,0,0,0.5)";
                ctx.shadowBlur = 20;
                ctx.drawImage(img, x, y, targetWidth, targetHeight);

                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
            };
            img.onerror = () => {
                console.warn("Could not load image for canvas", imageUrl);
                resolve(null);
            };
            img.src = imageUrl;
        });
    };

    const downloadZip = async () => {
        const zip = new JSZip();

        // CSV Content
        let csv = "Title,Description,Destination Link,Image Filename\n";
        results.forEach(r => {
            // Escape quotes for CSV
            const t = r.pinTitle.replace(/"/g, '""');
            const d = r.pinDescription.replace(/"/g, '""');
            csv += `"${t}","${d}","${r.destinationLink}","images/${r.imageName}"\n`;
        });

        zip.file("pinterest_bulk.csv", csv);

        const imgFolder = zip.folder("images");
        results.forEach(r => {
            imgFolder?.file(r.imageName, r.imageBlob);
        });

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "pin_lions_bulk_export.zip");
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-slate-950">
                <CardHeader>
                    <CardTitle>Pin Factory Queue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        Ready to process <strong>{articles.filter(a => a.heroImage).length}</strong> articles with images.
                    </div>

                    {processing && (
                        <div className="space-y-2">
                            <Progress value={progress} />
                            <p className="text-xs text-center animate-pulse">{currentAction}</p>
                        </div>
                    )}

                    <Button
                        onClick={processImages}
                        disabled={processing || articles.length === 0}
                        className="w-full"
                    >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                        Generate Pins
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-950">
                <CardHeader>
                    <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {results.length > 0 ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200 text-center">
                                <h3 className="font-bold text-lg">{results.length} Pins Created!</h3>
                                <p className="text-sm">Ready for export.</p>
                            </div>
                            <Button onClick={downloadZip} variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                                <Download className="w-4 h-4 mr-2" />
                                Download ZIP Package
                            </Button>
                        </div>
                    ) : (
                        <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
                            Waiting for generation...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
