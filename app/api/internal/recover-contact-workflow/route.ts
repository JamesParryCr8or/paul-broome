import { createHash, timingSafeEqual } from 'node:crypto';
import { formUrlFieldId } from '@/lib/assessment-resume';
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
  const token = process.env.GHL_PRIVATE_ACCESS_TOKEN || process.env.GHL_PRIVATE_INTEGRATION_KEY;
  if (!token) return Response.json({ error: 'CRM unavailable.' }, { status: 503 });
  try {
    const lookup = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${token}`, Version: 'v3', Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!lookup.ok) throw new Error(`Contact lookup status ${lookup.status}`);
    const contact = (await lookup.json()).contact;
    const formField = (contact?.customFields || contact?.customField || []).find((field: {id?:string;fieldId?:string}) =>
      (field.id || field.fieldId) === formUrlFieldId);
    const resumeUrl = new URL(String(formField?.fieldValue || formField?.value || ''));
    if (contact?.locationId !== process.env.GHL_LOCATION_ID
      || resumeUrl.searchParams.get('pb_submission_id') !== submissionId
      || resumeUrl.searchParams.get('pb_contact_id') !== contactId
      || resumeUrl.pathname !== '/squeeze') {
      return Response.json({ error: 'Contact verification failed.' }, { status: 409 });
    }
    await enrolGhlWorkflow(contactId, workflowId);
    return Response.json({ enrolled: true });
  } catch (error) {
    console.error('[ghl] one-time contact workflow recovery failed', { contactId, error: String(error) });
    return Response.json({ error: 'Workflow enrollment failed.' }, { status: 503 });
  }
}
