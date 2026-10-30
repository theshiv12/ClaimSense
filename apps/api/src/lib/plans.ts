import { LoadablePlanConfigSchema, RemediesCatalogSchema, type PlanConfig, type RemediesCatalog } from '@claimsense/shared';
import remediesJson from '../../../../config/remedies.json';
import starFho from '../../../../config/plans/star-fho.json';

// Imported, not read from disk, so the files ship with the serverless bundle. Parsed once at load:
// a plan with an unreviewed clause can never be loaded (LoadablePlanConfigSchema).
const PLANS: ReadonlyMap<string, PlanConfig> = new Map(
  [starFho].map((p) => {
    const plan = LoadablePlanConfigSchema.parse(p);
    return [plan.planId, plan];
  }),
);

export const getPlan = (planId: string): PlanConfig | null => PLANS.get(planId) ?? null;
export const listPlans = (): PlanConfig[] => [...PLANS.values()];

export const remedies: RemediesCatalog = RemediesCatalogSchema.parse(remediesJson);
