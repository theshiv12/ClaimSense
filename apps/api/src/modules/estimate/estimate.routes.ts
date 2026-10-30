import { ClaimIdInputSchema } from '@claimsense/shared';
import { Router } from 'express';
import { handler, parse } from '../../core/http';
import { requireUser } from '../../core/session';
import * as est from './estimate.service';

const claimIdOf = (raw: unknown) => parse(ClaimIdInputSchema, { claimId: raw }).claimId;

export const estimateRoutes = Router({ mergeParams: true })
  .get('/estimate', handler('estimateView', (req) => {
    const user = requireUser(req);
    return est.estimateView(user.id, claimIdOf(req.params.claimId));
  }))
  .post('/estimate', handler('runCheck', (req) => {
    const user = requireUser(req);
    return est.runCheck(user.id, claimIdOf(req.params.claimId));
  }));
