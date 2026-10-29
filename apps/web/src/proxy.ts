import { NextResponse, type NextRequest } from 'next/server';

const CLIENT_IP = 'x-cs-client-ip';
const PROXY_KEY = 'x-cs-proxy-key';

/** The client IP as the platform reports it: on Vercel the first X-Forwarded-For entry, which Vercel sets itself. */
const clientIpOf = (request: NextRequest) =>
  request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';

/**
 * The browser only ever calls /api/* on this site; this forwards it to the Express API (ADR-009), so the
 * session cookie stays first-party and there is no CORS. API_ORIGIN is read per request, not at build time.
 * It also vouches for the client IP (X-CS-Client-IP + PROXY_SECRET) for the API's per-IP limits; any such
 * headers the client sent are dropped first.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.delete(CLIENT_IP);
  headers.delete(PROXY_KEY);
  const secret = process.env.PROXY_SECRET;
  const ip = clientIpOf(request);
  if (secret && ip) {
    headers.set(CLIENT_IP, ip);
    headers.set(PROXY_KEY, secret);
  }
  return NextResponse.rewrite(new URL(`${pathname}${search}`, process.env.API_ORIGIN ?? 'http://localhost:4000'), { request: { headers } });
}

export const config = { matcher: '/api/:path*' };
