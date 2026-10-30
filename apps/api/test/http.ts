import type { ActionResult, ErrorCode } from '@claimsense/shared';
import request from 'supertest';
import { createApp } from '../src/app';
import { jar, testIp } from './cookie-jar';

// Calls the real Express app over HTTP, like the browser does through the web proxy (apps/web/src/proxy.ts):
// the Origin of the web app, the client IP in the proxy's signed header, and the cookies in the jar.
// Responses update the jar. `extra` headers override the defaults; an empty value removes one.
export const ORIGIN = 'http://localhost:3000';
let app: ReturnType<typeof createApp> | undefined;
const server = () => (app ??= createApp());

/** What the web proxy adds: the client IP it saw, vouched for with the shared secret. */
const proxied = (): Record<string, string> => ({ 'X-CS-Client-IP': testIp.value, 'X-CS-Proxy-Key': process.env.PROXY_SECRET ?? '' });

type Method = 'get' | 'post' | 'patch' | 'delete';
export interface Sent {
  status: number;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
}

const withHeaders = <T extends { set(k: string, v: string): T }>(req: T, extra: Record<string, string> = {}): T => {
  let r = req;
  for (const [k, v] of Object.entries({ ...proxied(), Origin: ORIGIN, ...extra })) if (v !== '') r = r.set(k, v);
  const cookie = jar.header();
  return cookie ? r.set('Cookie', cookie) : r;
};

export const send = async (method: Method, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<Sent> => {
  const req = withHeaders(request(server())[method](path), extra);
  const res = body === undefined ? await req : await req.send(body as object);
  jar.absorb(res.headers['set-cookie']);
  return { status: res.status, body: res.body as unknown, headers: res.headers };
};

/** Multipart upload, as the facts page sends it. */
export const upload = async (path: string, bytes: Uint8Array, filename: string, contentType: string): Promise<Sent> => {
  const res = await withHeaders(request(server()).post(path)).attach('file', Buffer.from(bytes), { filename, contentType });
  jar.absorb(res.headers['set-cookie']);
  return { status: res.status, body: res.body as unknown, headers: res.headers };
};

export const result = <T>(s: Sent) => s.body as ActionResult<T>;
export type Code = ErrorCode;
