import type { ActionResult, ErrorCode } from '@claimsense/shared';
import request from 'supertest';
import { createApp } from '../src/app';
import { jar, testIp } from './cookie-jar';

// Calls the real Express app over HTTP, like the browser does through the Next rewrite: the Origin of the web
// app, the client IP in X-Forwarded-For, and the cookies in the jar. Responses update the jar.
export const ORIGIN = 'http://localhost:3000';
let app: ReturnType<typeof createApp> | undefined;
const server = () => (app ??= createApp());

type Method = 'get' | 'post' | 'patch' | 'delete';
export interface Sent {
  status: number;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
}

export const send = async (method: Method, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<Sent> => {
  let req = request(server())[method](path).set('X-Forwarded-For', testIp.value).set('Origin', ORIGIN);
  const cookie = jar.header();
  if (cookie) req = req.set('Cookie', cookie);
  for (const [k, v] of Object.entries(extra)) req = req.set(k, v);
  const res = body === undefined ? await req : await req.send(body as object);
  jar.absorb(res.headers['set-cookie'] as string[] | undefined);
  return { status: res.status, body: res.body as unknown, headers: res.headers as Sent['headers'] };
};

/** Multipart upload, as the facts page sends it. */
export const upload = async (path: string, bytes: Uint8Array, filename: string, contentType: string): Promise<Sent> => {
  let req = request(server()).post(path).set('X-Forwarded-For', testIp.value).set('Origin', ORIGIN);
  const cookie = jar.header();
  if (cookie) req = req.set('Cookie', cookie);
  const res = await req.attach('file', Buffer.from(bytes), { filename, contentType });
  jar.absorb(res.headers['set-cookie'] as string[] | undefined);
  return { status: res.status, body: res.body as unknown, headers: res.headers as Sent['headers'] };
};

export const result = <T>(s: Sent) => s.body as ActionResult<T>;
export type Code = ErrorCode;
