import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess, leadSchema, type Answers } from '../lib/quiz';

const ready: Answers = {
  adSpend: 'over-5000', sector: 'roofing', yearsTrading: '6-10', appointments: '50-99',
  salespeople: '4-6', closeRate: '3-4', biggestCost: 'more-quotes', averageOrderValue: '10000-19999',
  biggestImprovement: 'close-rate', timeline: 'now',
};

test('strong commercial fit is scored as priority', () => assert.deepEqual(assess(ready), { score: 100, route: 'training', tier: 'priority' }));
test('lower-intent answers remain eligible for the training', () => {
  const result = assess({ ...ready, adSpend: 'under-5000', appointments: 'under-10', salespeople: '1', closeRate: '9-10', averageOrderValue: 'under-5000', timeline: 'researching' });
  assert.deepEqual(result, { score: 0, route: 'training', tier: 'nurture' });
});

const payload = {
  id: 'b754d126-e132-4f68-9d80-d44795c64b18', answers: ready, name: 'Test Owner', company: 'Test Roofing Ltd',
  email: 'owner@example.com', phone: '07700900123', consent: true, marketing: false, website: '',
  attribution: { utm_source: 'facebook' },
};

test('valid business enquiry accepted with optional marketing off', () => assert.equal(leadSchema.safeParse(payload).success, true));
test('invalid answer, missing company, consent, malformed email and honeypot are rejected', () => {
  for (const change of [
    { answers: { ...ready, timeline: 'someday' } }, { company: '' }, { consent: false }, { email: 'bad' },
    { website: 'spam' }, { phone: 'abcdefghij' },
  ]) assert.equal(leadSchema.safeParse({ ...payload, ...change }).success, false);
});
