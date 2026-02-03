import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Tools from "@/components/landing/Tools";
import Pricing from "@/components/landing/Pricing";
import Testimonials from "@/components/landing/Testimonials";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Navbar />
      <Hero />
      <Features />
      <Tools />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
