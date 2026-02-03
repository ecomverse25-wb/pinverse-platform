import { Star } from "lucide-react";

export default function Testimonials() {
    return (
        <section className="py-20 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">Loved by Pinterest Marketers</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <div className="flex gap-1 mb-4">
                            {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                        </div>
                        <p className="text-slate-300 mb-4">&quot;PinVerse saved me hours every week. I can now create a month&apos;s worth of pins in under an hour!&quot;</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center text-yellow-400 font-bold">S</div>
                            <div>
                                <p className="text-white font-medium">Sarah M.</p>
                                <p className="text-slate-500 text-sm">Food Blogger</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <div className="flex gap-1 mb-4">
                            {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                        </div>
                        <p className="text-slate-300 mb-4">&quot;The AI-generated content is surprisingly good. My Pinterest traffic has grown 300% since I started using PinVerse.&quot;</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-400/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">M</div>
                            <div>
                                <p className="text-white font-medium">Michael R.</p>
                                <p className="text-slate-500 text-sm">E-commerce Owner</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <div className="flex gap-1 mb-4">
                            {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                        </div>
                        <p className="text-slate-300 mb-4">&quot;Finally, a Pinterest tool that actually works! The bulk creation feature is a game-changer for my agency.&quot;</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-400/20 rounded-full flex items-center justify-center text-purple-400 font-bold">J</div>
                            <div>
                                <p className="text-white font-medium">Jessica L.</p>
                                <p className="text-slate-500 text-sm">Marketing Agency</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
