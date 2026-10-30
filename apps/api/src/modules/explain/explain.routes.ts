import { ClaimIdInputSchema, ExplainInputSchema } from '@claimsense/shared';
import { Router } from 'express';
import { handler, parse } from '../../core/http';
import { requireUser } from '../../core/session';
import { explainEstimate } from './explain.service';

// POST /api/claims/:claimId/explain — FR-11, grounded on the whole estimate (ADR-011).
export const explainRoutes = Router({ mergeParams: true }).post(
  '/explain',
  handler('explainEstimate', (req) => {
    const user = requireUser(req); // session before input
    const { claimId } = parse(ClaimIdInputSchema, { claimId: req.params.claimId });
    return explainEstimate(user, claimId, parse(ExplainInputSchema, req.body ?? {}));
  }),
);
