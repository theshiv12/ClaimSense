import { NextResponse, type NextRequest } from 'next/server';

/**
 * The browser only ever calls /api/* on this site; this forwards it to the Express API (ADR-009), so the
 * session cookie stays first-party and there is no CORS. API_ORIGIN is read per request, not at build time.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  return NextResponse.rewrite(new URL(`${pathname}${search}`, process.env.API_ORIGIN ?? 'http://localhost:4000'));
}

export const config = { matcher: '/api/:path*' };
