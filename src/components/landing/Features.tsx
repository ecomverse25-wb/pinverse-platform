import { Zap, Shield, Users } from "lucide-react";

export default function Features() {
    return (
        <section id="features" className="py-20 px-6 bg-slate-900/50">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">Why Choose PinVerse?</h2>
                    <p className="text-slate-400 max-w-xl mx-auto">Everything you need to scale your Pinterest presence and drive massive organic traffic.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-yellow-400/50 transition">
                        <div className="w-14 h-14 bg-yellow-400/10 rounded-xl flex items-center justify-center mb-6">
                            <Zap className="w-7 h-7 text-yellow-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">AI-Powered Content</h3>
                        <p className="text-slate-400">Generate optimized pin titles, descriptions, and images using advanced AI. Save hours on content creation.</p>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-yellow-400/50 transition">
                        <div className="w-14 h-14 bg-emerald-400/10 rounded-xl flex items-center justify-center mb-6">
                            <Shield className="w-7 h-7 text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Bulk Operations</h3>
                        <p className="text-slate-400">Create and schedule hundreds of pins at once. Export directly to Pinterest with our CSV editor.</p>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-yellow-400/50 transition">
                        <div className="w-14 h-14 bg-purple-400/10 rounded-xl flex items-center justify-center mb-6">
                            <Users className="w-7 h-7 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Built for Creators</h3>
                        <p className="text-slate-400">Designed by Pinterest marketers, for Pinterest marketers. Tools that actually work.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
