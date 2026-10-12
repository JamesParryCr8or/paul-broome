import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneSchema } from '../lib/phone';
import { POST as saveSqueezeContact } from '../app/api/leads/contact/route';

test('international phone validation accepts E.164 numbers and rejects incomplete numbers', () => {
  assert.equal(phoneSchema.safeParse('+447700900123').success, true);
  assert.equal(phoneSchema.safeParse('+12025550144').success, true);
  assert.equal(phoneSchema.safeParse('07700900123').success, false);
  assert.equal(phoneSchema.safeParse('+44123').success, false);
});

test('an undeliverable email cannot create a squeeze contact', async () => {
  const previousFetch = globalThis.fetch;
  const previousToken = process.env.GHL_PRIVATE_ACCESS_TOKEN;
  const previousLocation = process.env.GHL_LOCATION_ID;
  const previousCapture = process.env.LEAD_CAPTURE_ENABLED;
  let requests = 0;
  process.env.GHL_PRIVATE_ACCESS_TOKEN = 'test-token';
  process.env.GHL_LOCATION_ID = 'test-location';
  process.env.LEAD_CAPTURE_ENABLED = 'true';
  globalThis.fetch = async input => {
    requests++;
    assert.match(String(input), /\/email\/verify\?locationId=test-location$/);
    return Response.json({ result: 'undeliverable', risk: 'low', address: 'missing@example.com',
      leadConnectorRecommendation: { isEmailValid: false } }, { status: 201 });
  };
  try {
    const response = await saveSqueezeContact(new Request('https://example.com/api/leads/contact', {
      method: 'POST',
      headers: { origin: 'https://example.com', 'content-type': 'application/json' },
      body: JSON.stringify({ id: '095e903d-b4ca-435c-8a1d-2007548b68c1', name: 'Example Lead',
        email: 'missing@example.com', phone: '+447700900123', consent: true, marketing: false, website: '' }),
    }));
    assert.equal(response.status, 422);
    assert.match((await response.json()).error, /email address could not be verified/i);
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.GHL_PRIVATE_ACCESS_TOKEN;
    else process.env.GHL_PRIVATE_ACCESS_TOKEN = previousToken;
    if (previousLocation === undefined) delete process.env.GHL_LOCATION_ID;
    else process.env.GHL_LOCATION_ID = previousLocation;
    if (previousCapture === undefined) delete process.env.LEAD_CAPTURE_ENABLED;
    else process.env.LEAD_CAPTURE_ENABLED = previousCapture;
  }
});
