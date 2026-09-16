import { after } from 'next/server';
import { diagnosticSaveSchema, validateCompletedDiagnostic } from '@/lib/diagnostic';
import { db, diagnosticResumeUrl, sendGhlWebhook, syncDiagnostic } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

function validOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (origin === allowed) return true;
  if (process.env.NODE_ENV !== 'development' || !origin) return false;
  try {
    const submitted = new URL(origin);
    const expected = new URL(allowed);
    return ['127.0.0.1','localhost'].includes(submitted.hostname) && ['127.0.0.1','localhost'].includes(expected.hostname) && submitted.port === expected.port;
  } catch { return false; }
}

export async function POST(request: Request) {
  if (!validOrigin(request)) return Response.json({error:'Please submit from the website.'},{status:403});
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({error:'Invalid request.'},{status:415});
  if (Number(request.headers.get('content-length')||0)>24000) return Response.json({error:'Request too large.'},{status:413});
  const reader = request.body?.getReader();
  if (!reader) return Response.json({error:'Invalid request.'},{status:400});
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const {value,done} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 24000) { await reader.cancel(); return Response.json({error:'Request too large.'},{status:413}); }
    chunks.push(value);
  }
  let payload: unknown;
  try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return Response.json({error:'Invalid request.'},{status:400}); }
  const parsed = diagnosticSaveSchema.safeParse(payload);
  if (!parsed.success) return Response.json({error:'Please check the answer you just entered.'},{status:400});
  const diagnostic = parsed.data;
  if (diagnostic.completed && !validateCompletedDiagnostic(diagnostic)) return Response.json({error:'Please complete every required question before submitting.'},{status:400});

  if (process.env.LEAD_CAPTURE_ENABLED !== 'true') return Response.json({preview:true,saved:true,completed:diagnostic.completed});
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  const hasWebhook = Boolean(process.env.GHL_WEBHOOK);
  if (!hasDatabase && !hasWebhook) return Response.json({error:'Saving is temporarily unavailable. Your answers are still on this device.'},{status:503});
  try {
    const status = diagnostic.completed ? 'completed' : 'started';
    let savedToDatabase = false;
    if (hasDatabase) {
      const sql = db();
      const rows = await sql `
        INSERT INTO diagnostic_sessions (id,lead_id,payload,revision,current_step,status,completed_at,sync_status,updated_at)
        VALUES (${diagnostic.id},${diagnostic.id},${sql.json(diagnostic)},${diagnostic.revision},${diagnostic.currentStep},${status},${diagnostic.completed?new Date():null},'pending',now())
        ON CONFLICT (id) DO UPDATE SET
          payload=EXCLUDED.payload, revision=EXCLUDED.revision, current_step=EXCLUDED.current_step,
          status=CASE WHEN diagnostic_sessions.status='completed' THEN 'completed' ELSE EXCLUDED.status END,
          completed_at=COALESCE(diagnostic_sessions.completed_at,EXCLUDED.completed_at), sync_status='pending', updated_at=now()
        WHERE diagnostic_sessions.revision < EXCLUDED.revision
        RETURNING id`;
      savedToDatabase = rows.length > 0;
    }
    if (hasWebhook) {
      const appOrigin = process.env.APP_ORIGIN || new URL(request.url).origin;
      const resumeUrl = diagnosticResumeUrl(appOrigin, diagnostic);
      await sendGhlWebhook(diagnostic.completed ? 'diagnostic.completed' : 'diagnostic.progress', {
        diagnostic_submission_id:diagnostic.id,submission_id:diagnostic.id,status,current_step:diagnostic.currentStep,
        revision:diagnostic.revision,full_name:diagnostic.fullName,email:diagnostic.email,phone:diagnostic.phone,
        answers:diagnostic.answers,abandonment_url:resumeUrl,resume_url:resumeUrl,
      });
    }
    if (savedToDatabase && process.env.GHL_PRIVATE_INTEGRATION_KEY && process.env.GHL_LOCATION_ID) after(() => syncDiagnostic(diagnostic.id));
    return Response.json({preview:false,saved:true,completed:diagnostic.completed});
  } catch {
    return Response.json({error:'We could not save that answer right now. It remains on this device—please try again.'},{status:503});
  }
}

export const PATCH = POST;
