import { ClaimIdInputSchema } from '@claimsense/shared';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { env } from '../../core/env';
import { fail } from '../../core/errors';
import { handler, parse, sendError } from '../../core/http';
import { requireUser } from '../../core/session';
import { uploadAndExtract } from './extraction.service';

// Memory only (golden rule 9): the bytes live in this request and are never written to disk or kept.
// The file name multer reports is never read or logged.
const single = (req: Request, res: Response, next: NextFunction) =>
  multer({ storage: multer.memoryStorage(), limits: { fileSize: env().MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 2 } }).single('file')(
    req,
    res,
    (err: unknown) => {
      if (err instanceof multer.MulterError) return sendError(res, err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'VALIDATION_FAILED');
      if (err) return next(err);
      next();
    },
  );

export const extractionRoutes = Router({ mergeParams: true }).post(
  '/documents',
  // The session is checked before the body is read, so a stranger cannot make the server buffer 4 MB.
  (req, res, next) => (req.user ? next() : sendError(res, 'AUTH_REQUIRED')),
  single,
  handler('uploadAndExtract', (req) => {
    const user = requireUser(req);
    const { claimId } = parse(ClaimIdInputSchema, { claimId: req.params.claimId });
    if (!req.file) return fail('VALIDATION_FAILED');
    return uploadAndExtract(user.id, claimId, new Uint8Array(req.file.buffer));
  }),
);
