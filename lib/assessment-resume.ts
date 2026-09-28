import { questions, type Answers } from './quiz';
import { assessmentGhlFields } from './ghl-fields';

export const formUrlFieldId = 'aGaG8axf01GwZReaf79U';
export const assessmentStepIds = questions.map(question => question.id);

export function assessmentResumeUrl(origin: string, id: string, step: string, contactId: string, token: string, squeeze: boolean) {
  const url = new URL(squeeze ? '/squeeze' : '/', origin);
  url.searchParams.set('pb_submission_id', id);
  url.searchParams.set('pb_step', step);
  url.searchParams.set('pb_contact_id', contactId);
  url.searchParams.set('pb_resume_token', token);
  return url.toString();
}

export function answersFromGhlFields(fields: unknown): Partial<Answers> {
  const values = new Map<string, string>();
  if (Array.isArray(fields)) {
    for (const field of fields) {
      if (!field || typeof field !== 'object') continue;
      const entry = field as Record<string, unknown>;
      const id = String(entry.id || entry.fieldId || '');
      const value = entry.fieldValue ?? entry.value;
      if (id && (typeof value === 'string' || typeof value === 'number')) values.set(id, String(value));
    }
  } else if (fields && typeof fields === 'object') {
    for (const [id, value] of Object.entries(fields)) {
      if (typeof value === 'string' || typeof value === 'number') values.set(id, String(value));
    }
  }
  const answers: Partial<Answers> = {};
  for (const question of questions) {
    const fieldId = assessmentGhlFields[question.id];
    const saved = values.get(fieldId);
    const option = question.options.find(option => option.value === saved || option.label === saved);
    if (option) answers[question.id] = option.value;
  }
  return answers;
}
