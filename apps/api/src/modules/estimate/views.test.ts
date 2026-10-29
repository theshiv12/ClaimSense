import { describe, expect, it } from 'vitest';
import { startSample } from '../../../test/actions';
import { currentUser } from '../../../test/actions';
import { claimSummaries } from '../claims/claims.service';
import { estimateView } from './estimate.service';

describe('claimSummaries', () => {
  it('TC-UI-14 a sample whose estimate was shown is listed with its verdict and amounts', async () => {
    const r = await startSample({ caseId: 'B' });
    if (!r.ok) throw new Error(r.code);
    const user = await currentUser();
    if (!user) throw new Error('no session');
    await estimateView(user.id, r.data.claimId);
    const [row] = await claimSummaries(user.id);
    // docs/rules-spec.md Case B: ₹2,05,800 of ₹2,40,000, you pay ₹34,200.
    expect(row).toMatchObject({ verdict: 'likely_partial', payablePaise: 20_580_000, claimedPaise: 24_000_000, outOfPocketPaise: 3_420_000 });
  });
});
