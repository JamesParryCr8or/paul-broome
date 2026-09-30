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
  if (request.headers.get('x-recovery-inspect') === '1') {
    const token = process.env.GHL_PRIVATE_ACCESS_TOKEN || process.env.GHL_PRIVATE_INTEGRATION_KEY;
    if (!token) return Response.json({ error: 'CRM unavailable.' }, { status: 503 });
    const lookup = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${token}`, Version: 'v3', Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    const details = await lookup.json().catch(() => ({}));
    const list = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${process.env.GHL_LOCATION_ID}&limit=100`, {
      headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    const listed = await list.json().catch(() => ({}));
    const matchingContacts = (Array.isArray(listed.contacts) ? listed.contacts : []).filter((candidate: {customFields?:Array<{id?:string;value?:string;fieldValue?:string}>}) =>
      candidate.customFields?.some(field => field.id === 'aGaG8axf01GwZReaf79U'
        && String(field.value || field.fieldValue || '').includes(submissionId)));
    return Response.json({ configuredLocation: process.env.GHL_LOCATION_ID,
      lookupStatus: lookup.status, contactLocation: details.contact?.locationId,
      error: lookup.ok ? undefined : String(details.message || details.error || '').slice(0, 200),
      listStatus:list.status,listedCount:Array.isArray(listed.contacts) ? listed.contacts.length : undefined,
      matchingIds:matchingContacts.map((candidate: {id:string}) => candidate.id) });
  }
  try {
    await enrolGhlWorkflow(contactId, workflowId);
    return Response.json({ enrolled: true, submissionId });
  } catch (error) {
    console.error('[ghl] one-time contact workflow recovery failed', { contactId, error: String(error) });
    return Response.json({ error: 'Workflow enrollment failed.' }, { status: 503 });
  }
}
