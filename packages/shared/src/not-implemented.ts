import { z } from 'zod';

/** Red-phase stub: any parse throws. Removed in the green commit. */
export const notImplemented = z.unknown().transform((): never => {
  throw new Error('not implemented');
});
