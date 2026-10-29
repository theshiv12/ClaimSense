import express from 'express';

/** Placeholder until the modules land (red commit): every route is missing. */
export const createApp = () => {
  const app = express();
  app.use((_req, res) => void res.status(404).json({ ok: false, code: 'NOT_FOUND' }));
  return app;
};
