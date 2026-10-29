import { AddFactInputSchema, ClaimIdInputSchema, EditFactInputSchema, FactIdInputSchema } from '@claimsense/shared';
import { Router, type Request } from 'express';
import { handler, parse } from '../../core/http';
import { requireUser } from '../../core/session';
import * as facts from './facts.service';

// Ids come from the path, values from the body; both go through the shared Zod schemas.
const body = (req: Request) => (req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {});

export const factsRoutes = Router({ mergeParams: true })
  .get('/', handler('factsView', (req) => {
    const user = requireUser(req);
    return facts.factsView(user.id, parse(ClaimIdInputSchema, { claimId: req.params.claimId }).claimId);
  }))
  .post('/', handler('addFact', (req) => {
    const user = requireUser(req);
    const i = parse(AddFactInputSchema, { ...body(req), claimId: req.params.claimId });
    return facts.addFact(user.id, i.claimId, i.key, i.head, i.value);
  }))
  .patch('/:factId', handler('editFact', (req) => {
    const user = requireUser(req);
    const i = parse(EditFactInputSchema, { ...body(req), claimId: req.params.claimId, factId: req.params.factId });
    return facts.editFact(user.id, i.claimId, i.factId, i.value);
  }))
  .post('/:factId/confirm', handler('confirmFact', (req) => {
    const user = requireUser(req);
    const i = parse(FactIdInputSchema, { claimId: req.params.claimId, factId: req.params.factId });
    return facts.confirmFact(user.id, i.claimId, i.factId);
  }));
