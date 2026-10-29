import { AuthForm } from '@/components/forms/auth-form';
import { Card } from '@/components/ui/card';
import { safeNext } from '@/lib/next-path';

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-14">
      <Card>
        <h1 className="mb-4 text-2xl font-bold text-ink">Create your account</h1>
        <AuthForm mode="signup" next={safeNext(next)} />
      </Card>
    </main>
  );
}
