import type { ChatSource } from '@claimsense/shared';

// The chat's checks in code (ADR-010), separate so each is unit-tested. Allow-lists, not deny-lists: the model's
// text may only carry numbers the TRUSTED sources contain (engine reason, plan clause, catalog remedies, reviewed
// cases), never numbers from the user's documents or browser, and never a verdict (golden rules 1, 8, 10).

const ASCII_NUMBER = /\d[\d,]*(?:\.\d+)?/g;
const NON_ASCII_DIGIT = /(?![0-9])\p{Nd}/u;
// Amounts written in words or units are never needed to explain a check, and cannot be compared to the sources.
const NUMBER_WORDS = /\b(hundred|thousand|lakhs?|lacs?|crores?|millions?|billions?|percent|per\s?cent)\b|₨/i;
// Claim outcomes are the engine's alone. "pre-approval" / "pre-authorisation" (cashless) is a step, not a verdict.
const PRE_AUTH = /\bpre-?(approv\w*|authori[sz]\w*)/gi;
const VERDICT =
  /\b(approv\w*|sanction\w*|guarantee\w*|(will|would|shall|is|are|gets?|got)\s+(?:be\s+)?(?:definitely\s+|surely\s+|fully\s+)?(?:approved|rejected|denied|accepted|sanctioned|paid|covered|settled|reimbursed))\b|\bpass ho\w*|\bmil ja\w*/i;

const digitsOf = (text: string) => [...text.matchAll(ASCII_NUMBER)].map((m) => m[0].replace(/,/g, ''));

/** True when the answer may be shown: only trusted numbers, no number words or other scripts' digits, no verdict. */
// Every pattern here is linear: no nested quantifiers, wildcards bounded ({0,30}); input length is capped below.
const MAX_ANSWER = 1200; // LlmChatAnswerSchema's bound, enforced again here

export const vetAnswer = (answer: string, sources: ChatSource[]): boolean => {
  if (answer.length > MAX_ANSWER) return false;
  const trusted = new Set(sources.filter((s) => s.kind !== 'document').flatMap((s) => [...digitsOf(s.label), ...digitsOf(s.text)]));
  // nosemgrep: ajinabraham.njsscan.dos.regex_dos.regex_dos -- linear patterns, input ≤ 1200 chars (see above)
  if (NON_ASCII_DIGIT.test(answer) || NUMBER_WORDS.test(answer)) return false;
  if (digitsOf(answer).some((n) => !trusted.has(n))) return false;
  // nosemgrep: ajinabraham.njsscan.dos.regex_dos.regex_dos -- linear pattern, input ≤ 1200 chars (see above)
  return !VERDICT.test(answer.replace(PRE_AUTH, ''));
};

// Asking to hide, leave out, change or back-date medical facts (English, Hinglish, Hindi). Refused before any AI
// call (golden rule 10). Narrow on purpose: "does the rent lie within", "why does the policy not mention ICU" pass.
const HIDE_PATTERNS: RegExp[] = [
  /\b(hide|conceal|cover up|leave out|omit|lying|lie to|back-?dat\w*|falsif\w*|forge\w*|tamper\w*)\b/i,
  /\bskip\s+(mention\w*|tell\w*|disclos\w*|declar\w*)/i,
  /\b(remove|delete|drop)\b.{0,30}\b(ped|condition|diagnosis|disease|illness|history|from (my|the) (form|record|report|proposal))\b/i,
  /\b(alter|modify|edit|change)\b(\s+\w+){0,3}?\s+(date|diagnosis|reports?|records?|bills?|documents?|forms?|history)\b/i,
  /\bfake\s+(bills?|reports?|documents?|certificates?|records?)\b/i,
  // Pricing a statement instead of a fact: "what if I say / write / tell them it was an accident / declared".
  /\b(i|we)\s+(say|said|tell|told|write|wrote|claim|put|mention|show)\b.{0,40}\b(accident\w*|declared|disclosed|no (ped|condition|history))\b/i,
  /\b(i|we)\b.{0,20}\b(not|never|don'?t|avoid)\s+(mention|tell|disclos|declar)\w*/i,
  /\b(chh?upa\w*|jhoo?th\w*|mat batana|nahi?n? batana|na batana|bina bataye|badal\w*)\b/i,
  /छुपा|छिपा|झूठ|मत बताना|बिना बताए/,
];

export const asksToHide = (question: string): boolean => HIDE_PATTERNS.some((p) => p.test(question));
