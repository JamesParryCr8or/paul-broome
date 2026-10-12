type VerificationResult = {
  result?: string;
  leadConnectorRecommendation?: { isEmailValid?: boolean };
  leadconnectorRecomendation?: { isEmailValid?: boolean };
};

function verificationDecision(value: unknown): boolean | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const recommendation = (record.leadConnectorRecommendation || record.leadconnectorRecomendation) as
    VerificationResult['leadConnectorRecommendation'];
  if (recommendation?.isEmailValid === false) return false;
  if (record.result === 'undeliverable' || record.result === 'do_not_send') return false;
  if (record.result === 'deliverable' || record.result === 'unknown' || record.result === 'catch_all') return true;
  if (recommendation?.isEmailValid === true) return true;
  for (const key of ['data', 'verification', 'emailVerification']) {
    const nested = verificationDecision(record[key]);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

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

  const body: unknown = await response.json();
  const decision = verificationDecision(body);
  if (decision !== undefined) return decision;

  // A successful but undocumented response must not strand every lead. The form's
  // email syntax check still applies; log only field names to diagnose the shape.
  console.warn('[lead capture] unrecognised email verification response', {
    fields: body && typeof body === 'object' ? Object.keys(body) : [],
  });
  return true;
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
