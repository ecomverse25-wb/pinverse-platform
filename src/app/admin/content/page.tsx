"use client";

import { useState, useEffect } from "react";
import { getSiteContentAction, updateSiteContentAction, ContentSectionKey } from "@/app/actions/content-actions";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, LayoutTemplate, MessageSquare, Tag, Users, Check } from "lucide-react";

// Types corresponding to our components
import { HeroContent } from "@/components/landing/Hero";
import { FeaturesContent } from "@/components/landing/Features";
import { PricingContent } from "@/components/landing/Pricing";
import { TestimonialsContent } from "@/components/landing/Testimonials";
import { FooterContent } from "@/components/landing/Footer";

// Simple UI Components
const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${active
            ? "bg-yellow-400 text-slate-900"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);

const SectionCard = ({ title, children }: any) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        {children}
    </div>
);

const InputGroup = ({ label, value, onChange, placeholder, type = "text" }: any) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
        {type === "textarea" ? (
            <textarea
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-400 min-h-[100px]"
            />
        ) : (
            <input
                type={type}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-400"
            />
        )}
    </div>
);

export default function ContentEditor() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<ContentSectionKey>('hero');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // State for each section
    const [hero, setHero] = useState<HeroContent>({});
    const [features, setFeatures] = useState<FeaturesContent>({});
    const [pricing, setPricing] = useState<PricingContent>({});
    const [testimonials, setTestimonials] = useState<TestimonialsContent>({});
    const [footer, setFooter] = useState<FooterContent>({});

    // Load initial data
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Fetch all in parallel
                const [h, f, p, t, ft] = await Promise.all([
                    getSiteContentAction('hero'),
                    getSiteContentAction('features'),
                    getSiteContentAction('pricing'),
                    getSiteContentAction('testimonials'),
                    getSiteContentAction('footer')
                ]);

                if (h.content) setHero(h.content);
                if (f.content) setFeatures(f.content);
                if (p.content) setPricing(p.content);
                if (t.content) setTestimonials(t.content);
                if (ft.content) setFooter(ft.content);

            } catch (err) {
                console.error(err);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load content"
                });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            let result;
            let currentContent;

            switch (activeTab) {
                case 'hero': currentContent = hero; break;
                case 'features': currentContent = features; break;
                case 'pricing': currentContent = pricing; break;
                case 'testimonials': currentContent = testimonials; break;
                case 'footer': currentContent = footer; break;
                default: return;
            }

            result = await updateSiteContentAction(activeTab, currentContent);

            if (result.success) {
                toast({
                    variant: "success",
                    title: "Saved",
                    description: `${activeTab.toUpperCase()} updated successfully!`
                });
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: err.message
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-yellow-400" /></div>;

    return (
        <div className="max-w-5xl mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white">Content Editor</h1>
                    <p className="text-slate-400">Manage your landing page text and configuration.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary px-6 py-2 flex items-center gap-2"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Sidebar Tabs */}
                <div className="col-span-3 space-y-2">
                    <TabButton active={activeTab === 'hero'} onClick={() => setActiveTab('hero')} icon={LayoutTemplate} label="Hero Section" />
                    <TabButton active={activeTab === 'features'} onClick={() => setActiveTab('features')} icon={Check} label="Features" />
                    <TabButton active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')} icon={Tag} label="Pricing" />
                    <TabButton active={activeTab === 'testimonials'} onClick={() => setActiveTab('testimonials')} icon={Users} label="Testimonials" />
                    <TabButton active={activeTab === 'footer'} onClick={() => setActiveTab('footer')} icon={MessageSquare} label="Footer" />
                </div>

                {/* Main Content Area */}
                <div className="col-span-9">
                    {activeTab === 'hero' && (
                        <div className="space-y-6">
                            <SectionCard title="Header Content">
                                <InputGroup label="Badge Text" value={hero.badge} onChange={(v: string) => setHero({ ...hero, badge: v })} />
                                <InputGroup label="Primary Title (White)" value={hero.titlePrimary} onChange={(v: string) => setHero({ ...hero, titlePrimary: v })} />
                                <InputGroup label="Secondary Title (Yellow)" value={hero.titleSecondary} onChange={(v: string) => setHero({ ...hero, titleSecondary: v })} />
                                <InputGroup label="Description" type="textarea" value={hero.description} onChange={(v: string) => setHero({ ...hero, description: v })} />
                            </SectionCard>
                            <SectionCard title="Call to Actions">
                                <InputGroup label="Primary Button Text" value={hero.ctaPrimary} onChange={(v: string) => setHero({ ...hero, ctaPrimary: v })} />
                                <InputGroup label="Secondary Button Text" value={hero.ctaSecondary} onChange={(v: string) => setHero({ ...hero, ctaSecondary: v })} />
                            </SectionCard>
                        </div>
                    )}

                    {activeTab === 'features' && (
                        <div className="space-y-6">
                            <SectionCard title="Section Headlines">
                                <InputGroup label="Title" value={features.title} onChange={(v: string) => setFeatures({ ...features, title: v })} />
                                <InputGroup label="Subtitle" value={features.subtitle} onChange={(v: string) => setFeatures({ ...features, subtitle: v })} />
                            </SectionCard>
                            <div className="bg-yellow-400/10 border border-yellow-400/20 p-4 rounded-lg text-yellow-400 text-sm">
                                Note: Feature items editing is currently JSON-only or code-based. Simple text fields provided for headlines.
                            </div>
                        </div>
                    )}

                    {/* Simplified editors for other sections for now - can expand later */}
                    {activeTab === 'pricing' && (
                        <div className="space-y-6">
                            <SectionCard title="Section Headlines">
                                <InputGroup label="Title" value={pricing.title} onChange={(v: string) => setPricing({ ...pricing, title: v })} />
                                <InputGroup label="Subtitle" value={pricing.subtitle} onChange={(v: string) => setPricing({ ...pricing, subtitle: v })} />
                            </SectionCard>
                            <SectionCard title="Footer Link">
                                <InputGroup label="Footer Text" value={pricing.footerText} onChange={(v: string) => setPricing({ ...pricing, footerText: v })} />
                                <InputGroup label="link Text" value={pricing.footerLinkText} onChange={(v: string) => setPricing({ ...pricing, footerLinkText: v })} />
                            </SectionCard>
                        </div>
                    )}

                    {activeTab === 'testimonials' && (
                        <div className="space-y-6">
                            <SectionCard title="Section Headlines">
                                <InputGroup label="Title" value={testimonials.title} onChange={(v: string) => setTestimonials({ ...testimonials, title: v })} />
                            </SectionCard>
                        </div>
                    )}

                    {activeTab === 'footer' && (
                        <div className="space-y-6">
                            <SectionCard title="Brand">
                                <InputGroup label="Brand First Part (White)" value={footer.brandNamePart1} onChange={(v: string) => setFooter({ ...footer, brandNamePart1: v })} />
                                <InputGroup label="Brand Second Part (Yellow)" value={footer.brandNamePart2} onChange={(v: string) => setFooter({ ...footer, brandNamePart2: v })} />
                                <InputGroup label="Description" value={footer.description} onChange={(v: string) => setFooter({ ...footer, description: v })} />
                                <InputGroup label="Copyright Text" value={footer.copyright} onChange={(v: string) => setFooter({ ...footer, copyright: v })} />
                            </SectionCard>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
