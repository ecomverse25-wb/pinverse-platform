"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Check } from "lucide-react";

export default function Hero() {
    return (
        <section className="pt-32 pb-20 px-6">
            <div className="max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-2 mb-8">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400 font-medium">AI-Powered Pinterest Tools</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
                    Dominate Pinterest<br />
                    <span className="text-yellow-400">Without the Guesswork</span>
                </h1>

                <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
                    Create stunning pins in bulk, schedule content automatically, and grow your Pinterest traffic with our suite of AI-powered marketing tools.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/signup" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
                        Start Free Trial <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link href="#tools" className="btn-secondary text-lg px-8 py-4">
                        Explore Tools
                    </Link>
                </div>

                <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>7-day free trial</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>No credit card required</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Cancel anytime</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
