import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as start } from '../app/api/phone-verification/start/route';
import { POST as check } from '../app/api/phone-verification/check/route';
import { POST as saveContact } from '../app/api/leads/contact/route';
import { signPhoneProof, verifyPhoneProof } from '../lib/phone-verification';

const id = '095e903d-b4ca-435c-8a1d-2007548b68c1';
const phone = '+447700900123';
const origin = 'https://example.com';

function request(path: string, body: unknown) {
  return new Request(`${origin}${path}`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

test('SMS proof is bound to the submission and phone, expires, and rejects tampering', () => {
  const previous = [process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_VERIFY_SERVICE_SID];
  process.env.TWILIO_ACCOUNT_SID = 'ACtest';
  process.env.TWILIO_AUTH_TOKEN = 'test-twilio-secret';
  process.env.TWILIO_VERIFY_SERVICE_SID = 'VAtest';
  try {
    const now = 1_000_000;
    const proof = signPhoneProof(id, phone, now);
    assert.equal(verifyPhoneProof(id, phone, proof, now), true);
    assert.equal(verifyPhoneProof(id, '+447700900124', proof, now), false);
    assert.equal(verifyPhoneProof('095e903d-b4ca-435c-8a1d-2007548b68c2', phone, proof, now), false);
    assert.equal(verifyPhoneProof(id, phone, `${proof}a`, now), false);
    assert.equal(verifyPhoneProof(id, phone, proof, now + 30 * 60 * 1000 + 1), false);
  } finally {
    (['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID'] as const).forEach((name, index) => {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    });
  }
});

test('SMS challenge blocks contact creation until Twilio approves the code', async () => {
  const names = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID', 'LEAD_CAPTURE_ENABLED'] as const;
  const previous = names.map(name => process.env[name]);
  const previousFetch = globalThis.fetch;
  process.env.TWILIO_ACCOUNT_SID = 'ACtest';
  process.env.TWILIO_AUTH_TOKEN = 'test-secret';
  process.env.TWILIO_VERIFY_SERVICE_SID = 'VAtest';
  process.env.LEAD_CAPTURE_ENABLED = 'true';
  let requests = 0;
  globalThis.fetch = async (input, init) => {
    requests++;
    const url = String(input);
    assert.match(url, /^https:\/\/verify\.twilio\.com\/v2\/Services\/VAtest\//);
    assert.match(String(init?.headers && (init.headers as Record<string, string>).Authorization), /^Basic /);
    if (url.endsWith('/Verifications')) {
      assert.equal(new URLSearchParams(String(init?.body)).get('Channel'), 'sms');
      return Response.json({ status: 'pending' });
    }
    assert.equal(new URLSearchParams(String(init?.body)).get('Code'), '123456');
    return Response.json({ status: 'approved' });
  };
  try {
    const base = { id, name: 'Example Lead', email: 'lead@example.com', phone, consent: true, marketing: false, website: '' };
    const blocked = await saveContact(request('/api/leads/contact', base));
    assert.equal(blocked.status, 403);
    assert.equal(requests, 0);

    const started = await start(request('/api/phone-verification/start', { id, phone }));
    assert.equal(started.status, 200);
    assert.equal((await started.json()).enabled, true);

    const checked = await check(request('/api/phone-verification/check', { id, phone, code: '123456' }));
    assert.equal(checked.status, 200);
    const { proof } = await checked.json();
    assert.equal(verifyPhoneProof(id, phone, proof), true);
    assert.equal(requests, 2);
  } finally {
    globalThis.fetch = previousFetch;
    names.forEach((name, index) => {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    });
  }
});
