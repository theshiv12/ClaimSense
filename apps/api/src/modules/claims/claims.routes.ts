import { ClaimIdInputSchema, CreateClaimInputSchema } from '@claimsense/shared';
import { Router } from 'express';
import { handler, parse } from '../../core/http';
import { requireUser, sessionPort } from '../../core/session';
import * as claims from './claims.service';

// The session is checked before the input, as the server actions did (TC-ACT-*).
const claimId = (req: { params: Record<string, unknown> }) => parse(ClaimIdInputSchema, { claimId: req.params.claimId }).claimId;

export const claimsRoutes = Router()
  .get('/', handler('claimSummaries', (req) => claims.claimSummaries(requireUser(req).id)))
  .post('/', handler('createClaim', (req) => {
    const user = requireUser(req);
    return claims.createClaim(user, parse(CreateClaimInputSchema, req.body));
  }))
  .get('/:claimId', handler('getClaim', (req) => {
    const user = requireUser(req);
    return claims.getClaim(user.id, claimId(req));
  }))
  .delete('/:claimId', handler('deleteClaim', (req) => {
    const user = requireUser(req);
    return claims.deleteClaim(user.id, claimId(req));
  }));

export const meRoutes = Router().delete('/', handler('deleteMe', (req, res) => claims.deleteMe(requireUser(req), sessionPort(req, res))));
