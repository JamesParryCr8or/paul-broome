'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, Building2, CalendarDays, Check, ChevronRight,
  PoundSterling, Clock3, Compass, DoorOpen, Gauge, Ghost, Grid2X2, Hammer,
  HardHat, Home, Layers3, LockKeyhole, MessageSquareQuote, Percent, Rocket, Search,
  ShieldCheck, Sparkles, Sun, Target, TrendingUp, TreePine, UserRound, UsersRound,
  Wrench, type LucideIcon,
} from 'lucide-react';
import { questions, type Answers, type QuestionId } from '@/lib/quiz';

type View = 'intro' | 'details' | 'quiz' | 'complete';
type Result = { preview: boolean; route: 'training'; score: number; tier: string; nextStepUrl?: string };
type Contact = { name: string; company: string; phone: string; email: string; consent: boolean; marketing: boolean; website: string };

const LOGO_URL = 'https://res.cloudinary.com/dzaleq73i/image/upload/q_auto/f_auto/v1778512410/6865401885221373497a2d33_hk2yba.png';
const PAUL_IMAGE_URL = 'https://res.cloudinary.com/dzaleq73i/image/upload/q_auto/f_auto/v1778607882/pb_hero_dark_gold_paul_seated_de99e3be_za0tpd.webp';

function track(event: string, detail: Record<string, unknown> = {}) {
  const win = window as typeof window & { dataLayer?: unknown[] };
  win.dataLayer ||= [];
  win.dataLayer.push({ event, ...detail });
}

const iconMap: Record<string, LucideIcon> = {
  up: TrendingUp, down: BarChart3, roof: HardHat, window: DoorOpen, home: Home,
  kitchen: Wrench, sun: Sun, tree: TreePine, hammer: Hammer, grid: Grid2X2,
  seed: Sparkles, sprout: TrendingUp, plant: Layers3, oak: TreePine,
  calendar: CalendarDays, person: UserRound, people: UsersRound, team: UsersRound,
  gauge: Gauge, ghost: Ghost, quotes: MessageSquareQuote, tag: PoundSterling,
  discount: Percent, shuffle: BarChart3, clock: Clock3, target: Target,
  margin: TrendingUp, compass: Compass, rocket: Rocket, search: Search,
};

const visualMap: Record<string, LucideIcon> = {
  spend: PoundSterling, home: Home, timeline: TrendingUp, calendar: CalendarDays,
  team: UsersRound, gauge: Gauge, leak: Ghost, value: PoundSterling,
  target: Target, launch: Rocket,
};

function Brand() {
  return (
    <a className="brand" href="/" aria-label="Paul Broome Sales Mastery home">
      <Image src={LOGO_URL} alt="Paul Broome Sales Mastery" width={350} height={180} priority />
    </a>
  );
}

function RevenueLeakGraphic() {
  return (
    <svg className="revenue-graphic" viewBox="0 0 460 330" role="img" aria-label="Sales opportunities leaking from an unstructured sales process">
      <defs>
        <linearGradient id="aquaLine" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#82f0df"/><stop offset="1" stopColor="#39b9b7"/></linearGradient>
        <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#edcf8b"/><stop offset="1" stopColor="#9c7131"/></linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path className="blueprint" d="M54 61h190v55h78v58h82v99H54zM95 61v212M150 61v212M204 61v212M54 116h350M54 174h350M54 224h350" />
      <path className="flow-path" d="M65 86C137 84 161 126 220 130c69 5 87-46 168-22" />
      <circle className="flow-dot dot-one" cx="65" cy="86" r="7" />
      <circle className="flow-dot dot-two" cx="65" cy="86" r="7" />
      <path className="leak-path" d="M220 130c2 48 17 74 3 126" />
      <path d="M215 256l9 16 9-16" fill="none" stroke="url(#goldLine)" strokeWidth="5" />
      <g className="loss-chip" filter="url(#glow)"><rect x="160" y="271" width="128" height="42" rx="21"/><text x="224" y="297" textAnchor="middle">LOST VALUE</text></g>
      <g className="control-node"><circle cx="220" cy="130" r="28"/><path d="M209 130l8 8 16-18" /></g>
      <text className="diagram-label" x="57" y="46">PAID LEADS</text>
      <text className="diagram-label right" x="405" y="89" textAnchor="end">PROFITABLE SALES</text>
    </svg>
  );
}

function QuestionVisual({ visual, selected }: { visual: string; selected?: string }) {
  const Icon = visualMap[visual] || Target;
  const closeCount = selected ? Number(selected.split('-')[0]) || 0 : 0;
  return (
    <div className={`question-visual visual-${visual}`} aria-hidden="true">
      <svg viewBox="0 0 220 220" className="orbit-svg">
        <circle cx="110" cy="110" r="82" className="orbit-ring" />
        <circle cx="110" cy="110" r="61" className="orbit-ring inner" />
        <path d="M31 110a79 79 0 0 1 158 0" className="orbit-accent" />
        {[0,1,2,3,4,5,6].map(i => <circle key={i} cx={110 + 82 * Math.cos((i * 51 - 90) * Math.PI / 180)} cy={110 + 82 * Math.sin((i * 51 - 90) * Math.PI / 180)} r="4" className="orbit-dot" />)}
      </svg>
      <div className="visual-core"><Icon size={44} strokeWidth={1.55} /></div>
      {visual === 'gauge' && <div className="gauge-count"><strong>{closeCount || '—'}</strong><span>/ 10</span></div>}
      {visual === 'value' && <span className="visual-float float-one">£</span>}
      {visual === 'team' && <span className="visual-float float-two">+</span>}
      {visual === 'launch' && <span className="visual-spark spark-one" />}
    </div>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  const percent = Math.round((current / total) * 100);
  return (
    <div className="progress-wrap" aria-label={`Step ${current} of ${total}`}>
      <div className="progress-meta"><span>Sales Leak Assessment</span><strong>{percent}%</strong></div>
      <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

export default function Funnel({ preview }: { preview: boolean }) {
  const [view, setView] = useState<View>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [contact, setContact] = useState<Contact>({ name: '', company: '', phone: '', email: '', consent: false, marketing: false, website: '' });
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const submissionId = useRef('');
  const attribution = useRef<Record<string, string>>({});
  const totalSteps = questions.length + 1;
  const question = questions[questionIndex];
  const selected = answers[question?.id];

  useEffect(() => {
    submissionId.current = crypto.randomUUID();
    const params = new URLSearchParams(location.search);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid', 'gclid']) {
      const value = params.get(key);
      if (value) attribution.current[key] = value.slice(0, 500);
    }
    attribution.current.landing_path = location.pathname;
    try { attribution.current.referrer = document.referrer ? new URL(document.referrer).origin : ''; } catch {}
    track('sales_leak_page_view');
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    headingRef.current?.focus({ preventScroll: true });
  }, [view, questionIndex]);

  const firstName = contact.name.trim().split(/\s+/)[0];
  const insight = useMemo(() => {
    const pain = answers.biggestCost;
    if (pain === 'ghosting') return 'The quote is not the end of the conversation. It is where earlier uncertainty becomes visible.';
    if (pain === 'more-quotes') return '“More quotes” is usually a symptom. The real decision gap appeared earlier in the conversation.';
    if (pain === 'price-objections' || pain === 'discounting') return 'Price feels heavy when the homeowner has not yet built enough certainty around value and outcome.';
    if (pain === 'inconsistent-team') return 'Consistency comes from a shared conversation structure—not asking every salesperson to improvise.';
    return 'Faster decisions begin with a clearer, better-controlled conversation before the quote is presented.';
  }, [answers.biggestCost]);

  function begin() {
    setView('details');
    track('sales_leak_assessment_started');
  }

  function saveDetails(event: FormEvent) {
    event.preventDefault();
    setError('');
    setView('quiz');
    track('sales_leak_contact_step_complete');
  }

  function selectAnswer(id: QuestionId, value: string) {
    setAnswers(current => ({ ...current, [id]: value }));
    track('sales_leak_answer', { question: id, answer: value });
  }

  async function continueQuiz() {
    if (!selected) return;
    setError('');
    if (questionIndex < questions.length - 1) {
      setQuestionIndex(current => current + 1);
      track('sales_leak_step_complete', { step: questionIndex + 1 });
      return;
    }
    await submit();
  }

  async function submit() {
    setBusy(true);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: submissionId.current, answers, ...contact, attribution: attribution.current }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'We couldn’t prepare your result. Please try again.');
      setResult(data);
      setView('complete');
      track(data.preview ? 'sales_leak_preview_complete' : 'sales_leak_submitted', { tier: data.tier, event_id: submissionId.current });
      if (data.nextStepUrl && !data.preview) location.assign(data.nextStepUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function back() {
    setError('');
    if (view === 'details') setView('intro');
    else if (view === 'quiz' && questionIndex === 0) setView('details');
    else if (view === 'quiz') setQuestionIndex(current => Math.max(0, current - 1));
  }

  return (
    <main className="site-shell">
      {preview && <div className="preview-note"><ShieldCheck size={14}/> Safe preview — details are validated but not stored or sent.</div>}
      <header className="topbar"><Brand /><div className="header-trust"><ShieldCheck size={16}/><span>Private business assessment</span></div></header>

      {view === 'intro' && (
        <section className="hero-screen">
          <div className="hero-copy">
            <div className="eyebrow"><span /> FOR UK HOME IMPROVEMENT BUSINESS OWNERS</div>
            <h1 ref={headingRef} tabIndex={-1}>Are You Making This <em>£660K</em> Sales Mistake?</h1>
            <p className="hero-lead">Most home improvement businesses lose deals without even realising why. This short assessment reveals the moment sales go wrong—and how to regain control starting today.</p>
            <button className="primary-cta hero-cta" onClick={begin}>Find my sales leak <ArrowRight size={20}/></button>
            <div className="microcopy"><Clock3 size={15}/><span>Takes around 2 minutes</span><i/><LockKeyhole size={15}/><span>Your answers stay private</span></div>
            <div className="proof-row">
              <div><strong>43+</strong><span>years in direct sales</span></div>
              <div><strong>4,500+</strong><span>deals closed</span></div>
              <div><strong>100%</strong><span>home improvement focus</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="portrait-wrap"><Image src={PAUL_IMAGE_URL} alt="Paul Broome, home improvement sales coach" fill sizes="(max-width: 900px) 100vw, 45vw" priority /></div>
            <RevenueLeakGraphic />
            <div className="expert-chip"><span className="pulse"/><div><strong>Paul Broome</strong><small>Home Improvement Sales Coach</small></div></div>
            <div className="calc-chip"><span>THE £660K EXAMPLE</span><strong>5 missed £11K jobs × 12 months</strong><small>Illustrative revenue leakage—not a promise of results.</small></div>
          </div>
        </section>
      )}

      {view === 'details' && (
        <section className="assessment-shell">
          <Progress current={1} total={totalSteps}/>
          <div className="split-card details-layout">
            <aside className="context-panel">
              <div className="mini-visual"><RevenueLeakGraphic /></div>
              <p className="step-label">Before we continue</p>
              <h2>Your result should reflect your business—not a generic benchmark.</h2>
              <p>Tell us where to send your assessment result and Paul’s short training.</p>
              <div className="secure-note"><LockKeyhole size={17}/><span>No spam. No hard sell. Just practical sales insight.</span></div>
            </aside>
            <div className="form-panel">
              <p className="eyebrow compact"><span/> YOUR DETAILS</p>
              <h1 ref={headingRef} tabIndex={-1}>Let’s personalise your sales leak assessment.</h1>
              <form className="details-form" onSubmit={saveDetails}>
                <label><span>Your name *</span><input required autoComplete="name" value={contact.name} onChange={e => setContact({...contact, name:e.target.value})} placeholder="e.g. David Smith" /></label>
                <label><span>Company name *</span><input required autoComplete="organization" value={contact.company} onChange={e => setContact({...contact, company:e.target.value})} placeholder="e.g. Smith Roofing Ltd" /></label>
                <label><span>Phone *</span><input required type="tel" minLength={10} maxLength={22} autoComplete="tel" value={contact.phone} onChange={e => setContact({...contact, phone:e.target.value})} placeholder="Your best contact number" /></label>
                <label><span>Email *</span><input required type="email" autoComplete="email" value={contact.email} onChange={e => setContact({...contact, email:e.target.value})} placeholder="you@company.co.uk" /></label>
                <label className="honey" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={contact.website} onChange={e => setContact({...contact, website:e.target.value})}/></label>
                <label className="check-row"><input required type="checkbox" checked={contact.consent} onChange={e => setContact({...contact, consent:e.target.checked})}/><span>Paul Broome Sales Mastery may contact me about my assessment and enquiry.</span></label>
                <label className="check-row optional"><input type="checkbox" checked={contact.marketing} onChange={e => setContact({...contact, marketing:e.target.checked})}/><span>Send me occasional practical sales insights by email. Optional.</span></label>
                <button className="primary-cta" type="submit">Start the assessment <ArrowRight size={19}/></button>
              </form>
              <button className="back-link" onClick={back}><ArrowLeft size={16}/> Back</button>
            </div>
          </div>
        </section>
      )}

      {view === 'quiz' && question && (
        <section className="assessment-shell">
          <Progress current={questionIndex + 2} total={totalSteps}/>
          <div className="split-card quiz-layout">
            <aside className="visual-panel">
              <div className="question-number">{String(questionIndex + 1).padStart(2, '0')}<span>/ {questions.length}</span></div>
              <QuestionVisual visual={question.visual} selected={selected}/>
              <div className="visual-caption"><Sparkles size={15}/><span>Small changes in sales conversion can create an outsized commercial impact.</span></div>
            </aside>
            <div className="question-panel">
              <p className="eyebrow compact"><span/> {question.eyebrow.toUpperCase()}</p>
              <h1 ref={headingRef} tabIndex={-1}>{question.question}</h1>
              <p className="question-hint">{question.hint}</p>
              <div className={`option-grid ${question.options.length >= 7 ? 'dense' : ''}`} role="radiogroup" aria-label={question.question}>
                {question.options.map(option => {
                  const Icon = iconMap[option.icon] || Check;
                  const isSelected = selected === option.value;
                  return (
                    <button key={option.value} type="button" role="radio" aria-checked={isSelected} className={`option-card ${isSelected ? 'selected' : ''}`} onClick={() => selectAnswer(question.id, option.value)}>
                      <span className="option-icon"><Icon size={21} strokeWidth={1.8}/></span>
                      <span className="option-copy"><strong>{option.label}</strong>{'note' in option && option.note && <small>{option.note}</small>}</span>
                      <span className="option-check">{isSelected ? <Check size={17}/> : <ChevronRight size={17}/>}</span>
                    </button>
                  );
                })}
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="question-actions">
                <button className="back-link" onClick={back}><ArrowLeft size={16}/> Back</button>
                <button className="primary-cta next-cta" onClick={continueQuiz} disabled={!selected || busy}>
                  {questionIndex === questions.length - 1 ? (busy ? 'Preparing your result…' : 'YES! I WANT TO FIX MY CLOSE RATE') : 'Continue'}
                  {!busy && <ArrowRight size={19}/>} 
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {view === 'complete' && result && (
        <section className="complete-screen">
          <div className="complete-card">
            <div className="complete-mark"><Check size={30}/></div>
            <p className="eyebrow compact centred"><span/> ASSESSMENT COMPLETE</p>
            <h1 ref={headingRef} tabIndex={-1}>{firstName ? `${firstName}, your` : 'Your'} sales leak snapshot is ready.</h1>
            <p className="complete-lead">{insight}</p>
            <div className="result-panel">
              <div className="result-icon"><Target size={29}/></div>
              <div><span>YOUR NEXT FOCUS</span><strong>Build certainty before price enters the conversation.</strong><p>Paul’s short training shows where control is usually lost and what to change first.</p></div>
            </div>
            {result.nextStepUrl ? (
              <a className="primary-cta complete-cta" href={result.nextStepUrl}>Watch the free training <ArrowRight size={19}/></a>
            ) : (
              <div className="integration-placeholder"><Sparkles size={19}/><div><strong>Ready for your GHL handoff</strong><span>Add <code>NEXT_STEP_URL</code> when the training page is connected.</span></div></div>
            )}
            {result.preview && <p className="preview-result">Preview complete. Nothing was stored or sent.</p>}
          </div>
        </section>
      )}

      <footer className="site-footer"><span>© 2026 Paul Broome Sales Mastery</span><span>Specialist sales coaching for UK home improvement businesses</span></footer>
    </main>
  );
}
