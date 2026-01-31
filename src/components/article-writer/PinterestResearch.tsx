"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Search, PlusCircle, ExternalLink } from "lucide-react";
import { getPinterestTrendsAction, searchPinterestIdeasAction } from "@/app/actions/pinterest-actions";
import { KeywordCluster } from "./ArticleWriterTool";
import { toast } from "@/components/ui/use-toast";

interface PinterestResearchProps {
    pinterestToken: string;
    onAddKeywords: (keywords: string[]) => void;
}

export default function PinterestResearch({ pinterestToken, onAddKeywords }: PinterestResearchProps) {
    const [topic, setTopic] = useState("");
    const [loading, setLoading] = useState(false);
    const [trends, setTrends] = useState<{ term: string; growth: number; domain: string }[]>([]);
    const [pinIdeas, setPinIdeas] = useState<{ id: string; title: string; image: string; link: string }[]>([]);

    const handleSearch = async () => {
        if (!topic.trim()) return;
        setLoading(true);

        try {
            // 1. Get Trends
            const trendResult = await getPinterestTrendsAction(pinterestToken);
            if (trendResult.success && trendResult.data) {
                // Filter mock data for demo if needed, or use real API result
                setTrends(trendResult.data.trends);
            }

            // 2. Get Visual Ideas
            const ideasResult = await searchPinterestIdeasAction(pinterestToken, topic);
            if (ideasResult.success && ideasResult.data) {
                setPinIdeas(ideasResult.data);
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to fetch research data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAddTrend = (term: string) => {
        onAddKeywords([term]);
        toast({ title: "Added", description: `Added "${term}" to your strategy.`, variant: "default" });
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Research Topic / Niche</label>
                    <Input
                        placeholder="e.g. Home Decor, Summer Fashion"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch} disabled={loading || !topic} className="mb-[2px]">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    Analyze Trends
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trends Column */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="w-5 h-5 text-pink-500" />
                            Trending Now
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {trends.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                Enter a topic to see what's trending on Pinterest.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {trends.map((trend, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                        <div>
                                            <p className="font-medium">{trend.term}</p>
                                            <Badge variant="secondary" className="text-[10px] mt-1">{trend.domain}</Badge>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-green-500">+{trend.growth}%</span>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={() => handleAddTrend(trend.term)}>
                                                <PlusCircle className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Visual Inspiration Column */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ExternalLink className="w-5 h-5 text-blue-500" />
                            Viral Inspiration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pinIdeas.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                Search to see top performing pins in this niche.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {pinIdeas.map((pin) => (
                                    <div key={pin.id} className="group relative rounded-lg overflow-hidden border aspect-[2/3]">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={pin.image} alt={pin.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                                            <p className="text-white text-xs font-medium line-clamp-2">{pin.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
