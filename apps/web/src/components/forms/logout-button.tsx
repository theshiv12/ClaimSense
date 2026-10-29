'use client';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/api/client';
import { buttonClass } from '../ui/button';

/** Ends the session (POST), then goes home and re-renders without it. */
export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={buttonClass('secondary')}
      onClick={() =>
        void logout().then(() => {
          router.push('/');
          router.refresh();
        })
      }
    >
      {label}
    </button>
  );
}
