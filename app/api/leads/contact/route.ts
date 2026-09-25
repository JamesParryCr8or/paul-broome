import { z } from 'zod';
import { createSqueezeGhlContact, hasGhlDirectSync, isTrustedRequestOrigin, signGhlContactId } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 20;

const contactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(10).max(22).regex(/^[+()\d\s.-]+$/).refine(value => value.replace(/\D/g, '').length >= 10),
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
  if (!parsed.success) return Response.json({ error: 'Please check your contact details and consent, then try again.' }, { status: 400 });
  if (process.env.LEAD_CAPTURE_ENABLED !== 'true') return Response.json({ preview: true });
  if (!hasGhlDirectSync()) return Response.json({ error: 'Enquiries are temporarily unavailable. Please try again shortly.' }, { status: 503 });
  try {
    const contactId = await createSqueezeGhlContact(parsed.data);
    return Response.json({ preview: false, contactId, contactToken: signGhlContactId(parsed.data.id, contactId) });
  } catch (error) {
    console.error('[lead capture] initial contact creation failed', error);
    return Response.json({ error: 'We couldn’t save your contact details. Please try again.' }, { status: 503 });
  }
}
