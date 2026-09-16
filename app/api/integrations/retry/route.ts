import { timingSafeEqual } from 'node:crypto';
import { db, syncDiagnostic, syncLead } from '@/lib/server';
export const maxDuration = 60;
export async function POST(request: Request) {
    const secret = process.env.CRM_RETRY_SECRET;
    const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
    if (!secret || !token || Buffer.byteLength(secret) !== Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(secret), Buffer.from(token)))
        return Response.json({ error: 'Unauthorised' }, { status: 401 });
    if (process.env.LEAD_CAPTURE_ENABLED !== 'true' || !process.env.DATABASE_URL)
        return Response.json({ error: 'Not configured' }, { status: 503 });
    try {
        const sql = db();
        const rows = await sql `SELECT id FROM funnel_leads WHERE (sync_status IN ('failed','pending') OR (sync_status='processing' AND sync_started_at < now()-interval '5 minutes')) AND sync_attempts<10 ORDER BY created_at LIMIT 3`;
        for (const row of rows)
            await syncLead(row.id);
        const diagnostics = await sql `SELECT id FROM diagnostic_sessions WHERE (sync_status IN ('failed','pending') OR (sync_status='processing' AND sync_started_at < now()-interval '5 minutes')) AND sync_attempts<10 ORDER BY updated_at LIMIT 3`;
        for (const row of diagnostics)
            await syncDiagnostic(row.id);
        await sql `DELETE FROM funnel_rate_limits WHERE created_at < now()-interval '2 hours'`;
        return Response.json({ attempted: rows.length + diagnostics.length });
    }
    catch {
        return Response.json({ error: 'Retry unavailable' }, { status: 503 });
    }
}
