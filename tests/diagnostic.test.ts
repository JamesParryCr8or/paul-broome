import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnosticSaveSchema, validateCompletedDiagnostic } from '../lib/diagnostic';

const complete = {
  id:'b754d126-e132-4f68-9d80-d44795c64b18', revision:15, currentStep:15, completed:true,
  fullName:'Test Owner', email:'owner@example.com', phone:'+447700900123', attribution:{landing_path:'/confirmed'},
  answers:{
    offerAndAov:'Replacement roofs, £14,500', monthlyRevenue:'30k-50k', qualifiedLeads:'18', closeRate:'35',
    lostReason:'price', lostDeals:'6', lostValue:'72000', structuredProcess:'somewhat-inconsistent',
    coachingInvestment:'no', frustration:'Too much discounting', whyNow:'Lead costs are rising',
    consequences:'More pressure and less predictable cash flow', soleDecisionMaker:'yes', readyToInvest:'yes-ready',
  },
} as const;

test('complete diagnostic is accepted', () => {
  const parsed = diagnosticSaveSchema.safeParse(complete);
  assert.equal(parsed.success, true);
  assert.equal(parsed.success && validateCompletedDiagnostic(parsed.data), true);
});

test('partial diagnostic is valid for abandonment saving', () => {
  const parsed = diagnosticSaveSchema.safeParse({...complete,completed:false,currentStep:3,answers:{offerAndAov:'Windows, £8,000'}});
  assert.equal(parsed.success, true);
  assert.equal(parsed.success && validateCompletedDiagnostic(parsed.data), false);
});

test('conditional detail is required after previous coaching', () => {
  const parsed = diagnosticSaveSchema.safeParse({...complete,answers:{...complete.answers,coachingInvestment:'yes'}});
  assert.equal(parsed.success, true);
  assert.equal(parsed.success && validateCompletedDiagnostic(parsed.data), false);
});

test('close rate above 100 is rejected', () => assert.equal(diagnosticSaveSchema.safeParse({...complete,answers:{...complete.answers,closeRate:'101'}}).success,false));
