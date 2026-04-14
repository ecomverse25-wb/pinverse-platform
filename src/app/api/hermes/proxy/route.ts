import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const HERMES_URL = process.env.HERMES_API_URL || "http://34.62.198.158:8080";
const HERMES_KEY = process.env.HERMES_API_KEY || "";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

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
  const res = await fetch(`${HERMES_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${HERMES_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  // Safely parse JSON — some Hermes endpoints may return non-JSON (HTML error pages, etc)
  let data;
  try {
    data = await res.json();
  } catch {
    data = { error: `Hermes returned status ${res.status} with non-JSON body`, success: false };
  }

  return { data, ok: res.ok, status: res.status };
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = req.nextUrl.searchParams.get("path") || "/health";

  try {
    const { data, ok, status } = await hermesRequest(path);

    // Mock missing endpoints if the backend returns 404
    if (status === 404) {
      if (path.startsWith("/products")) {
        // Fetch real product count from /stats since backend doesn't have a GET /products route yet
        const { data: statsData } = await hermesRequest("/stats");
        return NextResponse.json({ total: statsData?.products || 0, last_synced: "", sample: [] });
      }
      if (path.startsWith("/sites")) {
        return NextResponse.json({ sites: [{ niche_id: "sourcerecipes", name: "Source Recipes", wp_connected: false }] });
      }
      if (path.startsWith("/schedule")) {
        return NextResponse.json({ jobs: [] });
      }
      if (path.startsWith("/budget")) {
        return NextResponse.json({ daily_limit: 10, monthly_limit: 300, spent_today: 0, spent_this_month: 0 });
      }
      if (path.startsWith("/keywords") && path.includes("/list")) {
        return NextResponse.json({ keywords: [] });
      }
      if (path.startsWith("/jobs/recent")) {
        return NextResponse.json({ jobs: [] });
      }
    }

    return NextResponse.json(data, ok ? undefined : { status });
  } catch (err) {
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
    const { path, body } = await req.json();
    const { data, ok, status } = await hermesRequest(path, "POST", body);
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

  const path = req.nextUrl.searchParams.get("path") || "";

  try {
    const { data, ok, status } = await hermesRequest(path, "DELETE");
    return NextResponse.json(data, ok ? undefined : { status });
  } catch (err) {
    return NextResponse.json(
      { error: "Cannot reach Hermes — check VPS connection", details: String(err) },
      { status: 502 }
    );
  }
}
