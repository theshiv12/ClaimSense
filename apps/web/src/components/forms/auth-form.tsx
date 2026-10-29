'use client';
import { LoginInputSchema, SignupInputSchema } from '@claimsense/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { ERROR_MESSAGES } from '@/lib/labels';
import { login, signup } from '@/server/actions/auth';
import { Button } from '../ui/button';
import { ErrorText, Field, inputClass } from '../ui/field';

/** Sign up and sign in share one form. Validates with the same Zod schemas as the server. */
export function AuthForm({ mode, next }: { mode: 'signup' | 'login'; next: string }) {
  const id = useId();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (form: FormData) => {
    const input =
      mode === 'signup'
        ? { email: form.get('email'), password: form.get('password'), displayName: form.get('displayName') || undefined, adultAttested: form.get('adult') === 'on' }
        : { email: form.get('email'), password: form.get('password') };
    const check = (mode === 'signup' ? SignupInputSchema : LoginInputSchema).safeParse(input);
    if (!check.success) {
      setError(mode === 'signup' ? 'Use a valid email, a password of 8+ characters with a number, and confirm you are 18 or older.' : 'Enter your email and password.');
      return;
    }
    setBusy(true);
    const r = await (mode === 'signup' ? signup(input) : login(input));
    setBusy(false);
    if (!r.ok) return setError(ERROR_MESSAGES[r.code]);
    router.push(next);
    router.refresh();
  };

  return (
    <form action={(f) => void submit(f)} className="space-y-4" noValidate>
      {mode === 'signup' ? (
        <Field id={`${id}-name`} label="Your name (optional)">
          <input id={`${id}-name`} name="displayName" className={inputClass} autoComplete="name" />
        </Field>
      ) : null}
      <Field id={`${id}-email`} label="Email">
        <input id={`${id}-email`} name="email" type="email" className={inputClass} autoComplete="email" required />
      </Field>
      <Field id={`${id}-password`} label="Password" hint={mode === 'signup' ? 'At least 8 characters, with a number.' : undefined}>
        <input id={`${id}-password`} name="password" type="password" className={inputClass} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
      </Field>
      {mode === 'signup' ? (
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" name="adult" className="mt-1" /> I am 18 or older.
        </label>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {mode === 'signup' ? 'Create account' : 'Sign in'}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === 'signup' ? (
          <>Already have an account? <Link className="text-teal hover:underline" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></>
        ) : (
          <>New here? <Link className="text-teal hover:underline" href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></>
        )}
      </p>
    </form>
  );
}
