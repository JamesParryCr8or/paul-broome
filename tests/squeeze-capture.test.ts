import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqueezeGhlContact, syncDiagnosticDirect, syncLeadDirect } from '../lib/server';
import type { Lead } from '../lib/quiz';
import type { DiagnosticSave } from '../lib/diagnostic';
import { formUrlFieldId } from '../lib/assessment-resume';

test('both funnels enter the contact workflow once when details are saved', async () => {
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
    const contactId = await createSqueezeGhlContact({ id: '095e903d-b4ca-435c-8a1d-2007548b68c1', name: 'Test Owner', email: 'test@example.com', phone: '07700900123' }, 'https://example.com');
    assert.equal(contactId, 'test-contact');
    assert.deepEqual(calls[1].body, { tags: ['cr8or_ai_squeeze_page'] });
    assert.equal(calls[2].method, 'PUT');
    const initialUrl = (calls[2].body.customFields as { id: string; fieldValue: string }[]).find(field => field.id === formUrlFieldId)?.fieldValue;
    assert.match(String(initialUrl), /^https:\/\/example.com\/squeeze\?pb_submission_id=.*&pb_step=adSpend&pb_contact_id=test-contact&pb_resume_token=/);
    const contactWorkflowPath = '/workflow/89d5d11d-7b0d-4ed3-82ba-10740a1ae8d2';
    assert.equal(calls.filter(call => call.url.includes(contactWorkflowPath)).length, 1);
    assert.equal(calls.some(call => call.url.includes('/workflow/1666b6d0-8721-40fc-afe5-cebccaa39dde')), false);
    const beforeAssessment = calls.length;
    await syncLeadDirect({ id: '095e903d-b4ca-435c-8a1d-2007548b68c1', name: 'Test Owner', email: 'test@example.com', phone: '07700900123', company: '', answers: {} } as Lead, 'https://example.com', contactId);
    assert.equal(calls.filter(call => call.url.endsWith('/upsert')).length, 1);
    assert.equal(calls[beforeAssessment].method, 'PUT');
    assert.ok(calls[beforeAssessment].url.endsWith('/contacts/test-contact'));
    const bookingUrl = (calls[beforeAssessment + 2].body.customFields as { id: string; fieldValue: string }[]).find(field => field.id === formUrlFieldId)?.fieldValue;
    assert.match(String(bookingUrl), /pb_step=booking/);
    assert.equal(calls.filter(call => call.url.includes(contactWorkflowPath)).length, 1);
    assert.equal(calls.filter(call => JSON.stringify(call.body).includes('cr8or_ai_squeeze_page')).length, 1);
    const assessmentWorkflowCalls = calls.filter(call => call.url.includes('/workflow/1666b6d0-8721-40fc-afe5-cebccaa39dde'));
    assert.equal(assessmentWorkflowCalls.length, 1);
    assert.match(String(assessmentWorkflowCalls[0].body.eventStartTime), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/);
    await syncLeadDirect({ id: '095e903d-b4ca-435c-8a1d-2007548b68c2', name: 'Homepage Owner', email: 'home@example.com', phone: '07700900124', company: '', answers: {} } as Lead, 'https://example.com');
    assert.equal(calls.filter(call => call.url.includes(contactWorkflowPath)).length, 2);
    assert.equal(calls.filter(call => call.url.includes('/workflow/1666b6d0-8721-40fc-afe5-cebccaa39dde')).length, 2);
    await syncDiagnosticDirect({ id: '095e903d-b4ca-435c-8a1d-2007548b68c1', currentStep: 15, fullName: 'Test Owner', email: 'test@example.com', phone: '07700900123', answers: {}, completed: true } as DiagnosticSave, 'https://example.com');
    const diagnosticUrl = calls.flatMap(call => Array.isArray(call.body.customFields) ? call.body.customFields as { id: string; fieldValue: string }[] : [])
      .filter(field => field.id === formUrlFieldId).at(-1)?.fieldValue;
    assert.match(String(diagnosticUrl), /^https:\/\/example.com\/confirmed\?.*pb_step=complete.*pb_contact_id=test-contact/);
    const diagnosticWorkflowCall = calls.find(call => call.url.includes('/workflow/2d5ea5b0-50dc-4613-89ab-b99f2b80b3e1'));
    assert.ok(diagnosticWorkflowCall);
    assert.match(String(diagnosticWorkflowCall.body.eventStartTime), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/);
    failWorkflow = true;
    await assert.doesNotReject(() => syncLeadDirect({ id: '095e903d-b4ca-435c-8a1d-2007548b68c1', name: 'Test Owner', email: 'test@example.com', phone: '07700900123', company: '', answers: {} } as Lead, 'https://example.com', contactId));
    failContact = true;
    await assert.rejects(() => syncLeadDirect({ id: '095e903d-b4ca-435c-8a1d-2007548b68c1', name: 'Test Owner', email: 'test@example.com', phone: '07700900123', company: '', answers: {} } as Lead, 'https://example.com', contactId), /CRM contact update status 503/);
  } finally {
    globalThis.fetch = originalFetch;
    if (token === undefined) delete process.env.GHL_PRIVATE_ACCESS_TOKEN;
    else process.env.GHL_PRIVATE_ACCESS_TOKEN = token;
    if (location === undefined) delete process.env.GHL_LOCATION_ID;
    else process.env.GHL_LOCATION_ID = location;
  }
});
