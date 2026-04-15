import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { promises as fs } from "fs";
import path from "path";

const HERMES_URL = process.env.HERMES_API_URL || "http://34.62.198.158:8080";
const HERMES_KEY = process.env.HERMES_API_KEY || "";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

// ─── Local Sites Store (fallback when VPS lacks /sites endpoints) ────────────
// Sites are stored in a JSON file so they survive restarts.
const SITES_FILE = path.join(process.cwd(), ".hermes-sites.json");

interface LocalSite {
  id: string;
  niche_id: string;
  name: string;
  display_name: string;
  url: string;
  wp_username: string;
  wp_app_password: string;
  wp_connected: boolean;
  affiliate_programs: string[];
  ad_network: string;
  tone: string;
  content_types: string[];
  keywords_available: number;
  articles_total: number;
  status: string;
  created_at: string;
}

async function readSites(): Promise<LocalSite[]> {
  try {
    const raw = await fs.readFile(SITES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeSites(sites: LocalSite[]): Promise<void> {
  await fs.writeFile(SITES_FILE, JSON.stringify(sites, null, 2), "utf-8");
}

// Verify the current user is an admin before proxying any request
async function verifyAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const email = data?.user?.email;
    if (!email) return false;
    // Check against env var first, then hardcoded fallback
    if (ADMIN_EMAIL && email === ADMIN_EMAIL) return true;
    // Fallback: check known admin emails
    const knownAdmins = ["ecomverse25@gmail.com", "admin@pinverse.io"];
    return knownAdmins.includes(email.toLowerCase());
  } catch {
    return false;
  }
}

// Forward request to Hermes VPS
async function hermesRequest(
  path: string,
  method = "GET",
  body?: object
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${HERMES_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${HERMES_KEY}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Safely parse JSON — some Hermes endpoints may return non-JSON (HTML error pages, etc)
    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: `Hermes returned status ${res.status} with non-JSON body`, success: false };
    }

    return { data, ok: res.ok, status: res.status };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ─── Sites CRUD helpers (local fallback) ─────────────────────────────────────

async function handleSitesGet(sitesPath: string): Promise<NextResponse> {
  // Try VPS first
  try {
    const { data, ok, status } = await hermesRequest(sitesPath);
    if (ok && data?.sites) return NextResponse.json(data);
    if (status !== 404) return NextResponse.json(data, { status });
  } catch { /* VPS unreachable — fall through to local store */ }

  // Fallback: local store
  const sites = await readSites();
  return NextResponse.json({ sites });
}

async function handleSitesPost(body: Record<string, unknown>): Promise<NextResponse> {
  // Try VPS first
  try {
    const { data, ok, status } = await hermesRequest("/sites", "POST", body);
    if (ok) {
      // Also save locally for consistency
      const sites = await readSites();
      const exists = sites.find((s) => s.niche_id === body.niche_id);
      if (!exists) {
        sites.push(bodyToSite(body));
        await writeSites(sites);
      }
      return NextResponse.json(data);
    }
    if (status !== 404) return NextResponse.json(data, { status });
  } catch { /* VPS unreachable — fall through to local store */ }

  // Fallback: local store
  const sites = await readSites();
  const nicheId = String(body.niche_id || "").trim();
  if (!nicheId) {
    return NextResponse.json({ error: "niche_id is required", success: false }, { status: 400 });
  }
  if (sites.find((s) => s.niche_id === nicheId)) {
    return NextResponse.json({ error: `Site "${nicheId}" already exists`, success: false }, { status: 409 });
  }
  sites.push(bodyToSite(body));
  await writeSites(sites);
  return NextResponse.json({ success: true, message: `Site "${nicheId}" added` });
}

async function handleSitesDelete(nicheId: string): Promise<NextResponse> {
  // Try VPS first
  try {
    const { data, ok, status } = await hermesRequest(`/sites/${nicheId}`, "DELETE");
    if (ok) {
      // Also remove locally
      const local = await readSites();
      await writeSites(local.filter((s) => s.niche_id !== nicheId));
      return NextResponse.json(data);
    }
    if (status !== 404) return NextResponse.json(data, { status });
  } catch { /* VPS unreachable — fall through */ }

  // Fallback: local store
  const sites = await readSites();
  const before = sites.length;
  const after = sites.filter((s) => s.niche_id !== nicheId);
  await writeSites(after);
  if (after.length < before) {
    return NextResponse.json({ success: true, message: `Site "${nicheId}" removed` });
  }
  return NextResponse.json({ success: true, message: `Site "${nicheId}" not found but treated as deleted` });
}

function bodyToSite(body: Record<string, unknown>): LocalSite {
  return {
    id: String(body.niche_id || Date.now()),
    niche_id: String(body.niche_id || ""),
    name: String(body.display_name || body.niche_id || ""),
    display_name: String(body.display_name || body.niche_id || ""),
    url: String(body.site_url || ""),
    wp_username: String(body.wp_username || ""),
    wp_app_password: String(body.wp_app_password || ""),
    wp_connected: false,
    affiliate_programs: Array.isArray(body.affiliate_programs) ? body.affiliate_programs as string[] : [],
    ad_network: String(body.ad_network || "None"),
    tone: String(body.tone || "warm-conversational"),
    content_types: Array.isArray(body.content_types) ? body.content_types as string[] : [],
    keywords_available: 0,
    articles_total: 0,
    status: "active",
    created_at: new Date().toISOString(),
  };
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reqPath = req.nextUrl.searchParams.get("path") || "/health";

  // Sites: use local-backed handler
  if (reqPath === "/sites" || reqPath === "/sites/") {
    return handleSitesGet(reqPath);
  }

  try {
    const { data, ok, status } = await hermesRequest(reqPath);

    // Mock missing endpoints if the backend returns 404
    if (status === 404) {
      if (reqPath.startsWith("/products")) {
        // Fetch real product count from /stats since backend doesn't have a GET /products route yet
        try {
          const { data: statsData } = await hermesRequest("/stats");
          return NextResponse.json({ total: statsData?.products || 0, last_synced: "", sample: [] });
        } catch {
          return NextResponse.json({ total: 0, last_synced: "", sample: [] });
        }
      }
      if (reqPath.startsWith("/sites")) {
        return handleSitesGet(reqPath);
      }
      if (reqPath.startsWith("/schedule")) {
        return NextResponse.json({ jobs: [] });
      }
      if (reqPath.startsWith("/budget")) {
        return NextResponse.json({ daily_limit: 10, monthly_limit: 300, spent_today: 0, spent_this_month: 0 });
      }
      if (reqPath.startsWith("/keywords") && reqPath.includes("/list")) {
        return NextResponse.json({ keywords: [] });
      }
      if (reqPath.startsWith("/keywords/")) {
        return NextResponse.json({ available: 0, used: 0, total: 0 });
      }
      if (reqPath.startsWith("/jobs/recent")) {
        return NextResponse.json({ jobs: [] });
      }
      if (reqPath.startsWith("/drafts")) {
        return NextResponse.json({ drafts: [] });
      }
    }

    return NextResponse.json(data, ok ? undefined : { status });
  } catch (err) {
    // VPS unreachable — provide safe fallbacks for read-only endpoints
    if (reqPath === "/health") {
      return NextResponse.json({ status: "offline", version: "2.0.0", error: "VPS unreachable" });
    }
    if (reqPath.startsWith("/sites")) {
      return handleSitesGet(reqPath);
    }
    return NextResponse.json(
      { error: "Cannot reach Hermes — check VPS connection", details: String(err) },
      { status: 502 }
    );
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { path: reqPath, body } = await req.json();

    // Sites: use local-backed handler
    if (reqPath === "/sites" || reqPath === "/sites/") {
      return handleSitesPost(body || {});
    }

    // Test connection — special handling
    if (typeof reqPath === "string" && /^\/sites\/[^/]+\/test$/.test(reqPath)) {
      try {
        const { data, ok } = await hermesRequest(reqPath, "POST", body);
        if (ok) return NextResponse.json(data);
      } catch { /* fall through */ }
      // Fallback: try to test WordPress connection directly from site config
      const match = reqPath.match(/^\/sites\/([^/]+)\/test$/);
      if (match) {
        const sites = await readSites();
        const site = sites.find((s) => s.niche_id === match[1]);
        if (site && site.url && site.wp_username && site.wp_app_password) {
          try {
            const wpRes = await fetch(`${site.url}/wp-json/wp/v2/posts?per_page=1&status=draft`, {
              headers: {
                Authorization: "Basic " + Buffer.from(`${site.wp_username}:${site.wp_app_password}`).toString("base64"),
              },
            });
            if (wpRes.ok) {
              return NextResponse.json({ connected: true, site_url: site.url });
            }
            return NextResponse.json({ connected: false, error: `WordPress returned ${wpRes.status}`, site_url: site.url });
          } catch (wpErr) {
            return NextResponse.json({ connected: false, error: String(wpErr), site_url: site.url });
          }
        }
        return NextResponse.json({ connected: false, error: "Site not found or missing credentials" });
      }
    }

    const { data, ok, status } = await hermesRequest(reqPath, "POST", body);
    return NextResponse.json(data, ok ? undefined : { status });
  } catch (err) {
    return NextResponse.json(
      { error: "Cannot reach Hermes — check VPS connection", details: String(err) },
      { status: 502 }
    );
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reqPath = req.nextUrl.searchParams.get("path") || "";

  // Sites: use local-backed handler
  const siteMatch = reqPath.match(/^\/sites\/([^/]+)$/);
  if (siteMatch) {
    return handleSitesDelete(siteMatch[1]);
  }

  try {
    const { data, ok, status } = await hermesRequest(reqPath, "DELETE");
    return NextResponse.json(data, ok ? undefined : { status });
  } catch (err) {
    return NextResponse.json(
      { error: "Cannot reach Hermes — check VPS connection", details: String(err) },
      { status: 502 }
    );
  }
}
