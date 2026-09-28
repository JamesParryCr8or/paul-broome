import { z } from 'zod';
import { assessmentStepIds } from '@/lib/assessment-resume';
import { partialAnswersSchema } from '@/lib/quiz';
import { getAssessmentProgress, hasGhlDirectSync, isTrustedRequestOrigin, updateAssessmentProgress, verifyGhlContactId } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 20;

const identity = {
  id: z.string().uuid(),
  contactId: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/),
  contactToken: z.string().regex(/^[a-f0-9]{64}$/i),
};
const requestSchema = z.discriminatedUnion('action', [
  z.object({ ...identity, action: z.literal('restore') }),
  z.object({ ...identity, action: z.literal('update'), step: z.string().refine(value => assessmentStepIds.some(id => id === value) || value === 'contact'), answers: partialAnswersSchema }),
]);

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request)) return Response.json({ error: 'Please open the link on the website.' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'Invalid request.' }, { status: 415 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) return Response.json({ error: 'Invalid progress.' }, { status: 400 });
  const { id, contactId, contactToken } = parsed.data;
  if (!verifyGhlContactId(id, contactId, contactToken)) return Response.json({ error: 'Invalid resume link.' }, { status: 403 });
  if (!hasGhlDirectSync()) return Response.json({ error: 'Progress is temporarily unavailable.' }, { status: 503 });
  try {
    if (parsed.data.action === 'restore') return Response.json(await getAssessmentProgress(contactId));
    await updateAssessmentProgress(contactId, id, parsed.data.answers, parsed.data.step, process.env.APP_ORIGIN || new URL(request.url).origin, true);
    return Response.json({ saved: true });
  } catch (error) {
    console.error('[lead progress] CRM update failed', { submissionId: id, action: parsed.data.action, error: String(error) });
    return Response.json({ error: 'We could not update your progress right now.' }, { status: 503 });
  }
}
