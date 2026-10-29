import type { PlanOption } from '@claimsense/shared';
import { Router } from 'express';
import { handler } from '../../core/http';
import { listPlans } from '../../lib/plans';

/** The plans a check can use, for the setup form (TC-API-09). */
export const plansRoutes = Router().get(
  '/',
  handler('plans', () => Promise.resolve(listPlans().map((p): PlanOption => ({ planId: p.planId, name: `${p.planName} (${p.wordingVersion})` })))),
);
