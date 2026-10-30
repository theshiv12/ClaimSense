import type { Estimate, RuleResult } from './rule-result.schema';
import type { FactKey } from './fact-key';
import type { Fact } from './fact.schema';
import type { ClarifierView } from './clarifier';
import type { Precedent } from './precedent.schema';
import type { Remedy } from './remedies.schema';

// Response shapes of the REST API (docs/api.md), shared by apps/api and apps/web. Bodies are always
// ActionResult<T> (actions.schema.ts) with one of these as T.

export interface CurrentUserView {
  id: string;
  isGuest: boolean;
  email: string | null;
  displayName: string | null;
}

/** A fact as the API returns it. */
export type WireFact = Fact & { id: string };
/** A fact with `usable` worked out by the engine's own rule (docs/rules-spec.md). */
export type StoredFactView = WireFact & { usable: boolean };

export interface ClaimSummary {
  id: string;
  treatment: string;
  relation: string;
  verdict: Estimate['verdict'] | null;
  payablePaise: number | null;
  claimedPaise: number | null;
  outOfPocketPaise: number | null;
  createdAt: string;
  expiresAt: string;
  sampleCaseId: string | null;
  planName: string;
  wordingVersion: string;
}

export interface ClaimView {
  id: string;
  planId: string;
  relation: string;
  treatment: string;
  sampleCaseId: string | null;
}

export interface EvidenceLine {
  key: FactKey;
  quote: string;
  page: number | null;
}

export interface EstimateView {
  claim: ClaimView;
  plan: { planName: string; wordingVersion: string; uin: string; rulesAsOf: string };
  estimate: Estimate;
  remedies: Remedy[];
  evidence: Partial<Record<RuleResult['ruleId'], EvidenceLine[]>>;
  /** Reviewed public decisions on the same rule and outcome (ADR-010), per check that did not pass. */
  precedents: Partial<Record<RuleResult['ruleId'], Precedent[]>>;
  /** FR-6: at most 2 questions that would settle the most Unknown checks. */
  clarifiers: ClarifierView[];
  needsYou: number;
}

export interface PlanOption {
  planId: string;
  name: string;
}

export interface SamplePreview {
  estimate: Estimate;
  room: RuleResult | null;
}

export interface UploadResultView {
  documentId: string;
  documentType: string;
  facts: WireFact[];
  needsYou: number;
  warnings: string[];
}
