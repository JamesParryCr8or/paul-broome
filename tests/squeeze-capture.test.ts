import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqueezeGhlContact, syncDiagnosticDirect, syncLeadDirect } from '../lib/server';
import type { Lead } from '../lib/quiz';
import type { DiagnosticSave } from '../lib/diagnostic';

test('squeeze capture tags the contact; assessment updates that contact without repeating the squeeze tag', async () => {
  const originalFetch = globalThis.fetch;
  const token = process.env.GHL_PRIVATE_ACCESS_TOKEN;
  const location = process.env.GHL_LOCATION_ID;
  const calls: { url: string; method?: string; body: Record<string, unknown> }[] = [];
  let failWorkflow = false;
  let failContact = false;
  process.env.GHL_PRIVATE_ACCESS_TOKEN = 'test-only';
  process.env.GHL_LOCATION_ID = 'test-location';
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method, body: JSON.parse(String(init?.body || '{}')) });
    if (failWorkflow && String(input).includes('/workflow/')) return Response.json({ message: 'Workflow unavailable' }, { status: 400 });
    if (failContact && init?.method === 'PUT') return Response.json({ message: 'Contact update unavailable' }, { status: 503 });
    return Response.json({ contact: { id: 'test-contact' } });
  };
  try {
    const contactId = await createSqueezeGhlContact({ name: 'Test Owner', email: 'test@example.com', phone: '07700900123' });
    assert.equal(contactId, 'test-contact');
    assert.deepEqual(calls[1].body, { tags: ['cr8or_ai_squeeze_page'] });
    await syncLeadDirect({ name: 'Test Owner', email: 'test@example.com', phone: '07700900123', company: '', answers: {} } as Lead, contactId);
    assert.equal(calls.filter(call => call.url.endsWith('/upsert')).length, 1);
    assert.equal(calls[2].method, 'PUT');
    assert.ok(calls[2].url.endsWith('/contacts/test-contact'));
    assert.equal(calls.filter(call => JSON.stringify(call.body).includes('cr8or_ai_squeeze_page')).length, 1);
    const assessmentWorkflowCalls = calls.filter(call => call.url.includes('/workflow/1666b6d0-8721-40fc-afe5-cebccaa39dde'));
    assert.equal(assessmentWorkflowCalls.length, 1);
    assert.match(String(assessmentWorkflowCalls[0].body.eventStartTime), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+00:00$/);
    await syncLeadDirect({ name: 'Homepage Owner', email: 'home@example.com', phone: '07700900124', company: '', answers: {} } as Lead);
    assert.equal(calls.filter(call => call.url.includes('/workflow/1666b6d0-8721-40fc-afe5-cebccaa39dde')).length, 2);
    await syncDiagnosticDirect({ fullName: 'Test Owner', email: 'test@example.com', phone: '07700900123', answers: {}, completed: true } as DiagnosticSave);
    const diagnosticWorkflowCall = calls.find(call => call.url.includes('/workflow/2d5ea5b0-50dc-4613-89ab-b99f2b80b3e1'));
    assert.ok(diagnosticWorkflowCall);
    assert.match(String(diagnosticWorkflowCall.body.eventStartTime), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+00:00$/);
    failWorkflow = true;
    await assert.doesNotReject(() => syncLeadDirect({ name: 'Test Owner', email: 'test@example.com', phone: '07700900123', company: '', answers: {} } as Lead, contactId));
    failContact = true;
    await assert.rejects(() => syncLeadDirect({ name: 'Test Owner', email: 'test@example.com', phone: '07700900123', company: '', answers: {} } as Lead, contactId), /CRM contact update status 503/);
  } finally {
    globalThis.fetch = originalFetch;
    if (token === undefined) delete process.env.GHL_PRIVATE_ACCESS_TOKEN;
    else process.env.GHL_PRIVATE_ACCESS_TOKEN = token;
    if (location === undefined) delete process.env.GHL_LOCATION_ID;
    else process.env.GHL_LOCATION_ID = location;
  }
});
