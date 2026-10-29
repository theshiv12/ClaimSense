import { StartSampleInputSchema } from '@claimsense/shared';
import { Router } from 'express';
import { fail } from '../../core/errors';
import { handler, parse } from '../../core/http';
import { sessionPort } from '../../core/session';
import { samplePreview, startSample } from './samples.service';

export const samplesRoutes = Router()
  // Only sample B has a landing-page preview.
  .get('/:caseId/preview', handler('samplePreview', (req) => Promise.resolve(req.params.caseId === 'B' ? samplePreview() : fail('NOT_FOUND'))))
  // A POST, never a GET: a link, crawler or prefetch can never create a guest (CLAUDE.md).
  .post(
    '/:caseId',
    handler('startSample', (req, res) => {
      const { caseId } = parse(StartSampleInputSchema, { caseId: req.params.caseId });
      return startSample(caseId, req.user ?? null, req.ip ?? 'unknown', sessionPort(req, res));
    }),
  );
