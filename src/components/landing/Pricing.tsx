"use client";

import Link from "next/link";
import { Check } from "lucide-react";

export default function Pricing() {
    return (
        <section id="pricing" className="py-20 px-6 bg-slate-900/50">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
                    <p className="text-slate-400 max-w-xl mx-auto">Choose the plan that fits your Pinterest marketing needs.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {/* Free Trial */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                        <h3 className="text-xl font-bold text-white mb-2">Free Trial</h3>
                        <p className="text-slate-400 text-sm mb-6">Try all features for 7 days</p>
                        <div className="mb-6">
                            <span className="text-4xl font-black text-white">$0</span>
                            <span className="text-slate-400">/7 days</span>
                        </div>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> All tools access</li>
                            <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> 10 pins limit</li>
                            <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Basic support</li>
                        </ul>
                        <Link href="/signup" className="block w-full btn-secondary text-center">Start Free Trial</Link>
                    </div>

                    {/* Starter */}
                    <div className="bg-gradient-to-b from-yellow-400/10 to-transparent border-2 border-yellow-400 rounded-2xl p-8 relative">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</div>
                        <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
                        <p className="text-slate-400 text-sm mb-6">For individual creators</p>
                        <div className="mb-6">
                            <span className="text-4xl font-black text-white">$29</span>
                            <span className="text-slate-400">/month</span>
                        </div>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> 2 tools access</li>
                            <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> 100 pins/month</li>
                            <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Priority support</li>
                            <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> CSV export</li>
                        </ul>
                        <Link href="/signup?plan=starter" className="block w-full btn-primary text-center">Get Started</Link>
                    </div>

                    {/* Pro */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                        <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
                        <p className="text-slate-400 text-sm mb-6">For power users & agencies</p>
                        <div className="mb-6">
                            <span className="text-4xl font-black text-white">$59</span>
                            <span className="text-slate-400">/month</span>
                        </div>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> All tools access</li>
                            <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Unlimited pins</li>
                            <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Priority support</li>
                            <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Early access to new tools</li>
                        </ul>
                        <Link href="/signup?plan=pro" className="block w-full btn-accent text-center">Go Pro</Link>
                    </div>
                </div>

                <p className="text-center text-slate-500 mt-8 text-sm">
                    Are you an Ecomverse member? <Link href="/signup?coupon=ECOMVERSE100" className="text-yellow-400 hover:underline">Get free access here</Link>
                </p>
            </div>
        </section>
    );
}
