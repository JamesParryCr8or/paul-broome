import postgres from 'postgres';
import { assess, label, type Lead, type Answers, type QuestionId } from './quiz';
let client: ReturnType<typeof postgres> | undefined;
export function db() { if (!process.env.DATABASE_URL)
    throw new Error('Database is not configured'); return client ||= postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false }); }
export function publicNextStep() { const raw = process.env.NEXT_STEP_URL; if (!raw) return undefined; try {
    const u = new URL(raw);
    return u.protocol === 'https:' ? u.toString() : undefined;
}
catch {
    return undefined;
} }
export async function syncLead(id: string) {
    const sql = db();
    // Atomic lease prevents concurrent retries from sending the same submission at once.
    const rows = await sql `UPDATE funnel_leads SET sync_status='processing',sync_started_at=now(),sync_attempts=sync_attempts+1 WHERE id=${id} AND (sync_status IN ('pending','failed') OR (sync_status='processing' AND sync_started_at < now()-interval '5 minutes')) RETURNING *`;
    if (!rows.length)
        return;
    const row = rows[0];
    try {
        if (!process.env.GHL_PRIVATE_INTEGRATION_KEY || !process.env.GHL_LOCATION_ID)
            throw new Error('CRM not configured');
        const lead = row.payload as Lead;
        const a = lead.answers as Answers;
        const result = assess(a);
        const fields: Record<string, string> = JSON.parse(process.env.GHL_CUSTOM_FIELDS || '{}');
        const values: Record<string, string> = { submission_id: id, lead_score: String(result.score), lead_tier: result.tier, lead_route: result.route, marketing_consent: String(lead.marketing), enquiry_consent: 'true', consent_version: '2026-09-11-v1', consent_at: new Date(row.created_at).toISOString(), ...Object.fromEntries(Object.entries(a).map(([k, v]) => [k, label(k as QuestionId, v)])), ...lead.attribution };
        const customFields = Object.entries(fields).filter(([key]) => values[key] !== undefined).map(([key, fieldId]) => ({ id: fieldId, field_value: values[key] }));
        const names = lead.name.trim().split(/\s+/);
        const response = await fetch('https://services.leadconnectorhq.com/contacts/upsert', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GHL_PRIVATE_INTEGRATION_KEY}`, Version: '2021-07-28', 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId: process.env.GHL_LOCATION_ID, firstName: names[0], lastName: names.slice(1).join(' '), companyName: lead.company, email: lead.email, phone: lead.phone, source: 'Paul Broome Sales Leak Assessment', customFields }), signal: AbortSignal.timeout(12000) });
        if (!response.ok)
            throw new Error(`CRM status ${response.status}`);
        const data = await response.json();
        if (!data.contact?.id)
            throw new Error('CRM missing contact ID');
        // No additive interest/consent tags: avoid stale tags and accidental marketing enrolment.
        await sql `UPDATE funnel_leads SET sync_status='synced',ghl_contact_id=${data.contact.id},synced_at=now(),last_sync_error=null WHERE id=${id}`;
    }
    catch (e) {
        await sql `UPDATE funnel_leads SET sync_status='failed',last_sync_error=${e instanceof Error ? e.message : 'CRM sync failed'} WHERE id=${id}`;
    }
}
