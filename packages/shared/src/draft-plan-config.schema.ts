const notImplemented = (value?: unknown): never => {
  void value;
  throw new Error('not implemented');
};

export const DraftClauseRefSchema = { parse: notImplemented, safeParse: notImplemented };
export const DraftPlanConfigSchema = { parse: notImplemented, safeParse: notImplemented };
