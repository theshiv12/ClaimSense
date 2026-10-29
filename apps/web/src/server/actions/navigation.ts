'use server';
import 'server-only';
import { redirect } from 'next/navigation';
import { logout, startSample } from './auth';

/** For a plain <form action>: end the session, then go home. */
export async function logoutAndGoHome() {
  await logout();
  redirect('/');
}

/** Starts a sample from a POST form (never a GET link), then opens its estimate. */
export async function openSample(form: FormData) {
  const r = await startSample({ caseId: form.get('caseId') });
  if (!r.ok) redirect(r.code === 'RATE_LIMITED' ? '/?sample=busy' : '/');
  redirect(`/claims/${r.data.claimId}`);
}
