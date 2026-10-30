import { ChatAskInputSchema, ClaimIdInputSchema, RuleId } from '@claimsense/shared';
import { Router } from 'express';
import { handler, parse } from '../../core/http';
import { requireUser } from '../../core/session';
import { askAboutCheck } from './chat.service';

// POST /api/claims/:claimId/checks/:ruleId/chat — grounded Q&A about one check (ADR-010).
export const chatRoutes = Router({ mergeParams: true }).post(
  '/checks/:ruleId/chat',
  handler('askAboutCheck', (req) => {
    const user = requireUser(req); // session before input (TC-OWN-*)
    const { claimId } = parse(ClaimIdInputSchema, { claimId: req.params.claimId });
    const ruleId = parse(RuleId, req.params.ruleId);
    return askAboutCheck(user, claimId, ruleId, parse(ChatAskInputSchema, req.body));
  }),
);
