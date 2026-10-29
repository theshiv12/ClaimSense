import { AuthForm } from '@/components/forms/auth-form';
import { AuthShell } from '@/components/forms/auth-shell';
import { safeNext } from '@/lib/next-path';

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const { next } = await searchParams;
  return (
    <AuthShell
      pitch="Know what you’ll pay before the hospital does."
      blurb="Upload your policy and the hospital’s estimate. Every cut comes with the clause behind it."
      title="Create your account"
      subtitle="Free. Your files are read, then discarded."
    >
      <AuthForm mode="signup" next={safeNext(next)} />
    </AuthShell>
  );
}
