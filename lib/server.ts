import postgres from 'postgres';
import { assess, label, type Lead, type Answers, type QuestionId } from './quiz';
import { diagnosticFieldLabels, diagnosticValue, type DiagnosticAnswers, type DiagnosticSave } from './diagnostic';
import { assessmentGhlFields, diagnosticGhlFields } from './ghl-fields';
let client: ReturnType<typeof postgres> | undefined;
const assessmentWorkflowId = '1666b6d0-8721-40fc-afe5-cebccaa39dde';
const diagnosticWorkflowId = '2d5ea5b0-50dc-4613-89ab-b99f2b80b3e1';
export function db() { if (!process.env.DATABASE_URL)
    throw new Error('Database is not configured'); return client ||= postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false }); }
export function publicNextStep() { const raw = process.env.NEXT_STEP_URL; if (!raw) return undefined; try {
    const u = new URL(raw);
    return u.protocol === 'https:' ? u.toString() : undefined;
}
catch {
    return undefined;
} }
export function diagnosticResumeUrl(origin: string, contact: { id: string; name?: string; fullName?: string; email?: string; phone?: string; company?: string }) {
    const url = new URL('/confirmed', origin);
    const fullName = (contact.fullName || contact.name || '').trim();
    const names = fullName.split(/\s+/).filter(Boolean);
    url.searchParams.set('pb_submission_id', contact.id);
    if (names[0]) url.searchParams.set('first_name', names[0]);
    if (names.length > 1) url.searchParams.set('last_name', names.slice(1).join(' '));
    if (contact.email) url.searchParams.set('email', contact.email);
    if (contact.phone) url.searchParams.set('phone', contact.phone);
    if (contact.company) url.searchParams.set('company', contact.company);
    return url.toString();
}
export async function sendGhlWebhook(event: string, payload: Record<string, unknown>) {
    const raw = process.env.GHL_WEBHOOK;
    if (!raw) return false;
    let endpoint: URL;
    try { endpoint = new URL(raw); } catch { throw new Error('GHL webhook URL is invalid'); }
    if (endpoint.protocol !== 'https:') throw new Error('GHL webhook must use HTTPS');
    const response = await fetch(endpoint, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({event,event_id:String(payload.submission_id || payload.diagnostic_submission_id || ''),sent_at:new Date().toISOString(),location_id:process.env.GHL_LOCATION_ID,user_id:process.env.GHL_USER_ID,...payload}),
        signal:AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`GHL webhook status ${response.status}`);
    return true;
}
function ghlToken() { return process.env.GHL_PRIVATE_ACCESS_TOKEN || process.env.GHL_PRIVATE_INTEGRATION_KEY; }
export function hasGhlDirectSync() { return Boolean(ghlToken() && process.env.GHL_LOCATION_ID); }
export function isTrustedRequestOrigin(request: Request) {
    const origin = request.headers.get('origin');
    if (!origin) return false;
    const trusted = new Set([new URL(request.url).origin]);
    if (process.env.APP_ORIGIN) {
        try { trusted.add(new URL(process.env.APP_ORIGIN).origin); } catch { /* Invalid optional configuration is ignored. */ }
    }
    return trusted.has(origin);
}
function customFields(values: Record<string,string>, fields: Record<string,string>) { return Object.entries(fields).filter(([key]) => values[key] !== undefined).map(([key,id]) => ({id,fieldValue:values[key]})); }
async function enrolGhlWorkflow(contactId: string, workflowId: string) {
    const token = ghlToken();
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/workflow/${workflowId}`, {
        method:'POST', headers:{Authorization:`Bearer ${token}`,Version:'v3','Content-Type':'application/json'},
        body:JSON.stringify({eventStartTime:new Date().toISOString()}), signal:AbortSignal.timeout(12000),
    });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`CRM workflow status ${response.status}${body ? `: ${body.slice(0, 500)}` : ''}`);
    }
    console.info('[ghl] workflow enrolment succeeded', { contactId, workflowId });
}
async function upsertGhl(name: string, email: string, phone: string, company: string | undefined, source: string, values: Record<string,string>, fields: Record<string,string>) {
    const token = ghlToken(); if (!token || !process.env.GHL_LOCATION_ID) throw new Error('CRM not configured');
    const names = name.trim().split(/\s+/).filter(Boolean);
    const response = await fetch('https://services.leadconnectorhq.com/contacts/upsert',{method:'POST',headers:{Authorization:`Bearer ${token}`,Version:'v3','Content-Type':'application/json'},body:JSON.stringify({locationId:process.env.GHL_LOCATION_ID,firstName:names[0]||undefined,lastName:names.slice(1).join(' ')||undefined,email:email||undefined,phone:phone||undefined,companyName:company||undefined,source,customFields:customFields(values,fields)}),signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error(`CRM status ${response.status}`);
    const contactId = (await response.json()).contact?.id as string | undefined;
    if (!contactId) throw new Error('CRM missing contact ID');
    return contactId;
}
export async function syncLeadDirect(lead: Lead) {
    const values = Object.fromEntries(Object.entries(lead.answers as Answers).map(([key,value])=>[key,label(key as QuestionId,value)]));
    const contactId = await upsertGhl(lead.name,lead.email,lead.phone,lead.company,'Paul Broome Sales Leak Assessment',values,assessmentGhlFields);
    console.info('[ghl] assessment contact upserted', { contactId });
    await enrolGhlWorkflow(contactId, assessmentWorkflowId);
}
export async function syncDiagnosticDirect(diagnostic: DiagnosticSave) {
    if (!diagnostic.email&&!diagnostic.phone) return;
    const values=Object.fromEntries(Object.entries(diagnostic.answers as DiagnosticAnswers).map(([key,value])=>[key,diagnosticValue(value)]));
    const contactId = await upsertGhl(diagnostic.fullName,diagnostic.email,diagnostic.phone,undefined,'Paul Broome Pre-Call Diagnostic',values,diagnosticGhlFields);
    console.info('[ghl] diagnostic contact upserted', { contactId, completed: diagnostic.completed });
    if (diagnostic.completed) await enrolGhlWorkflow(contactId, diagnosticWorkflowId);
}
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

export async function syncDiagnostic(id: string) {
    const sql = db();
    const rows = await sql `UPDATE diagnostic_sessions SET sync_status='processing',sync_started_at=now(),sync_attempts=sync_attempts+1 WHERE id=${id} AND (sync_status IN ('pending','failed') OR (sync_status='processing' AND sync_started_at < now()-interval '5 minutes')) RETURNING *`;
    if (!rows.length)
        return;
    const row = rows[0];
    try {
        if (!process.env.GHL_PRIVATE_INTEGRATION_KEY || !process.env.GHL_LOCATION_ID)
            throw new Error('CRM not configured');
        const diagnostic = row.payload as DiagnosticSave;
        if (!diagnostic.email && !diagnostic.phone) {
            await sql `UPDATE diagnostic_sessions SET sync_status='awaiting_identity',last_sync_error=null WHERE id=${id}`;
            return;
        }
        const answers = diagnostic.answers as DiagnosticAnswers;
        const fields: Record<string,string> = JSON.parse(process.env.GHL_DIAGNOSTIC_FIELDS || '{}');
        const values: Record<string,string> = {
            diagnostic_submission_id:id,
            diagnostic_status:row.status,
            diagnostic_current_step:String(row.current_step),
            diagnostic_updated_at:new Date(row.updated_at).toISOString(),
            diagnostic_completed_at:row.completed_at ? new Date(row.completed_at).toISOString() : '',
            ...Object.fromEntries(Object.entries(answers).map(([key,value]) => [key,diagnosticValue(value)])),
        };
        const customFields = Object.entries(fields).filter(([key]) => values[key] !== undefined).map(([key,fieldId]) => ({id:fieldId,field_value:values[key]}));
        const names = diagnostic.fullName.trim().split(/\s+/);
        const response = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
            method:'POST',
            headers:{Authorization:`Bearer ${process.env.GHL_PRIVATE_INTEGRATION_KEY}`,Version:'2021-07-28','Content-Type':'application/json'},
            body:JSON.stringify({locationId:process.env.GHL_LOCATION_ID,firstName:names[0]||undefined,lastName:names.slice(1).join(' ')||undefined,email:diagnostic.email||undefined,phone:diagnostic.phone||undefined,source:'Paul Broome Pre-Call Diagnostic',customFields}),
            signal:AbortSignal.timeout(12000),
        });
        if (!response.ok) throw new Error(`CRM status ${response.status}`);
        const data = await response.json();
        const contactId = data.contact?.id;
        if (!contactId) throw new Error('CRM missing contact ID');
        let noteId = row.ghl_note_id as string | null;
        if (row.status === 'completed' && process.env.GHL_USER_ID && !noteId) {
            const lines = Object.entries(answers).filter(([,value]) => value).map(([key,value]) => `${diagnosticFieldLabels[key as keyof DiagnosticAnswers] || key}: ${diagnosticValue(value)}`);
            const noteResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, {
                method:'POST',
                headers:{Authorization:`Bearer ${process.env.GHL_PRIVATE_INTEGRATION_KEY}`,Version:'v3','Content-Type':'application/json'},
                body:JSON.stringify({userId:process.env.GHL_USER_ID,title:'Pre-call sales diagnostic',body:`Completed pre-call diagnostic\n\n${lines.join('\n')}`,color:'#72E3D6',pinned:false}),
                signal:AbortSignal.timeout(12000),
            });
            if (!noteResponse.ok) throw new Error(`CRM note status ${noteResponse.status}`);
            noteId = (await noteResponse.json()).note?.id || null;
        }
        await sql `UPDATE diagnostic_sessions SET sync_status='synced',ghl_contact_id=${contactId},ghl_note_id=${noteId},synced_at=now(),last_sync_error=null WHERE id=${id}`;
    }
    catch (e) {
        await sql `UPDATE diagnostic_sessions SET sync_status='failed',last_sync_error=${e instanceof Error?e.message:'CRM sync failed'} WHERE id=${id}`;
    }
}
