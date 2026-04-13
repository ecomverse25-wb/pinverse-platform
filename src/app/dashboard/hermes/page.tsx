"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NicheStats {
  keywords_available: number;
  keywords_used: number;
  error?: string;
}

interface Stats {
  date: string;
  products: number;
  niches: Record<string, NicheStats>;
  budget: {
    spent_today: number;
    daily_limit: number;
    percent_used: number;
  };
}

interface Draft {
  id: number;
  title: string;
  edit_url: string;
  date: string;
  featured_media: number;
}

interface JobStatus {
  status: "running" | "complete" | "failed";
  job_id: string;
  keyword: string;
  output: string;
  errors: string;
}

// ─── Niche options ───────────────────────────────────────────────────────────

const NICHE_OPTIONS = [
  { value: "sourcerecipes", label: "sourcerecipes.info" },
  { value: "kitchentools4u", label: "kitchentools4u.com" },
  { value: "pets", label: "Pets niche" },
  { value: "home_decor", label: "Home Decor niche" },
] as const;

const NICHE_LABELS: Record<string, string> = {
  sourcerecipes: "Recipes",
  kitchentools4u: "Kitchen",
  pets: "Pets",
  home_decor: "Decor",
};

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function hermesGet(path: string) {
  const r = await fetch(
    `/api/hermes/proxy?path=${encodeURIComponent(path)}`,
    { cache: "no-store" }
  );
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

async function hermesPost(path: string, body: object) {
  const r = await fetch("/api/hermes/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, body }),
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

// ─── Spinner component ──────────────────────────────────────────────────────

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
      />
    </svg>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HermesDashboard() {
  const router = useRouter();
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

  // Auth
  const [authorized, setAuthorized] = useState(false);

  // Data
  const [hermesOnline, setHermesOnline] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  // Article generator
  const [niche, setNiche] = useState("sourcerecipes");
  const [keyword, setKeyword] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [activeJob, setActiveJob] = useState<JobStatus | null>(null);
  const [runningArticle, setRunningArticle] = useState(false);

  // Keyword upload
  const [csvNiche, setCsvNiche] = useState("sourcerecipes");
  const [csvText, setCsvText] = useState("");
  const [uploading, setUploading] = useState(false);

  // Sync
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Feedback
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Refs for cleanup
  const jobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dataRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  // ── Auth check ───────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const { user, error: authErr } = await getUser();
        if (authErr || !user || user.email !== ADMIN_EMAIL) {
          router.push("/dashboard");
          return;
        }
        setAuthorized(true);
      } catch {
        router.push("/dashboard");
      }
    })();
  }, [ADMIN_EMAIL, router]);

  // ── Data loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [healthRes, statsRes, draftsRes] = await Promise.allSettled([
        hermesGet("/health"),
        hermesGet("/stats"),
        hermesGet("/drafts"),
      ]);

      if (healthRes.status === "fulfilled" && healthRes.value?.status === "online") {
        setHermesOnline(true);
      } else {
        setHermesOnline(false);
      }

      if (statsRes.status === "fulfilled" && statsRes.value && !statsRes.value.error) {
        const raw = statsRes.value;
        // Normalize stats with safe defaults
        const safeStats: Stats = {
          date: raw.date || new Date().toISOString().slice(0, 10),
          products: raw.products ?? 0,
          niches: {},
          budget: {
            spent_today: raw.budget?.spent_today ?? 0,
            daily_limit: raw.budget?.daily_limit ?? 5,
            percent_used: raw.budget?.percent_used ?? 0,
          },
        };
        // Normalize each niche — skip any that are error objects
        if (raw.niches && typeof raw.niches === "object") {
          for (const [key, val] of Object.entries(raw.niches)) {
            const n = val as NicheStats | undefined;
            if (n && !n.error && typeof n.keywords_available === "number") {
              safeStats.niches[key] = n;
            } else {
              safeStats.niches[key] = { keywords_available: 0, keywords_used: 0 };
            }
          }
        }
        setStats(safeStats);
      }

      if (draftsRes.status === "fulfilled") {
        setDrafts(draftsRes.value?.drafts || []);
      }
    } catch {
      setHermesOnline(false);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadData();

    dataRefreshRef.current = setInterval(loadData, 30000);
    return () => {
      if (dataRefreshRef.current) clearInterval(dataRefreshRef.current);
    };
  }, [authorized, loadData]);

  // ── Job polling ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeJob || activeJob.status !== "running") {
      if (jobPollRef.current) {
        clearInterval(jobPollRef.current);
        jobPollRef.current = null;
      }
      return;
    }

    jobPollRef.current = setInterval(async () => {
      try {
        const res = await hermesGet(`/job/${activeJob.job_id}`);
        setActiveJob(res);
        if (res.status === "complete" || res.status === "failed") {
          if (jobPollRef.current) clearInterval(jobPollRef.current);
          jobPollRef.current = null;
          loadData();
        }
      } catch {
        // keep polling
      }
    }, 5000);

    return () => {
      if (jobPollRef.current) {
        clearInterval(jobPollRef.current);
        jobPollRef.current = null;
      }
    };
  }, [activeJob, loadData]);

  // Auto-scroll job output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeJob?.output]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const runArticle = async () => {
    if (!keyword.trim() || !hermesOnline) return;
    setRunningArticle(true);
    setError("");
    setMessage("");
    try {
      const res = await hermesPost("/article/run", {
        niche,
        keyword: keyword.trim(),
        dry_run: dryRun,
      });
      if (res.success) {
        setActiveJob({
          status: "running",
          job_id: res.job_id,
          keyword: keyword.trim(),
          output: "",
          errors: "",
        });
        setMessage(res.message || "Job started");
        setKeyword("");
      } else {
        setError(res.message || "Failed to start job");
      }
    } catch (err) {
      setError(`Failed to start article: ${err}`);
    } finally {
      setRunningArticle(false);
    }
  };

  const uploadKeywords = async () => {
    if (!csvText.trim() || !hermesOnline) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const res = await hermesPost("/keywords/upload", {
        niche: csvNiche,
        csv_content: csvText,
        filename: `pinclicks_${csvNiche}_${Date.now()}.csv`,
      });
      console.log("Upload response:", res);
      if (res.success) {
        setMessage(`✅ Uploaded ${res.keyword_count} keywords to ${csvNiche}`);
        setCsvText("");
        loadData();
      } else {
        setError(res.detail || res.error || "Upload failed — check server logs");
      }
    } catch (err) {
      setError(`Upload error: ${err}`);
    } finally {
      setUploading(false);
    }
  };

  const syncProducts = async () => {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const res = await hermesPost("/products/sync", {});
      if (res.success) {
        setMessage(res.message || "Product sync started");
      }
    } catch (err) {
      setError(`Sync failed: ${err}`);
    } finally {
      setSyncing(false);
    }
  };

  // ── Budget color ─────────────────────────────────────────────────────────

  const budgetColor = (pct: number) => {
    if (pct >= 80) return { bar: "bg-red-500", text: "text-red-400" };
    if (pct >= 50) return { bar: "bg-yellow-500", text: "text-yellow-400" };
    return { bar: "bg-emerald-500", text: "text-emerald-400" };
  };

  // ── Job status styling ───────────────────────────────────────────────────

  const jobStatusStyle = (s: string) => {
    if (s === "running") return "border-yellow-500/40 bg-yellow-500/5";
    if (s === "complete") return "border-emerald-500/40 bg-emerald-500/5";
    return "border-red-500/40 bg-red-500/5";
  };

  const jobStatusBadge = (s: string) => {
    if (s === "running")
      return (
        <span className="inline-flex items-center gap-1.5 text-yellow-400 text-sm font-medium">
          <Spinner className="text-yellow-400" /> Running
        </span>
      );
    if (s === "complete")
      return <span className="text-emerald-400 text-sm font-medium">✅ Complete</span>;
    return <span className="text-red-400 text-sm font-medium">❌ Failed</span>;
  };

  // ── Loading guard ────────────────────────────────────────────────────────

  if (!authorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Verifying access…</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── SECTION 1 — Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            ⚡ Hermes Control Center
          </h1>
          <p className="text-gray-300 text-sm mt-1">
            Private content automation dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Online indicator */}
          <span className="flex items-center gap-2 text-sm font-medium">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hermesOnline
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                  : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              }`}
            />
            <span className={hermesOnline ? "text-emerald-400" : "text-red-400"}>
              {hermesOnline ? "Online" : "Offline"}
            </span>
          </span>
          {/* Refresh */}
          <button
            onClick={loadData}
            disabled={refreshing}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-all disabled:opacity-50"
          >
            {refreshing ? (
              <span className="flex items-center gap-1.5"><Spinner className="text-gray-300" /> Refreshing…</span>
            ) : (
              "↻ Refresh"
            )}
          </button>
        </div>
      </div>

      {/* Feedback banners */}
      {message && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 text-sm flex items-center justify-between">
          {message}
          <button onClick={() => setMessage("")} className="ml-2 text-emerald-400 hover:text-white">✕</button>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ── SECTION 2 — Stats Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Products */}
        <div className="rounded-xl p-5 bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Products</p>
          <p className="text-2xl font-bold text-white">
            {stats ? (stats.products ?? 0).toLocaleString() : "—"}
          </p>
          <p className="text-gray-400 text-xs">kitchentools4u.com</p>
        </div>

        {/* Budget */}
        <div className="rounded-xl p-5 bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Daily Budget</p>
          <p className={`text-2xl font-bold ${stats ? budgetColor(stats.budget?.percent_used ?? 0).text : "text-white"}`}>
            ${stats ? (stats.budget?.spent_today ?? 0).toFixed(2) : "—"}
            <span className="text-gray-400 text-sm font-normal"> / $5.00</span>
          </p>
          {stats && (
            <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${budgetColor(stats.budget?.percent_used ?? 0).bar}`}
                style={{ width: `${Math.min(stats.budget?.percent_used ?? 0, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Per-niche keyword cards */}
        {stats &&
          Object.keys(stats.niches).map((key) => (
            <div key={key} className="rounded-xl p-5 bg-gray-900 border border-gray-800 space-y-2">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                {NICHE_LABELS[key] || key}
              </p>
              <p className="text-2xl font-bold text-white">
                {(stats.niches[key]?.keywords_available ?? 0).toLocaleString()}
              </p>
              <p className="text-gray-400 text-xs">
                keywords available · {stats.niches[key]?.keywords_used ?? 0} used
              </p>
            </div>
          ))}

        {/* Placeholder cards when no stats */}
        {!stats &&
          ["Recipes", "Kitchen", "Pets", "Decor"].map((label) => (
            <div key={label} className="rounded-xl p-5 bg-gray-900 border border-gray-800 space-y-2">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold text-gray-600">—</p>
              <p className="text-gray-500 text-xs">keywords available</p>
            </div>
          ))}
      </div>

      {/* ── SECTION 3 — Generate Article ──────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-bold text-yellow-400">🚀 Generate Article</h2>

        <div className="grid sm:grid-cols-[1fr_2fr] gap-4">
          {/* Niche selector */}
          <div className="space-y-1.5">
            <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Niche</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 transition"
            >
              {NICHE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Keyword input */}
          <div className="space-y-1.5">
            <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Keyword</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runArticle()}
              placeholder="e.g. best air fryer recipes"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Dry run checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-yellow-500/30 focus:ring-offset-0 accent-yellow-500"
            />
            <span className="text-sm text-white">Dry run</span>
            <span className="text-xs text-gray-400">(no publish)</span>
          </label>

          {/* Run button */}
          <button
            onClick={runArticle}
            disabled={!hermesOnline || !keyword.trim() || runningArticle}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-yellow-500 hover:bg-yellow-400 text-gray-950 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-400/30"
          >
            {runningArticle ? (
              <span className="flex items-center gap-2"><Spinner className="text-gray-950" /> Starting…</span>
            ) : (
              "▶ Run Article"
            )}
          </button>

          {!hermesOnline && (
            <span className="text-xs text-red-400">Hermes is offline</span>
          )}
        </div>

        {/* Job status panel */}
        {activeJob && (
          <div className={`rounded-lg border p-4 space-y-3 ${jobStatusStyle(activeJob.status)}`}>
            <div className="flex items-center justify-between">
              <div>
                {jobStatusBadge(activeJob.status)}
                <span className="text-gray-400 text-sm ml-3">
                  Keyword: <span className="text-white font-medium">{activeJob.keyword}</span>
                </span>
              </div>
              <span className="text-gray-500 text-xs font-mono">{activeJob.job_id}</span>
            </div>

            {activeJob.output && (
              <pre
                ref={outputRef}
                className="max-h-72 overflow-y-auto rounded-lg bg-gray-950 border border-gray-800 p-3 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed"
              >
                {activeJob.output.slice(-1500)}
              </pre>
            )}

            {activeJob.errors && (
              <div className="rounded-lg bg-red-950/50 border border-red-500/20 p-3 text-xs text-red-300 font-mono whitespace-pre-wrap">
                {activeJob.errors}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 4 — Upload Keywords ───────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-bold text-yellow-400">📋 Upload Keywords</h2>
        <p className="text-gray-300 text-sm">
          Export from PinClicks.com — Format: ID, Label, URL, Search Volume, Followers
        </p>

        <div className="grid sm:grid-cols-[200px_1fr] gap-4">
          <div className="space-y-1.5">
            <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Niche</label>
            <select
              value={csvNiche}
              onChange={(e) => setCsvNiche(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 transition"
            >
              {NICHE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">CSV Content</label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={5}
              placeholder="Paste PinClicks CSV content here..."
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 font-mono focus:outline-none focus:border-yellow-500/50 transition resize-y"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={uploadKeywords}
            disabled={!hermesOnline || !csvText.trim() || uploading}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-yellow-500 hover:bg-yellow-400 text-gray-950 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-400/30"
          >
            {uploading ? (
              <span className="flex items-center gap-2"><Spinner className="text-gray-950" /> Uploading…</span>
            ) : (
              "⬆ Upload Keywords"
            )}
          </button>
          {!hermesOnline && (
            <span className="text-xs text-red-400">Hermes is offline</span>
          )}
        </div>
      </div>

      {/* ── SECTION 5 — Pending Drafts ────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-yellow-400">
            📝 Pending Drafts ({drafts.length})
          </h2>
          <button
            onClick={syncProducts}
            disabled={!hermesOnline || syncing}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700"
          >
            {syncing ? (
              <span className="flex items-center gap-2"><Spinner className="text-gray-400" /> Syncing…</span>
            ) : (
              "🔄 Sync Products"
            )}
          </button>
        </div>

        {drafts.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No pending drafts.</p>
        ) : (
          <div className="space-y-2">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-gray-800/50 border border-gray-800 px-4 py-3 hover:border-gray-700 transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate" title={draft.title}>
                    {draft.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-gray-400 text-xs">ID: {draft.id}</span>
                    <span className={`text-xs ${draft.featured_media > 0 ? "text-emerald-400" : "text-yellow-500"}`}>
                      {draft.featured_media > 0 ? "✅ Image" : "⚠️ No image"}
                    </span>
                    <span className="text-gray-400 text-xs">{draft.date}</span>
                  </div>
                </div>
                <a
                  href={draft.edit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white transition"
                >
                  Edit in WP →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 6 — Footer ────────────────────────────────────────── */}
      <div className="text-center py-6 border-t border-gray-800">
        <p className="text-gray-500 text-xs">
          Hermes Content OS v2.0 · Private Dashboard · Emarketing Solutions
        </p>
      </div>
    </div>
  );
}
