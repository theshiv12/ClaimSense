import { AuthForm } from '@/components/forms/auth-form';
import { AuthShell } from '@/components/forms/auth-shell';
import { SampleButton } from '@/components/forms/sample-button';
import { safeNext } from '@/lib/next-path';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams;
  return (
    <AuthShell
      pitch="Pick up where you left off."
      blurb="Your facts and estimates wait for you for 7 days, then they are deleted automatically."
      title="Welcome back"
      subtitle="Sign in to see your saved checks."
    >
      <AuthForm mode="login" next={safeNext(next)} />
      <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <SampleButton caseId="B" variant="secondary" className="w-full">Try a sample case without an account</SampleButton>
    </AuthShell>
  );
}
