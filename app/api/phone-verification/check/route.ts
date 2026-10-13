import { z } from 'zod';
import { phoneSchema } from '@/lib/phone';
import { isTrustedRequestOrigin } from '@/lib/server';
import { checkPhoneVerification, phoneVerificationEnabled, signPhoneProof } from '@/lib/phone-verification';

export const runtime = 'nodejs';
export const maxDuration = 15;

const schema = z.object({ id: z.string().uuid(), phone: phoneSchema, code: z.string().trim().regex(/^\d{4,10}$/) });

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request)) return Response.json({ error: 'Please submit from the website.' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'Invalid request.' }, { status: 415 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Enter the code sent to your phone.' }, { status: 400 });
  if (process.env.LEAD_CAPTURE_ENABLED !== 'true' || !phoneVerificationEnabled()) return Response.json({ error: 'Phone verification is unavailable.' }, { status: 503 });
  try {
    if (!await checkPhoneVerification(parsed.data.phone, parsed.data.code))
      return Response.json({ error: 'That code is incorrect or has expired. Please try again.' }, { status: 422 });
    return Response.json({ proof: signPhoneProof(parsed.data.id, parsed.data.phone) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'We couldn’t check the code right now.' }, { status: 503 });
  }
}
