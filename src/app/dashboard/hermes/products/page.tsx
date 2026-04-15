"use client";

import { useEffect, useState, useCallback } from "react";
import ConfirmModal from "@/components/hermes/ConfirmModal";
import JobMonitor from "@/components/hermes/JobMonitor";
import {
  hermesGet,
  hermesPost,
  hermesDelete,
  formatNumber,
  type Product,
} from "@/components/hermes/utils";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
    </svg>
  );
}

export default function ProductsPage() {
  const [totalProducts, setTotalProducts] = useState(0);
  const [lastSynced, setLastSynced] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync
  const [sitemapUrl, setSitemapUrl] = useState("https://kitchentools4u.com/product-sitemap.xml");
  const [syncing, setSyncing] = useState(false);
  const [syncJobId, setSyncJobId] = useState<string | null>(null);

  // Upload
  const [csvText, setCsvText] = useState("");
  const [uploadNiche, setUploadNiche] = useState("kitchentools4u");
  const [uploading, setUploading] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  // Clear
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Feedback
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(t); }
  }, [message]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 8000); return () => clearTimeout(t); }
  }, [error]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const res = await hermesGet("/products");
    if (res?.error) {
      setError(res.error);
    } else {
      setTotalProducts(res?.total ?? 0);
      setLastSynced(res?.last_synced || "");
      setProducts(res?.sample || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Sync from sitemap
  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setMessage("");
    const res = await hermesPost("/products/sync", { sitemap_url: sitemapUrl });
    if (res.success || res.job_id || res.message?.toLowerCase().includes("start")) {
      setMessage(res.message || `Sync started for ${sitemapUrl}`);
      if (res.job_id) setSyncJobId(res.job_id);
      else {
        setTimeout(() => loadProducts(), 3000);
      }
    } else {
      setError(res.detail || res.error || res.message || "Sync failed — Hermes API returned an error. Check VPS logs.");
    }
    setSyncing(false);
  };

  // Upload CSV
  const handleUpload = async () => {
    if (!csvText.trim()) return;
    setUploading(true);
    try {
      // Parse CSV into product objects
      const lines = csvText.trim().split("\n").filter((l) => l.trim());
      const productList = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return { name: parts[0] || "", url: parts[1] || "", description: parts[2] || "", price: parts[3] || "" };
      });
      const res = await hermesPost("/products/upload", { products: productList, niche: uploadNiche });
      if (res.success) {
        setMessage(`✅ Imported ${res.imported ?? 0} products`);
        setCsvText("");
        loadProducts();
      } else {
        setError(res.detail || res.error || res.message || "Upload failed");
      }
    } catch (err) {
      console.error("[Hermes] Upload error:", err);
      setError(`Upload error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
    }
  };

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await hermesGet(`/products/search?query=${encodeURIComponent(searchQuery)}&limit=10`);
      setSearchResults(res?.products || []);
      if ((res?.products || []).length === 0) setMessage("No products found for that query");
    } catch (err) {
      console.error("[Hermes] Search error:", err);
      setError(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSearching(false);
    }
  };

  // Clear all
  const handleClear = async () => {
    setClearing(true);
    try {
      const res = await hermesDelete("/products/clear");
      if (res.success) {
        setMessage("Product database cleared");
        loadProducts();
      } else {
        setError(res.detail || res.error || res.message || "Clear failed");
      }
    } catch (err) {
      console.error("[Hermes] Clear error:", err);
      setError(`Clear failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setShowClearModal(false);
      setClearing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-yellow-400">📦 Product Management</h1>
        <p className="text-gray-400 text-sm mt-1">Manage the product database for affiliate linking</p>
      </div>

      {/* Feedback */}
      {message && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 text-sm flex items-center justify-between">
          {message}<button onClick={() => setMessage("")} className="ml-2 text-emerald-400 hover:text-white">✕</button>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm flex items-center justify-between">
          {error}<button onClick={() => setError("")} className="ml-2 text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ── Product Stats ──────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 bg-gray-900 border border-gray-800">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Products</p>
          <p className="text-3xl font-bold text-white mt-1">{loading ? "—" : formatNumber(totalProducts)}</p>
        </div>
        <div className="rounded-xl p-5 bg-gray-900 border border-gray-800">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Last Synced</p>
          <p className="text-sm text-white mt-2">{lastSynced ? new Date(lastSynced).toLocaleString() : "Never"}</p>
        </div>
        <div className="rounded-xl p-5 bg-gray-900 border border-gray-800 flex items-center justify-center">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition disabled:opacity-50"
          >
            {loading ? <span className="flex items-center gap-2"><Spinner className="text-gray-400" /> Loading…</span> : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* ── Sync from Sitemap ──────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <h2 className="text-lg font-bold text-white">Sync from Sitemap</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={sitemapUrl}
            onChange={(e) => setSitemapUrl(e.target.value)}
            placeholder="https://kitchentools4u.com/product-sitemap.xml"
            className="flex-1 rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition"
          />
          <button
            onClick={handleSync}
            disabled={syncing || !sitemapUrl.trim()}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {syncing ? <span className="flex items-center gap-2"><Spinner className="text-black" /> Syncing…</span> : "🔄 Sync Now"}
          </button>
        </div>
        {syncJobId && (
          <JobMonitor
            jobId={syncJobId}
            onComplete={() => {
              setSyncJobId(null);
              loadProducts();
            }}
          />
        )}
      </div>

      {/* ── Upload Products CSV ────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <h2 className="text-lg font-bold text-white">Upload Products CSV</h2>
        <p className="text-gray-400 text-sm">Format: name, url, description (optional), price (optional)</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={uploadNiche}
            onChange={(e) => setUploadNiche(e.target.value)}
            className="rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 transition"
          >
            <option value="kitchentools4u">kitchentools4u.com</option>
            <option value="sourcerecipes">sourcerecipes.info</option>
          </select>
        </div>

        {/* File Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-yellow-500", "bg-yellow-500/5"); }}
          onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-yellow-500", "bg-yellow-500/5"); }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-yellow-500", "bg-yellow-500/5");
            const file = e.dataTransfer.files?.[0];
            if (file && (file.name.endsWith(".csv") || file.type === "text/csv" || file.type === "text/plain")) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                const text = ev.target?.result as string;
                setCsvText(text);
                setMessage(`📄 Loaded ${file.name} — ${text.split("\\n").filter(l => l.trim()).length} rows`);
              };
              reader.readAsText(file);
            } else {
              setError("Please drop a .csv file");
            }
          }}
          className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center transition-colors cursor-pointer hover:border-gray-500"
          onClick={() => document.getElementById("csv-file-input")?.click()}
        >
          <input
            id="csv-file-input"
            type="file"
            accept=".csv,.txt,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                const text = ev.target?.result as string;
                setCsvText(text);
                setMessage(`📄 Loaded ${file.name} — ${text.split("\\n").filter(l => l.trim()).length} rows`);
              };
              reader.readAsText(file);
              e.target.value = "";
            }}
          />
          <div className="flex flex-col items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-gray-400 text-sm">
              <span className="text-yellow-400 font-semibold hover:underline">Click to browse</span>
              {" "}or drag & drop a CSV file here
            </p>
            <p className="text-gray-600 text-xs">Supports .csv and .txt files</p>
          </div>
        </div>

        {/* Preview / Manual Edit */}
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={5}
          placeholder="Product Name, https://example.com/product, Description, $29.99"
          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 font-mono focus:outline-none focus:border-yellow-500/50 transition resize-y"
        />

        {/* Row count indicator */}
        {csvText.trim() && (
          <p className="text-gray-500 text-xs">
            {csvText.trim().split("\n").filter(l => l.trim()).length} rows ready to import
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={!csvText.trim() || uploading}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? <span className="flex items-center gap-2"><Spinner className="text-black" /> Uploading…</span> : "⬆ Upload Products"}
        </button>
      </div>

      {/* ── Product Search ─────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <h2 className="text-lg font-bold text-white">Product Search</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. smoothie blender, air fryer..."
            className="flex-1 rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition disabled:opacity-40"
          >
            {searching ? <Spinner className="text-white" /> : "🔍 Search"}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-gray-800/50 border border-gray-800 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">{p.title}</p>
                  <p className="text-gray-500 text-xs truncate">{p.url}</p>
                </div>
                {p.price && <span className="text-emerald-400 text-sm font-semibold ml-3">{p.price}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Product Preview Table ──────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Product Sample</h2>
          <button
            onClick={loadProducts}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:text-white border border-gray-700 transition disabled:opacity-50"
          >
            Refresh Sample
          </button>
        </div>

        {products.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No products in database.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left pb-2 font-medium">Product Name</th>
                  <th className="text-left pb-2 font-medium">URL</th>
                  <th className="text-right pb-2 font-medium">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {products.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-800/30 transition">
                    <td className="py-2 text-white font-medium">{p.title}</td>
                    <td className="py-2 text-gray-400 text-xs truncate max-w-[200px]">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400">{p.url}</a>
                    </td>
                    <td className="py-2 text-right text-emerald-400">{p.price || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Danger Zone ────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-red-500/20 p-5 space-y-3">
        <h3 className="text-sm font-bold text-red-400">⚠️ Danger Zone</h3>
        <p className="text-gray-400 text-sm">
          Clear the entire product database. Articles generated after clearing will have no products to recommend.
        </p>
        <button
          onClick={() => setShowClearModal(true)}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-500/20 transition"
        >
          Clear All Products
        </button>
      </div>

      <ConfirmModal
        open={showClearModal}
        title="Clear all products?"
        message={`This will delete all ${formatNumber(totalProducts)} products from the database.`}
        consequences={[
          "All product data will be permanently removed",
          "Articles generated after clearing will have no products to recommend",
          "You'll need to sync again from the sitemap",
        ]}
        confirmLabel="Clear Database"
        confirmVariant="danger"
        onConfirm={handleClear}
        onCancel={() => setShowClearModal(false)}
        loading={clearing}
      />
    </div>
  );
}
