type VerificationResult = {
  result?: string;
  leadConnectorRecommendation?: { isEmailValid?: boolean };
};

export async function verifyGhlEmail(email: string): Promise<boolean> {
  const token = process.env.GHL_PRIVATE_ACCESS_TOKEN || process.env.GHL_PRIVATE_INTEGRATION_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) throw new Error('CRM email verification is not configured');

  const endpoint = new URL('https://services.leadconnectorhq.com/email/verify');
  endpoint.searchParams.set('locationId', locationId);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Version: 'v3', Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'email', verify: email }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`CRM email verification status ${response.status}`);

  const body = await response.json() as VerificationResult | { data?: VerificationResult };
  const result = 'data' in body && body.data ? body.data : body as VerificationResult;
  if (!['deliverable', 'undeliverable', 'do_not_send', 'unknown', 'catch_all'].includes(result.result || ''))
    throw new Error('CRM email verification returned an unexpected result');
  return result.leadConnectorRecommendation?.isEmailValid !== false
    && result.result !== 'undeliverable' && result.result !== 'do_not_send';
}
import { createHash } from 'node:crypto';
import { db } from './server';


export async function emailVerificationAllowed(request: Request): Promise<boolean> {
  if (!process.env.DATABASE_URL) return true;
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0] || 'local';
  const hour = Math.floor(Date.now() / 3600000);
  const bucket = createHash('sha256').update(`email-check:${ip}:${hour}`).digest('hex');
  const sql = db();
  const rate = await sql`INSERT INTO funnel_rate_limits (bucket,count) VALUES (${bucket},1)
    ON CONFLICT (bucket) DO UPDATE SET count=funnel_rate_limits.count+1 RETURNING count`;
  return Number(rate[0].count) <= 20;
}
