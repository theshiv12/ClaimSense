import type { Fact } from '@claimsense/shared';

/** A stored fact as the browser sees it: no user or claim ids beyond its own id. */
export type StoredFactView = Fact & { id: string; usable: boolean };
