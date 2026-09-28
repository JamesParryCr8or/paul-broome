import test from 'node:test';
import assert from 'node:assert/strict';
import { answersFromGhlFields, assessmentResumeUrl } from '../lib/assessment-resume';
import { assessmentGhlFields } from '../lib/ghl-fields';

test('resume link identifies the submission and unanswered question', () => {
  const url = new URL(assessmentResumeUrl('https://example.com', '095e903d-b4ca-435c-8a1d-2007548b68c1', 'closeRate', 'contact123', 'signed-token', true));
  assert.equal(url.pathname, '/squeeze');
  assert.equal(url.searchParams.get('pb_step'), 'closeRate');
  assert.equal(url.searchParams.get('pb_submission_id'), '095e903d-b4ca-435c-8a1d-2007548b68c1');
});

test('saved CRM answer labels restore selected choices', () => {
  const answers = answersFromGhlFields([{ id: assessmentGhlFields.timeline, fieldValue: 'Immediately' }]);
  assert.equal(typeof answers.timeline, 'string');
});
