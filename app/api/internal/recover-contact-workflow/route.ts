import { createHash, timingSafeEqual } from 'node:crypto';
import { enrolGhlWorkflow } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 20;

const submissionId = '8bd3bed2-a7b3-4190-b11c-fca223bbff34';
const contactId = 'HroViW5RWFdojBa5PZcF';
const workflowId = '89d5d11d-7b0d-4ed3-82ba-10740a1ae8d2';
const recoveryKeyHash = 'd006efdca7fd525091570f3d6960f2012881b935379c300786a1f15284c736a7';
const expiresAt = Date.parse('2026-09-30T20:57:38.275Z');

export async function POST(request: Request) {
  if (Date.now() > expiresAt) return Response.json({ error: 'Expired.' }, { status: 410 });
  const suppliedKey = request.headers.get('x-recovery-key') || '';
  if (!/^[a-f0-9]{64}$/.test(suppliedKey)) return Response.json({ error: 'Forbidden.' }, { status: 403 });
  const actual = Buffer.from(createHash('sha256').update(suppliedKey).digest('hex'), 'hex');
  const expected = Buffer.from(recoveryKeyHash, 'hex');
  if (!timingSafeEqual(actual, expected)) return Response.json({ error: 'Forbidden.' }, { status: 403 });
  try {
    await enrolGhlWorkflow(contactId, workflowId);
    return Response.json({ enrolled: true, submissionId });
  } catch (error) {
    console.error('[ghl] one-time contact workflow recovery failed', { contactId, error: String(error) });
    return Response.json({ error: 'Workflow enrollment failed.' }, { status: 503 });
  }
}
