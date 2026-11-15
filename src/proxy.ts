import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').split(/[\r\n]+/)[0]?.trim().replace(/^['"]|['"]$/g, '') || '';
  const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').split(/[\r\n]+/)[0]?.trim().replace(/^['"]|['"]$/g, '') || '';

  const supabase = createServerClient(
    url,
    rawKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname === '/';
  const isPublicVisitorRoute = 
    request.nextUrl.pathname === '/visitor/register' || 
    request.nextUrl.pathname === '/visitor/thank-you';
  
  // Exclude static assets, api endpoints, and public visitor registration from auth redirect
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('.') || 
    request.nextUrl.pathname.startsWith('/api') ||
    isPublicVisitorRoute
  ) {
    return supabaseResponse;
  }

  // Redirect to login (root /) if user is not authenticated and not already on the login page
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard (/home) if user is authenticated and tries to access login page (root /)
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
