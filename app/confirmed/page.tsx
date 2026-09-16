import type { Metadata } from 'next';
import Diagnostic from './Diagnostic';
import './diagnostic.css';

export const metadata: Metadata = {
  title: 'Your Pre-Call Sales Diagnostic | Paul Broome Sales Mastery',
  description: 'Complete your private pre-call sales diagnostic so Paul can prepare for a focused, commercially useful conversation.',
  robots: { index: false, follow: false },
};

type Query = Record<string, string | string[] | undefined>;

function first(query: Query, ...keys: string[]) {
  for (const key of keys) {
    const value = query[key];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 500);
    if (Array.isArray(value) && value[0]?.trim()) return value[0].trim().slice(0, 500);
  }
  return '';
}

export default async function ConfirmedPage({ searchParams }: { searchParams: Promise<Query> }) {
  const raw = await searchParams;
  const query = { ...raw };
  const malformed = first(raw, 'notrack').split('?')[1];
  if (malformed) for (const [key, value] of new URLSearchParams(malformed)) if (!query[key]) query[key] = value;

  const candidateId = first(query, 'pb_submission_id', 'submission_id', 'lead_id', 'uuid');
  const submissionId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidateId) ? candidateId : '';
  const fullName = first(query, 'full_name', 'name') || [first(query, 'first_name', 'firstName'), first(query, 'last_name', 'lastName')].filter(Boolean).join(' ');

  return <Diagnostic preview={process.env.LEAD_CAPTURE_ENABLED !== 'true'} initial={{ submissionId, fullName, email:first(query,'email'), phone:first(query,'phone') }} />;
}
