import { LoginInputSchema, SignupInputSchema } from '@claimsense/shared';
import { handler, parse } from '../../core/http';
import { sessionPort } from '../../core/session';
import * as auth from './auth.service';

export const signup = handler('signup', (req, res) => auth.signup(parse(SignupInputSchema, req.body), sessionPort(req, res)));
export const login = handler('login', (req, res) => auth.login(parse(LoginInputSchema, req.body), sessionPort(req, res)));
export const logout = handler('logout', async (req, res) => {
  await sessionPort(req, res).end();
  return null;
});
/** The signed-in user or guest, or null. A read: it never creates a session. */
export const me = handler('me', (req) => Promise.resolve(req.user ?? null));
