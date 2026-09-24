import { z } from 'zod';

export const questions = [
  {
    id: 'adSpend', eyebrow: 'Investment',
    question: 'Does your business currently invest more than £5,000 per month on lead generation or advertising?',
    hint: 'This helps us understand the value already flowing into your sales process.', visual: 'spend',
    options: [
      { value: 'over-5000', label: '✅ Yes – More than £5,000 per month', note: 'We actively invest in growth', icon: 'up' },
      { value: 'under-5000', label: '❌ No – Less than £5,000 per month', note: 'Our spend is currently below that', icon: 'down' },
    ],
  },
  {
    id: 'sector', eyebrow: 'Your market', question: 'Which sector best describes your business?',
    hint: 'Choose the closest match. Paul specialises in high-ticket home improvement.', visual: 'home',
    options: [
      { value: 'roofing', label: 'Roofing', icon: 'roof' }, { value: 'windows-doors', label: 'Windows & Doors', icon: 'window' },
      { value: 'conservatories', label: 'Conservatories', icon: 'home' }, { value: 'conservatory-roofs', label: 'Conservatory Roofs', icon: 'home' },
      { value: 'kitchens', label: 'Kitchens', icon: 'kitchen' }, { value: 'bathrooms', label: 'Bathrooms', icon: 'kitchen' },
      { value: 'solar', label: 'Solar', icon: 'sun' }, { value: 'landscaping', label: 'Landscaping', icon: 'tree' }, { value: 'other', label: 'Other', icon: 'grid' },
    ],
  },
  {
    id: 'yearsTrading', eyebrow: 'Experience', question: 'How many years have you been trading?',
    hint: 'Every stage brings a different sales challenge.', visual: 'timeline',
    options: [
      { value: 'under-2', label: 'Under 2 years', icon: 'seed' }, { value: '2-5', label: '2–5 years', icon: 'sprout' },
      { value: '6-10', label: '6–10 years', icon: 'plant' }, { value: '11-20', label: '11–20 years', icon: 'tree' },
      { value: '20-plus', label: '20+ years', icon: 'oak' },
    ],
  },
  {
    id: 'appointments', eyebrow: 'Opportunity', question: 'Approximately how many sales appointments does your business run each month?',
    hint: 'Think surveys, consultations, home visits and qualified quotation appointments.', visual: 'calendar',
    options: [
      { value: 'under-10', label: '0-10', icon: 'calendar' }, { value: '10-24', label: '11-20', icon: 'calendar' },
      { value: '25-49', label: '21-40', icon: 'calendar' }, { value: '50-99', label: '41-60', icon: 'calendar' },
      { value: '100-plus', label: '60+', icon: 'calendar' },
    ],
  },
  {
    id: 'salespeople', eyebrow: 'The team', question: 'How many salespeople do you currently have?',
    hint: 'Include yourself if you still handle appointments or quotations.', visual: 'team',
    options: [
      { value: '1', label: 'Just me', icon: 'person' }, { value: '2-3', label: '2-3', icon: 'people' },
      { value: '4-6', label: '4-6', icon: 'people' }, { value: '7-10', label: '7-10', icon: 'team' },
      { value: '11-plus', label: '10+', icon: 'team' },
    ],
  },
  {
    id: 'closeRate', eyebrow: 'Conversion', question: 'Out of every 10 appointments, how many do you typically convert into sales?',
    hint: 'Use your honest average rather than your best month.', visual: 'gauge',
    options: [
      { value: '0-2', label: '1-2', note: '0–20% close rate', icon: 'gauge' }, { value: '3-4', label: '3-4', note: '30–40% close rate', icon: 'gauge' },
      { value: '5-6', label: '5-6', note: '50–60% close rate', icon: 'gauge' }, { value: '7-8', label: '7-8', note: '70–80% close rate', icon: 'gauge' },
      { value: '9-10', label: '9-10', note: '90–100% close rate', icon: 'gauge' },
    ],
  },
  {
    id: 'biggestCost', eyebrow: 'The leak', question: 'Which of these costs you the most business?',
    hint: 'Choose the one you would fix first if you could.', visual: 'leak',
    options: [
      { value: 'think', label: '“We need to think about it.”', icon: 'ghost' }, { value: 'more-quotes', label: '“We want a few more quotes.”', icon: 'quotes' },
      { value: 'price-objections', label: '“Your price is too high.”', icon: 'tag' }, { value: 'cheaper', label: 'Losing to cheaper competitors.', icon: 'tag' },
      { value: 'discounting', label: 'Too much discounting.', icon: 'discount' }, { value: 'follow-up', label: 'Endless follow-up.', icon: 'clock' },
      { value: 'inconsistent-team', label: 'Inconsistent salespeople.', icon: 'shuffle' }, { value: 'other', label: 'Other', icon: 'grid' },
    ],
  },
  {
    id: 'averageOrderValue', eyebrow: 'Job value', question: 'What is your average order value?',
    hint: 'An estimate is fine. We use this to reveal the commercial cost of missed sales.', visual: 'value',
    options: [
      { value: 'under-5000', label: 'Under £5,000', icon: 'tag' }, { value: '5000-9999', label: '£5,000–£10,000', icon: 'tag' },
      { value: '10000-19999', label: '£10,000–£20,000', icon: 'tag' }, { value: '20000-49999', label: '£20,000–£50,000', icon: 'tag' },
      { value: '50000-plus', label: 'Over £50,000', icon: 'tag' },
    ],
  },
  {
    id: 'biggestImprovement', eyebrow: 'The outcome', question: 'Which improvement would have the biggest impact on your business?',
    hint: 'Pick the outcome that would matter most over the next 90 days.', visual: 'target',
    options: [
      { value: 'close-rate', label: 'Converting more appointments into sales', icon: 'target' }, { value: 'margin', label: 'Reducing discounting', icon: 'margin' },
      { value: 'order-value', label: 'Increasing average order value', icon: 'tag' }, { value: 'consistency', label: 'Improving sales consistency across the team', icon: 'team' },
      { value: 'objections', label: 'Handling objections more effectively', icon: 'compass' }, { value: 'first-appointment', label: 'Closing more sales at the first appointment', icon: 'clock' },
    ],
  },
  {
    id: 'timeline', eyebrow: 'Readiness',
    question: 'If you could convert more of the leads you are already paying for—without increasing ad spend—how soon would you want to implement it?',
    hint: 'There is no wrong answer. This helps us recommend the right next step.', visual: 'launch',
    options: [
      { value: 'now', label: 'Immediately', icon: 'rocket' }, { value: '30-days', label: 'Within the next 30 days', icon: 'calendar' },
      { value: '90-days', label: 'Within the next 90 days', icon: 'clock' }, { value: 'researching', label: 'Just researching at the moment', icon: 'search' },
    ],
  },
] as const;

export type Question = (typeof questions)[number];
export type QuestionId = Question['id'];
export type Answers = Record<QuestionId, string>;

const allowedAnswers = Object.fromEntries(
  questions.map(question => [question.id, z.enum(question.options.map(option => option.value) as [string, ...string[]])]),
) as unknown as Record<QuestionId, z.ZodType<string>>;
const answerSchema = z.object(allowedAnswers);
const phoneSchema = z.string().trim().min(10).max(22).regex(/^[+()\d\s.-]+$/).refine(value => value.replace(/\D/g, '').length >= 10);

export const leadSchema = z.object({
  id: z.string().uuid(), answers: answerSchema,
  name: z.string().trim().min(2).max(100), company: z.string().trim().max(140).default(''),
  email: z.string().trim().email().max(254), phone: phoneSchema,
  consent: z.literal(true), marketing: z.boolean().default(false), website: z.literal(''),
  attribution: z.record(z.string().max(40), z.string().max(500)).refine(value => Object.keys(value).length <= 20),
});

export type Lead = z.infer<typeof leadSchema>;

export function assess(answers: Answers) {
  let score = 0;
  if (answers.adSpend === 'over-5000') score += 20;
  if (['25-49', '50-99', '100-plus'].includes(answers.appointments)) score += 20;
  if (['2-3', '4-6', '7-10', '11-plus'].includes(answers.salespeople)) score += 15;
  if (['0-2', '3-4', '5-6'].includes(answers.closeRate)) score += 20;
  if (['10000-19999', '20000-49999', '50000-plus'].includes(answers.averageOrderValue)) score += 15;
  if (['now', '30-days'].includes(answers.timeline)) score += 10;
  const tier = score >= 70 ? 'priority' : score >= 45 ? 'qualified' : 'nurture';
  return { score, route: 'training' as const, tier };
}

export function label(id: QuestionId, value: string) {
  return questions.find(question => question.id === id)?.options.find(option => option.value === value)?.label || value;
}
