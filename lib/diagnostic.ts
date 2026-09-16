import { z } from 'zod';

export const diagnosticAnswerSchema = z.object({
  offerAndAov: z.string().trim().min(2).max(500).optional(),
  monthlyRevenue: z.enum(['under-10k', '10k-30k', '30k-50k', '50k-plus']).optional(),
  qualifiedLeads: z.string().trim().max(40).regex(/^\d{1,5}$/).optional(),
  closeRate: z.string().trim().max(6).regex(/^\d{1,3}(\.\d{1,2})?$/).refine(value => Number(value) <= 100).optional(),
  lostReason: z.enum(['think-about-it', 'speak-to-partner', 'price', 'poor-leads', 'other']).optional(),
  lostReasonOther: z.string().trim().max(300).optional(),
  lostDeals: z.string().trim().max(40).regex(/^\d{1,5}$/).optional(),
  lostValue: z.string().trim().max(40).regex(/^\d{1,9}(\.\d{1,2})?$/).optional(),
  structuredProcess: z.enum(['yes-consistent', 'somewhat-inconsistent', 'no-wing-it']).optional(),
  coachingInvestment: z.enum(['yes', 'no']).optional(),
  coachingDetails: z.string().trim().max(1500).optional(),
  frustration: z.string().trim().min(2).max(1500).optional(),
  whyNow: z.string().trim().min(2).max(1500).optional(),
  consequences: z.string().trim().min(2).max(1500).optional(),
  soleDecisionMaker: z.enum(['yes', 'no']).optional(),
  readyToInvest: z.enum(['yes-ready', 'depends-on-cost', 'just-exploring']).optional(),
});

export type DiagnosticAnswers = z.infer<typeof diagnosticAnswerSchema>;

const attributionSchema = z.record(z.string().max(40), z.string().max(500)).refine(value => Object.keys(value).length <= 20);

export const diagnosticSaveSchema = z.object({
  id: z.string().uuid(),
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  currentStep: z.number().int().min(0).max(20),
  completed: z.boolean(),
  fullName: z.string().trim().max(100).default(''),
  email: z.union([z.literal(''), z.string().trim().email().max(254)]).default(''),
  phone: z.string().trim().max(22).default(''),
  answers: diagnosticAnswerSchema,
  attribution: attributionSchema.default({}),
});

export type DiagnosticSave = z.infer<typeof diagnosticSaveSchema>;

const requiredAnswerKeys = [
  'offerAndAov', 'monthlyRevenue', 'qualifiedLeads', 'closeRate', 'lostReason', 'lostDeals',
  'lostValue', 'structuredProcess', 'coachingInvestment', 'frustration', 'whyNow', 'consequences',
  'soleDecisionMaker', 'readyToInvest',
] as const;

export function validateCompletedDiagnostic(payload: DiagnosticSave) {
  if (payload.fullName.length < 2 || !z.string().email().safeParse(payload.email).success) return false;
  if (requiredAnswerKeys.some(key => !payload.answers[key])) return false;
  if (payload.answers.lostReason === 'other' && !payload.answers.lostReasonOther?.trim()) return false;
  if (payload.answers.coachingInvestment === 'yes' && !payload.answers.coachingDetails?.trim()) return false;
  return true;
}

const valueLabels: Record<string, string> = {
  'under-10k': 'Under £10k', '10k-30k': '£10k–£30k', '30k-50k': '£30k–£50k', '50k-plus': '£50k+',
  'think-about-it': '“Need to think about it”', 'speak-to-partner': '“Speak to partner”', price: 'Price',
  'poor-leads': 'Poor leads', other: 'Other', 'yes-consistent': 'Yes — consistent framework',
  'somewhat-inconsistent': 'Somewhat — inconsistent', 'no-wing-it': 'No — I wing it', yes: 'Yes', no: 'No',
  'yes-ready': 'Yes — ready now', 'depends-on-cost': 'Depends on cost', 'just-exploring': 'No — just exploring',
};

export function diagnosticValue(value: string | undefined) {
  return value ? valueLabels[value] || value : '';
}

export const diagnosticFieldLabels: Record<keyof DiagnosticAnswers, string> = {
  offerAndAov: 'What they sell and average order value', monthlyRevenue: 'Current monthly revenue',
  qualifiedLeads: 'Qualified leads per week', closeRate: 'Current close rate (%)',
  lostReason: 'Where most deals are lost', lostReasonOther: 'Other loss reason',
  lostDeals: 'Deals lost last month that should have closed', lostValue: 'Approximate value of lost deals (£)',
  structuredProcess: 'Structured sales process', coachingInvestment: 'Previously invested in sales coaching/training',
  coachingDetails: 'What they tried and why it did not work', frustration: 'Biggest sales frustration',
  whyNow: 'Why fixing it now matters', consequences: 'Personal consequences if nothing changes',
  soleDecisionMaker: 'Sole decision maker', readyToInvest: 'Ready to invest and implement',
};
