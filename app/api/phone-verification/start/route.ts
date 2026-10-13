import { z } from 'zod';
import { phoneSchema } from '@/lib/phone';
import { isTrustedRequestOrigin } from '@/lib/server';
import { phoneVerificationEnabled, startPhoneVerification } from '@/lib/phone-verification';

export const runtime = 'nodejs';
export const maxDuration = 15;

const schema = z.object({ id: z.string().uuid(), phone: phoneSchema });

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request)) return Response.json({ error: 'Please submit from the website.' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'Invalid request.' }, { status: 415 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Enter a valid phone number.' }, { status: 400 });
  if (process.env.LEAD_CAPTURE_ENABLED !== 'true' || !phoneVerificationEnabled()) return Response.json({ enabled: false });
  try {
    await startPhoneVerification(parsed.data.phone);
    return Response.json({ enabled: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'We couldn’t send the code right now.' }, { status: 503 });
  }
}
