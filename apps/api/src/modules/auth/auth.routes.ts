import { Router } from 'express';
import { login, logout, me, signup } from './auth.controller';

export const authRoutes = Router()
  .post('/signup', signup)
  .post('/login', login)
  .post('/logout', logout)
  .get('/me', me);
