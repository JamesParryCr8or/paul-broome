import { after } from 'next/server';
import { createHash } from 'node:crypto';
import { leadSchema, assess, type Answers } from '@/lib/quiz';
import { db, diagnosticResumeUrl, hasGhlDirectSync, isTrustedRequestOrigin, publicNextStep, sendGhlWebhook, syncLead, syncLeadDirect } from '@/lib/server';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function POST(request: Request) {
    if (!isTrustedRequestOrigin(request))
        return Response.json({ error: 'Please submit from the website.' }, { status: 403 });
    if (!request.headers.get('content-type')?.startsWith('application/json'))
        return Response.json({ error: 'Invalid request.' }, { status: 415 });
    if (Number(request.headers.get('content-length') || 0) > 12000)
        return Response.json({ error: 'Request too large.' }, { status: 413 });
    const reader = request.body?.getReader();
    if (!reader)
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done)
            break;
        size += value.byteLength;
        if (size > 12000) {
            await reader.cancel();
            return Response.json({ error: 'Request too large.' }, { status: 413 });
        }
        chunks.push(value);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    let payload: unknown;
    try {
        payload = JSON.parse(raw);
    }
    catch {
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
    }
    const parsed = leadSchema.safeParse(payload);
    if (!parsed.success)
        return Response.json({ error: 'Please check your answers, contact details and consent, then try again.' }, { status: 400 });
    const lead = parsed.data;
    const assessment = assess(lead.answers as Answers);
    if (process.env.LEAD_CAPTURE_ENABLED !== 'true')
        return Response.json({ preview: true, ...assessment, nextStepUrl: publicNextStep() });
    const hasDatabase = Boolean(process.env.DATABASE_URL);
    const hasWebhook = Boolean(process.env.GHL_WEBHOOK);
    const hasDirectSync = hasGhlDirectSync();
    if (!hasDatabase && !hasWebhook && !hasDirectSync)
        return Response.json({ error: 'Enquiries are temporarily unavailable. Please try again shortly.' }, { status: 503 });
    try {
        let savedToDatabase = false;
        if (hasDatabase) {
            const sql = db();
            const hash = createHash('sha256').update(JSON.stringify(lead)).digest('hex');
            const existing = await sql `SELECT payload_hash FROM funnel_leads WHERE id=${lead.id}`;
            if (existing.length && existing[0].payload_hash !== hash)
                return Response.json({ error: 'These answers have changed since submission. Please start the quiz again.' }, { status: 409 });
            if (!existing.length) {
                const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0] || 'local';
                const bucket = createHash('sha256').update(ip + Math.floor(Date.now() / 3600000)).digest('hex');
                const rate = await sql `INSERT INTO funnel_rate_limits (bucket,count) VALUES (${bucket},1) ON CONFLICT (bucket) DO UPDATE SET count=funnel_rate_limits.count+1 RETURNING count`;
                if (Number(rate[0].count) > 20)
                    return Response.json({ error: 'Too many attempts. Please try again in an hour.' }, { status: 429, headers: { 'Retry-After': '3600' } });
                await sql `INSERT INTO funnel_leads (id,payload,payload_hash,score,tier,route) VALUES (${lead.id},${sql.json(lead)},${hash},${assessment.score},${assessment.tier},${assessment.route}) ON CONFLICT (id) DO NOTHING`;
            }
            savedToDatabase = true;
        }
        const appOrigin = process.env.APP_ORIGIN || new URL(request.url).origin;
        const resumeUrl = diagnosticResumeUrl(appOrigin, lead);
        const deliveries = await Promise.allSettled([
          hasWebhook ? sendGhlWebhook('assessment.completed', {
            submission_id:lead.id,status:'completed',first_name:lead.name.trim().split(/\s+/)[0],full_name:lead.name,
            company:lead.company,email:lead.email,phone:lead.phone,marketing_consent:lead.marketing,
            enquiry_consent:lead.consent,lead_score:assessment.score,lead_tier:assessment.tier,lead_route:assessment.route,
            answers:lead.answers,attribution:lead.attribution,abandonment_url:resumeUrl,resume_url:resumeUrl,
          }) : Promise.resolve(),
          hasDirectSync ? syncLeadDirect(lead) : Promise.resolve(),
        ]);
        if (deliveries.every(result => result.status === 'rejected')) throw new Error('All capture destinations failed');
        if (savedToDatabase && hasDirectSync) after(() => syncLead(lead.id));
        return Response.json({ preview: false, ...assessment, nextStepUrl: publicNextStep() });
    }
    catch {
        return Response.json({ error: 'We couldn’t save your enquiry. Your answers are still here — please try again.' }, { status: 503 });
    }
}
