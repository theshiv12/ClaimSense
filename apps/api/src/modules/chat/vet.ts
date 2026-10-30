import type { ChatSource } from '@claimsense/shared';

export const vetAnswer = (_answer: string, _sources: ChatSource[]): boolean => true;
export const asksToHide = (_question: string): boolean => false;
