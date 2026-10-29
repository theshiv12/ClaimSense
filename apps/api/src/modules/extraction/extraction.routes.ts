import { ClaimIdInputSchema } from '@claimsense/shared';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { env } from '../../core/env';
import { fail } from '../../core/errors';
import { handler, parse, sendError } from '../../core/http';
import { findClaim } from '../../core/scope';
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
      // Any other parse failure (truncated body, bad part header, client abort) is bad input, not a 500.
      if (err) return sendError(res, 'VALIDATION_FAILED');
      next();
    },
  );

/**
 * Before a byte of the body is read: a session, and a claim this user owns. So a stranger, or a guest
 * aiming at someone else's claim, cannot make the server buffer 4 MB.
 */
const ownClaimFirst = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return sendError(res, 'AUTH_REQUIRED');
  const id = ClaimIdInputSchema.safeParse({ claimId: req.params.claimId });
  if (!id.success) return sendError(res, 'VALIDATION_FAILED');
  void findClaim(req.user.id, id.data.claimId).then((claim) => (claim ? next() : sendError(res, 'NOT_FOUND')), next);
};

export const extractionRoutes = Router({ mergeParams: true }).post(
  '/documents',
  ownClaimFirst,
  single,
  handler('uploadAndExtract', (req) => {
    const user = requireUser(req);
    const { claimId } = parse(ClaimIdInputSchema, { claimId: req.params.claimId });
    if (!req.file) return fail('VALIDATION_FAILED');
    return uploadAndExtract(user.id, claimId, new Uint8Array(req.file.buffer));
  }),
);
