import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Middleware: Missing Supabase Environment Variables");
        // If config is missing, we can't do auth, but we shouldn't crash via 500.
        // Proceeding allows the page to load (blocking data access later).
        return response;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: "",
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: "",
                        ...options,
                    });
                },
            },
        }
    );

    // IMPORTANT: Refresh session - this prevents expired sessions
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // ⚠️ INFINITE LOOP PREVENTION: Check if already on auth pages
    const isAuthPage =
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/signup");

    const isProtectedRoute =
        request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/admin");

    // Redirect unauthenticated users to login
    if (!user && isProtectedRoute && !isAuthPage) {
        const redirectUrl = new URL("/login", request.url);
        redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users away from login/signup
    if (user && isAuthPage) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Admin-specific protection
    if (request.nextUrl.pathname.startsWith("/admin")) {
        const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
        if (!user || !adminEmails.includes(user.email || "")) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico (favicon file)
         * - public folder
         * - api routes (let them handle their own auth)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
