import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const HERMES_URL = process.env.HERMES_API_URL || "http://34.62.198.158:8080";
const HERMES_KEY = process.env.HERMES_API_KEY || "";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

async function verifyAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.email === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = req.nextUrl.searchParams.get("path") || "/health";

  try {
    const r = await fetch(`${HERMES_URL}${path}`, {
      headers: { Authorization: `Bearer ${HERMES_KEY}` },
      cache: "no-store",
    });
    const data = await r.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach Hermes server", details: String(err) },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { path, body } = await req.json();
    const r = await fetch(`${HERMES_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HERMES_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach Hermes server", details: String(err) },
      { status: 502 }
    );
  }
}
