"use client";

import { useEffect, useState, useCallback } from "react";
import ConfirmModal from "@/components/hermes/ConfirmModal";
import {
  hermesGet,
  hermesPost,
  hermesDelete,
  formatNumber,
  type Site,
  type KeywordItem,
} from "@/components/hermes/utils";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
    </svg>
  );
}

export default function KeywordsPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedNiche, setSelectedNiche] = useState("");
  const [kwStats, setKwStats] = useState<{ available: number; used: number; total: number } | null>(null);
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kwLoading, setKwLoading] = useState(false);

  // Upload
  const [csvText, setCsvText] = useState("");
  const [uploading, setUploading] = useState(false);

  // Filter / Pagination
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "used">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Reset modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Feedback
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(t); }
  }, [message]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 8000); return () => clearTimeout(t); }
  }, [error]);

  // Load sites
  useEffect(() => {
    (async () => {
      const res = await hermesGet("/sites");
      if (res?.error) {
        setError(res.error);
      } else {
        const siteList = res?.sites || [];
        setSites(siteList);
        if (siteList.length > 0 && !selectedNiche) {
          setSelectedNiche(siteList[0].niche_id);
        }
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load keywords when niche changes
  const loadKeywords = useCallback(async () => {
    if (!selectedNiche) return;
    setKwLoading(true);
    const [statsRes, listRes] = await Promise.allSettled([
      hermesGet(`/keywords/${selectedNiche}`),
      hermesGet(`/keywords/${selectedNiche}/list?limit=500${statusFilter === "all" ? "" : `&status=${statusFilter}`}`),
    ]);
    if (statsRes.status === "fulfilled" && !statsRes.value?.error) {
      setKwStats({
        available: statsRes.value.available ?? 0,
        used: statsRes.value.used ?? 0,
        total: statsRes.value.total ?? 0,
      });
    }
    if (listRes.status === "fulfilled" && !listRes.value?.error) {
      setKeywords(listRes.value?.keywords || []);
    }
    setKwLoading(false);
  }, [selectedNiche, statusFilter]);

  useEffect(() => {
    loadKeywords();
    setPage(0);
  }, [loadKeywords]);

  // Upload CSV
  const uploadKeywords = async () => {
    if (!csvText.trim() || !selectedNiche) return;
    setUploading(true);
    const res = await hermesPost(`/keywords/${selectedNiche}/upload`, {
      csv_content: csvText,
      filename: `pinclicks_${selectedNiche}_${Date.now()}.csv`,
    });
    if (res.success) {
      setMessage(`✅ Imported ${res.imported ?? res.keyword_count ?? 0} keywords for ${selectedNiche}${res.skipped ? ` (${res.skipped} skipped)` : ""}`);
      setCsvText("");
      loadKeywords();
    } else {
      setError(res.detail || res.error || res.message || "Upload failed");
    }
    setUploading(false);
  };

  // Reset keywords
  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await hermesDelete(`/keywords/${selectedNiche}/reset`);
      if (res.success) {
        setMessage(`Keywords for ${selectedNiche} reset to available`);
        loadKeywords();
      } else {
        setError(res.detail || res.error || res.message || "Reset failed");
      }
    } catch (err) {
      setError(`Reset failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setShowResetModal(false);
      setResetting(false);
    }
  };

  // File drop handler
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCsvText(ev.target?.result as string || "");
      reader.readAsText(file);
    }
  };

  // Filtered + paginated keywords
  const filteredKw = keywords.filter((k) =>
    !searchQuery || k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredKw.length / PAGE_SIZE);
  const displayedKw = filteredKw.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const usedPct = kwStats ? (kwStats.total > 0 ? (kwStats.used / kwStats.total) * 100 : 0) : 0;
  const daysLeft = kwStats && kwStats.used > 0
    ? Math.round(kwStats.available / Math.max(kwStats.used / 30, 1))
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner className="text-yellow-400" />
        <span className="ml-3 text-gray-400 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-yellow-400">🔑 Keyword Management</h1>
        <p className="text-gray-400 text-sm mt-1">Upload and manage keywords for each site</p>
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

      {/* ── Site Selector ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {sites.map((site) => (
          <button
            key={site.niche_id}
            onClick={() => setSelectedNiche(site.niche_id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
              selectedNiche === site.niche_id
                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                : "bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {site.name || site.niche_id}
          </button>
        ))}
      </div>

      {/* ── Keyword Stats ──────────────────────────────────────────────── */}
      {kwStats && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{formatNumber(kwStats.available)}</p>
              <p className="text-gray-500 text-xs">Available</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-400">{formatNumber(kwStats.used)}</p>
              <p className="text-gray-500 text-xs">Used</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{formatNumber(kwStats.total)}</p>
              <p className="text-gray-500 text-xs">Total</p>
            </div>
            {daysLeft !== null && (
              <div className="ml-auto text-right">
                <p className="text-sm text-gray-400">
                  At current rate, keywords last <b className="text-white">{daysLeft}</b> more days
                </p>
              </div>
            )}
          </div>
          <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(100 - usedPct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Upload Keywords ────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-bold text-yellow-400">📋 Upload Keywords</h2>
        <p className="text-gray-400 text-sm">
          Export from PinClicks.com — Format: ID, Label, URL, Search Volume, Followers
        </p>

        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-yellow-500/30 transition cursor-pointer"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".csv,.txt";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => setCsvText(ev.target?.result as string || "");
                reader.readAsText(file);
              }
            };
            input.click();
          }}
        >
          <p className="text-gray-400 text-sm">Drop your PinClicks CSV here or click to browse</p>
          <p className="text-gray-600 text-xs mt-1">Or paste CSV content below</p>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={5}
          placeholder="Paste PinClicks CSV content here..."
          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 font-mono focus:outline-none focus:border-yellow-500/50 transition resize-y"
        />

        <button
          onClick={uploadKeywords}
          disabled={!csvText.trim() || uploading}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? <span className="flex items-center gap-2"><Spinner className="text-black" /> Uploading…</span> : "⬆ Upload Keywords"}
        </button>
      </div>

      {/* ── Keyword List ───────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h2 className="text-lg font-bold text-white">Keywords</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Search keywords…"
              className="rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition w-48"
            />
            {(["all", "available", "used"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setStatusFilter(f); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                  statusFilter === f
                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                    : "bg-gray-800 text-gray-400 border-gray-700 hover:text-white"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {kwLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="text-yellow-400" /><span className="ml-3 text-gray-400 text-sm">Loading keywords…</span>
          </div>
        ) : displayedKw.length === 0 ? (
          <p className="text-gray-500 text-sm py-6 text-center">No keywords found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                    <th className="text-left pb-2 font-medium">Keyword</th>
                    <th className="text-right pb-2 font-medium">Volume</th>
                    <th className="text-right pb-2 font-medium">Followers</th>
                    <th className="text-center pb-2 font-medium">Status</th>
                    <th className="text-right pb-2 font-medium">Used At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {displayedKw.map((kw, i) => (
                    <tr key={kw.id || i} className="hover:bg-gray-800/30 transition">
                      <td className="py-2 text-white">{kw.keyword}</td>
                      <td className="py-2 text-right text-gray-400">{formatNumber(kw.search_volume)}</td>
                      <td className="py-2 text-right text-gray-400">{formatNumber(kw.followers)}</td>
                      <td className="py-2 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          kw.status === "available"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-gray-700 text-gray-400"
                        }`}>
                          {kw.status}
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-500 text-xs">{kw.used_at || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-gray-500 text-xs">
                  Page {page + 1} of {totalPages} ({formatNumber(filteredKw.length)} keywords)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 rounded-lg text-xs bg-gray-800 text-gray-400 hover:text-white transition disabled:opacity-30"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded-lg text-xs bg-gray-800 text-gray-400 hover:text-white transition disabled:opacity-30"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bulk Actions ───────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-red-500/10 p-5">
        <h3 className="text-sm font-bold text-red-400 mb-3">Bulk Actions</h3>
        <button
          onClick={() => setShowResetModal(true)}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-500/20 transition"
        >
          Reset All Keywords (mark as available)
        </button>
      </div>

      <ConfirmModal
        open={showResetModal}
        title="Reset all keywords?"
        message={`This will mark all keywords for "${selectedNiche}" as available again.`}
        consequences={["All 'used' keywords will be marked as 'available'", "Previously generated articles are NOT affected"]}
        confirmLabel="Reset Keywords"
        confirmVariant="warning"
        onConfirm={handleReset}
        onCancel={() => setShowResetModal(false)}
        loading={resetting}
      />
    </div>
  );
}
