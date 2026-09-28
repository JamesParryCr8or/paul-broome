import { z } from 'zod';
import { db, getDiagnosticProgress, hasGhlDirectSync, isTrustedRequestOrigin, verifyGhlContactId } from '@/lib/server';

export const runtime = 'nodejs';
const schema = z.object({ id:z.string().uuid(), contactId:z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/), contactToken:z.string().regex(/^[a-f0-9]{64}$/i) });

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request)) return Response.json({error:'Please open the link on the website.'},{status:403});
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({error:'Invalid request.'},{status:415});
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({error:'Invalid request.'},{status:400}); }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return Response.json({error:'Invalid link.'},{status:400});
  const {id,contactId,contactToken} = parsed.data;
  if (!verifyGhlContactId(id,contactId,contactToken)) return Response.json({error:'Invalid link.'},{status:403});
  if (!hasGhlDirectSync()) return Response.json({error:'Progress temporarily unavailable.'},{status:503});
  try {
    if (process.env.DATABASE_URL) {
      try {
        const sql = db();
        const rows = await sql`SELECT payload FROM diagnostic_sessions WHERE id=${id} LIMIT 1`;
        if (rows[0]?.payload) {
          const saved = rows[0].payload as {answers?:unknown;fullName?:string;email?:string};
          return Response.json({answers:saved.answers || {},fullName:saved.fullName || '',email:saved.email || ''});
        }
      } catch (error) { console.error('[diagnostic] database restore failed', {id,error:String(error)}); }
    }
    return Response.json(await getDiagnosticProgress(contactId));
  }
  catch (error) { console.error('[diagnostic] restore failed',{id,error:String(error)}); return Response.json({error:'Progress temporarily unavailable.'},{status:503}); }
}
