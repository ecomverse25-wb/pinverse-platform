"use client";

import Link from "next/link";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="py-12 px-6 border-t border-slate-800">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl font-black text-white">Pin</span>
                            <span className="text-xl font-black text-yellow-400">Verse</span>
                        </div>
                        <p className="text-slate-500 text-sm">Pinterest marketing tools for creators and businesses.</p>
                        <p className="text-slate-600 text-xs mt-4">© {currentYear} Ecomverse LLC. All rights reserved.</p>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Product</h4>
                        <ul className="space-y-2 text-slate-400 text-sm">
                            <li><Link href="#features" className="hover:text-white transition">Features</Link></li>
                            <li><Link href="#tools" className="hover:text-white transition">Tools</Link></li>
                            <li><Link href="#pricing" className="hover:text-white transition">Pricing</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Company</h4>
                        <ul className="space-y-2 text-slate-400 text-sm">
                            <li><Link href="https://ecomverse.study" className="hover:text-white transition">Ecomverse Academy</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Legal</h4>
                        <ul className="space-y-2 text-slate-400 text-sm">
                            <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                            <li><Link href="/refund-policy" className="hover:text-white transition">Refund Policy</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
}
