import { z } from 'zod';
import { createSqueezeGhlContact, hasGhlDirectSync, isTrustedRequestOrigin, signGhlContactId } from '@/lib/server';
import { phoneSchema } from '@/lib/phone';
import { emailVerificationAllowed, verifyGhlEmail } from '@/lib/email-verification';
import { phoneVerificationEnabled, verifyPhoneProof } from '@/lib/phone-verification';

export const runtime = 'nodejs';
export const maxDuration = 20;

const contactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: phoneSchema,
  consent: z.literal(true),
  marketing: z.boolean(),
  website: z.literal(''),
});

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request)) return Response.json({ error: 'Please submit from the website.' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'Invalid request.' }, { status: 415 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) return Response.json({ error: parsed.error.issues.some(issue => issue.path[0] === 'email')
    ? 'Enter a valid email address.' : parsed.error.issues.some(issue => issue.path[0] === 'phone')
      ? 'Enter a valid phone number for the selected country.' : 'Please check your contact details and consent, then try again.' }, { status: 400 });
  if (process.env.LEAD_CAPTURE_ENABLED !== 'true') return Response.json({ preview: true });
  if (phoneVerificationEnabled() && !verifyPhoneProof(parsed.data.id, parsed.data.phone, (payload as Record<string, unknown>).phoneProof))
    return Response.json({ error: 'Please verify your phone number before continuing.' }, { status: 403 });
  if (!hasGhlDirectSync()) return Response.json({ error: 'Enquiries are temporarily unavailable. Please try again shortly.' }, { status: 503 });
  try {
    if (!await emailVerificationAllowed(request))
      return Response.json({ error: 'Too many attempts. Please try again in an hour.' }, { status: 429, headers: { 'Retry-After': '3600' } });
    if (!await verifyGhlEmail(parsed.data.email))
      return Response.json({ error: 'That email address could not be verified. Check it and try again.' }, { status: 422 });
  } catch (error) {
    console.error('[lead capture] email verification failed', { error: String(error) });
    return Response.json({ error: 'We couldn’t verify your email right now. Please try again.' }, { status: 503 });
  }
  try {
    const contactId = await createSqueezeGhlContact(parsed.data, process.env.APP_ORIGIN || new URL(request.url).origin);
    return Response.json({ preview: false, contactId, contactToken: signGhlContactId(parsed.data.id, contactId) });
  } catch (error) {
    console.error('[lead capture] initial contact creation failed', error);
    return Response.json({ error: 'We couldn’t save your contact details. Please try again.' }, { status: 503 });
  }
}
