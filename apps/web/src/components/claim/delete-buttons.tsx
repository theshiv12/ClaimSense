'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteClaim, deleteMe } from '@/server/actions/claims';
import { Button } from '../ui/button';

// Two-step confirm in the page itself (no browser confirm() dialogs).

export function DeleteClaimButton({ claimId, after = 'refresh' }: { claimId: string; after?: 'refresh' | 'list' }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <Button variant="ghost" onClick={() => setAsking(true)}>
        Delete
      </Button>
    );
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant="danger"
        onClick={() =>
          void deleteClaim({ claimId }).then(() => (after === 'list' ? router.push('/claims') : router.refresh()))
        }
      >
        Delete this check
      </Button>
      <Button variant="ghost" onClick={() => setAsking(false)}>
        Keep
      </Button>
    </span>
  );
}

export function DeleteMyDataButton() {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking)
    return (
      <Button variant="danger" onClick={() => setAsking(true)}>
        Delete my data
      </Button>
    );
  return (
    <div className="space-y-2 rounded-lg bg-risk-bg p-3 text-sm text-risk-fg">
      <p>This deletes your account, every check, fact and estimate, now. It cannot be undone.</p>
      <div className="flex gap-2">
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void deleteMe().then(() => {
              router.push('/');
              router.refresh();
            });
          }}
        >
          Yes, delete everything
        </Button>
        <Button variant="secondary" onClick={() => setAsking(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
