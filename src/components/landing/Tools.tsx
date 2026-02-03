import { Check } from "lucide-react";

export default function Tools() {
    return (
        <section id="tools" className="py-20 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">Powerful Tools, One Platform</h2>
                    <p className="text-slate-400 max-w-xl mx-auto">Access all the tools you need to dominate Pinterest marketing.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Tool 1: Bulk Pin Creator */}
                    <div className="group relative bg-gradient-to-br from-yellow-400/10 to-orange-400/10 border border-yellow-400/20 rounded-2xl p-8 hover:border-yellow-400/50 transition overflow-hidden">
                        <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">AVAILABLE</div>
                        <h3 className="text-2xl font-bold text-white mb-3">Bulk Pin Creator</h3>
                        <p className="text-slate-400 mb-6">Generate hundreds of Pinterest pins with AI-powered titles, descriptions, and images. Export as CSV for bulk upload.</p>
                        <ul className="space-y-2 mb-6">
                            <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> AI-generated content</li>
                            <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Batch image generation</li>
                            <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> CSV export with scheduling</li>
                            <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> ImgBB auto-upload</li>
                        </ul>
                    </div>

                    {/* Tool 2: Master Writer */}
                    <div className="group relative bg-gradient-to-br from-indigo-400/10 to-purple-400/10 border border-indigo-400/20 rounded-2xl p-8 hover:border-indigo-400/50 transition overflow-hidden">
                        <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">AVAILABLE</div>
                        <h3 className="text-2xl font-bold text-white mb-3">Master Writer</h3>
                        <p className="text-slate-400 mb-6">Turn keywords into SEO articles and Pinterest assets in 3 simple steps. Research trends, write content, and create pins.</p>
                        <ul className="space-y-2 mb-6">
                            <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Trend Research</li>
                            <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> SEO Article Generation</li>
                            <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Auto-Pin Factory</li>
                            <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> WordPress Integration</li>
                        </ul>
                    </div>

                    {/* Tool 3: Pinterest Scheduler (Coming Soon) */}
                    <div className="group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 opacity-75">
                        <div className="absolute top-4 right-4 bg-slate-600 text-white text-xs font-bold px-3 py-1 rounded-full">COMING SOON</div>
                        <h3 className="text-2xl font-bold text-white mb-3">Pinterest Scheduler</h3>
                        <p className="text-slate-400 mb-6">Schedule your pins for optimal posting times. Automate your Pinterest workflow with smart scheduling.</p>
                        <ul className="space-y-2 mb-6">
                            <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Auto-scheduling</li>
                            <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Best time analysis</li>
                            <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Multi-board support</li>
                        </ul>
                    </div>

                    {/* Tool 3: Coming Soon */}
                    <div className="group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 opacity-75">
                        <div className="absolute top-4 right-4 bg-slate-600 text-white text-xs font-bold px-3 py-1 rounded-full">COMING SOON</div>
                        <h3 className="text-2xl font-bold text-white mb-3">Keyword Research</h3>
                        <p className="text-slate-400 mb-6">Find high-traffic Pinterest keywords to optimize your pins for maximum discoverability.</p>
                        <ul className="space-y-2 mb-6">
                            <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Trending keywords</li>
                            <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Competition analysis</li>
                            <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> SEO suggestions</li>
                        </ul>
                    </div>

                    {/* Tool 4: Coming Soon */}
                    <div className="group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 opacity-75">
                        <div className="absolute top-4 right-4 bg-slate-600 text-white text-xs font-bold px-3 py-1 rounded-full">COMING SOON</div>
                        <h3 className="text-2xl font-bold text-white mb-3">Analytics Dashboard</h3>
                        <p className="text-slate-400 mb-6">Track your Pinterest performance with detailed analytics and insights.</p>
                        <ul className="space-y-2 mb-6">
                            <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Pin performance</li>
                            <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Traffic tracking</li>
                            <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Growth metrics</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
