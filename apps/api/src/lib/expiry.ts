import type { CurrentUserView as CurrentUser } from '@claimsense/shared';
import { env } from '../core/env';
import { User } from '../core/models';

/** When a user's rows expire: guests after GUEST_TTL_HOURS, others after CLAIM_TTL_DAYS. */
export const claimExpiry = async (user: CurrentUser) => {
  if (user.isGuest) {
    const doc = await User.findById(user.id, { expiresAt: 1 }).lean();
    if (doc?.expiresAt) return doc.expiresAt;
  }
  return new Date(Date.now() + env().CLAIM_TTL_DAYS * 24 * 60 * 60 * 1000);
};
