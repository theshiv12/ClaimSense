import { NextResponse, type NextRequest } from 'next/server';
import { startSample } from '@/server/actions/auth';

// /sample/A..D: a guest session with a synthetic sample claim, then its estimate. No AI call.
export async function GET(request: NextRequest, ctx: RouteContext<'/sample/[caseId]'>) {
  const { caseId } = await ctx.params;
  const r = await startSample({ caseId: caseId.toUpperCase() });
  if (!r.ok) {
    const status = r.code === 'RATE_LIMITED' ? 429 : 404;
    return new NextResponse(r.code === 'RATE_LIMITED' ? 'Too many samples from this network. Try again in an hour.' : 'Not found', { status });
  }
  return NextResponse.redirect(new URL(`/claims/${r.data.claimId}`, request.url), 303);
}
