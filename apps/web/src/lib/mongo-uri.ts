export const MONGO_URI_PROBLEMS = ['empty'] as const;
export type MongoUriProblem = (typeof MONGO_URI_PROBLEMS)[number];
export const mongoUriProblem = (_uri: string | undefined): MongoUriProblem | null => null;
export const mongoUriHint = (_problem: MongoUriProblem): string => '';
