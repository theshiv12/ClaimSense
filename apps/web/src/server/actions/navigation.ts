'use server';
import 'server-only';
import { redirect } from 'next/navigation';
import { logout } from './auth';

/** For a plain <form action>: end the session, then go home. */
export async function logoutAndGoHome() {
  await logout();
  redirect('/');
}
