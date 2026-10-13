import { createHmac, timingSafeEqual } from 'node:crypto';

const proofLifetimeMs = 30 * 60 * 1000;

export function phoneVerificationEnabled() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID);
}

function configuration() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !serviceSid) throw new Error('Twilio Verify is not configured');
  return { accountSid, authToken, serviceSid };
}

async function verifyRequest(action: 'Verifications' | 'VerificationCheck', fields: Record<string, string>) {
  const { accountSid, authToken, serviceSid } = configuration();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/${action}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(fields),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    if (action === 'VerificationCheck' && (response.status === 400 || response.status === 404)) return { status: 'invalid' };
    console.error('[phone verification] provider request failed', { action, status: response.status });
    throw new Error(response.status === 429 ? 'Too many codes requested. Please wait before trying again.' : 'We couldn’t send or check the code right now. Please try again.');
  }
  return response.json() as Promise<{ status?: string }>;
}

export async function startPhoneVerification(phone: string) {
  const result = await verifyRequest('Verifications', { To: phone, Channel: 'sms' });
  if (result.status !== 'pending') throw new Error('We couldn’t send the code right now. Please try again.');
}

export async function checkPhoneVerification(phone: string, code: string) {
  const result = await verifyRequest('VerificationCheck', { To: phone, Code: code });
  return result.status === 'approved';
}

function signature(payload: string) {
  const { authToken } = configuration();
  return createHmac('sha256', authToken).update(`paul-broome-phone-proof:${payload}`).digest('hex');
}

export function signPhoneProof(submissionId: string, phone: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ id: submissionId, phone, expires: now + proofLifetimeMs })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function verifyPhoneProof(submissionId: string, phone: string, proof: unknown, now = Date.now()) {
  if (typeof proof !== 'string' || proof.length > 1000) return false;
  const [payload, provided, extra] = proof.split('.');
  if (!payload || !provided || extra || !/^[a-f0-9]{64}$/.test(provided)) return false;
  try {
    const expected = Buffer.from(signature(payload), 'hex');
    if (!timingSafeEqual(expected, Buffer.from(provided, 'hex'))) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.id === submissionId && data.phone === phone && Number.isSafeInteger(data.expires)
      && data.expires >= now && data.expires <= now + proofLifetimeMs;
  } catch { return false; }
}
