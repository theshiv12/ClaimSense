import { isUsable } from '@claimsense/rules';
import type { Fact } from '@claimsense/shared';

/** A fact as server actions return it. */
export type WireFact = Fact & { id: string };

/** A fact as the browser shows it: `usable` follows the engine's own rule (docs/rules-spec.md). */
export type StoredFactView = WireFact & { usable: boolean };

export const toView = (f: WireFact): StoredFactView => ({ ...f, usable: isUsable(f) });
