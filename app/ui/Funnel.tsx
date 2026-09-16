'use client';

import Image from 'next/image';
import Script from 'next/script';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, Building2, CalendarDays, Check, ChevronRight,
  PoundSterling, Clock3, Compass, DoorOpen, ExternalLink, Gauge, Ghost, Globe2, Grid2X2, Hammer,
  HardHat, Home, Layers3, LockKeyhole, MessageSquareQuote, Percent, Rocket, Search,
  ShieldCheck, Sparkles, Sun, Target, TrendingUp, TreePine, UserRound, UsersRound, Video,
  Wrench, type LucideIcon,
} from 'lucide-react';
import { questions, type Answers, type QuestionId } from '@/lib/quiz';

type View = 'intro' | 'name' | 'company' | 'quiz' | 'contact' | 'booking';
type Result = { preview: boolean; route: 'training'; score: number; tier: string; nextStepUrl?: string };
type Contact = { name: string; company: string; phone: string; email: string; consent: boolean; marketing: boolean; website: string };

const LOGO_URL = 'https://res.cloudinary.com/dzaleq73i/image/upload/q_auto/f_auto/v1778512410/6865401885221373497a2d33_hk2yba.png';
const PAUL_IMAGE_URL = 'https://res.cloudinary.com/dzaleq73i/image/upload/q_auto/f_auto/v1778607882/pb_hero_dark_gold_paul_seated_de99e3be_za0tpd.webp';
const LEAD_ID_KEY = 'paul_broome_submission_id';
const BOOKING_CALENDAR_URL = 'https://paul.7stepstosalesmastery.com/widget/booking/bkrsE26sQmcKSfOkvrys';
const BOOKING_EMBED_SCRIPT = 'https://paul.7stepstosalesmastery.com/js/form_embed.js';
const proofCards = [
  {
    video: '/videos/proof-01.mp4',
    poster: '/proof-01.webp',
    title: 'My Recent Client Closed £140k In 17 Days.',
    intro: 'Brandon has officially morphed into a sales machine. After just 6 hours of coaching, he’s hitting targets that most business owners struggle to reach in a year.',
    subheading: 'This is what makes Paul different',
    points: [
      ['43 years of experience', 'From personal struggle to 60–75% close rates.'],
      ['No theory', 'Just conversation psychology, control frameworks and ongoing accountability.'],
      ['Fast implementation', 'As Brandon showed, you don’t need months. You need the right framework.'],
    ],
    close: 'If you’re a home improvement business owner ready for real coaching and proven results, let’s talk.',
  },
  {
    video: '/videos/proof-02.mp4',
    poster: '/proof-02.webp',
    title: 'From £22k/Month To £90k In Just 3 Weeks.',
    intro: 'Ben was doing okay, but he was hitting a ceiling. He was stuck in the “standard” sales process—the one where you lose control of the conversation and wait for the customer to decide.',
    subheading: 'Then he implemented the Conversation Control™ System',
    points: [
      ['The result', 'He didn’t just improve; he exploded. £90,000 in revenue in only 21 days.'],
      ['The difference', 'Eliminating the hidden triggers that kill closes and mastering price anchoring.'],
    ],
    close: 'Stop losing 4–7 jobs a month. Start controlling the outcome.',
  },
  {
    video: '/videos/proof-03.mp4',
    poster: '/proof-03.webp',
    title: 'Price Is Never An Objection Where True Value Is Present.',
    intro: 'If your customers are comparing you to “cheap” competitors, it’s because you haven’t made your value tangible, measurable and verifiable. In this video, Paul explains why the biggest players don’t struggle with price—and why you shouldn’t either.',
    subheading: 'The 7-Step Process ensures you never defend your price again',
    points: [
      ['Control the conversation', 'Shift the focus from “how much” to “how well.”'],
      ['Turn statements into questions', 'Make them the one justifying why they need the solution today.'],
      ['Track and improve', 'Build permanent mastery that sticks.'],
    ],
    close: '“What can’t speak, can’t lie.” Follow the framework, and the numbers will follow you.',
  },
] as const;

function track(event: string, detail: Record<string, unknown> = {}) {
  const win = window as typeof window & { dataLayer?: unknown[] };
  win.dataLayer ||= [];
  win.dataLayer.push({ event, ...detail });
}

function metaTrack(event: 'Lead' | 'Schedule', detail: Record<string, unknown>, eventId: string) {
  const fbq = (window as typeof window & { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq !== 'function') return false;
  fbq('track', event, detail, { eventID: eventId });
  return true;
}

function trackSchedulePixel(submissionId: string) {
  if (!submissionId) return;
  const key = `paul_broome_schedule_pixel_${submissionId}`;
  try { if (sessionStorage.getItem(key)) return; } catch {}
  if (metaTrack('Schedule', { content_name:'Paul Broome Strategy Call' }, submissionId)) {
    try { sessionStorage.setItem(key, '1'); } catch {}
  }
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

function SocialProof({ onStart }: { onStart: () => void }) {
  return (
    <section className="social-proof-section" aria-labelledby="proof-title">
      <div className="proof-heading">
        <p className="eyebrow centred"><span/> REAL RESULTS. REAL CLIENTS. REAL SALES WINS. <span/></p>
        <h2 id="proof-title">Don’t take our word for it—see the results for yourself.</h2>
        <p>Real lessons and outcomes from home improvement sales conversations.</p>
      </div>
      <div className="video-proof-list">
        {proofCards.map((card, index) => (
          <article className="video-proof-card" key={card.title}>
            <div className="proof-video-shell">
              <span className="proof-video-number">{String(index + 1).padStart(2, '0')}</span>
              <video controls playsInline preload="metadata" poster={card.poster} aria-label={card.title}>
                <source src={card.video} type="video/mp4" />
                Your browser does not support embedded video.
              </video>
            </div>
            <div className="proof-card-copy">
              <p className="proof-kicker">CLIENT RESULT</p>
              <h3>{card.title}</h3>
              <p>{card.intro}</p>
              <h4>{card.subheading}</h4>
              <ul>
                {card.points.map(([label, copy]) => <li key={label}><Check size={16}/><span><strong>{label}:</strong> {copy}</span></li>)}
              </ul>
              <p className="proof-close">{card.close}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="proof-footer">
        <p>Trusted by conservatory roof installers, window fitters, extension builders, solar companies, landscapers and roofers.</p>
        <button className="primary-cta" onClick={onStart}>Find my sales leak <ArrowRight size={19}/></button>
        <small>Results vary. Individual outcomes depend on market conditions, implementation and individual circumstances. Testimonials reflect individual experiences and are not typical results.</small>
      </div>
    </section>
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

function isMultiSelect(question: (typeof questions)[number]) {
  return 'multiple' in question && question.multiple === true;
}

function CalendarFact({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: string }) {
  return <div><Icon size={22}/><span><strong>{title}</strong>{children}</span></div>;
}

export default function Funnel({ preview }: { preview: boolean }) {
  const [view, setView] = useState<View>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [contact, setContact] = useState<Contact>({ name: '', company: '', phone: '', email: '', consent: true, marketing: true, website: '' });
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const calendarFrameRef = useRef<HTMLIFrameElement>(null);
  const submissionId = useRef('');
  const attribution = useRef<Record<string, string>>({});
  const advanceTimer = useRef<number | null>(null);
  const totalSteps = questions.length + 3;
  const question = questions[questionIndex];
  const selected = answers[question?.id];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const candidate = params.get('pb_submission_id') || params.get('submission_id') || '';
    const validCandidate = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : '';
    try {
      submissionId.current = validCandidate || localStorage.getItem(LEAD_ID_KEY) || crypto.randomUUID();
      localStorage.setItem(LEAD_ID_KEY, submissionId.current);
    } catch { submissionId.current = validCandidate || crypto.randomUUID(); }
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid', 'gclid']) {
      const value = params.get(key);
      if (value) attribution.current[key] = value.slice(0, 500);
    }
    attribution.current.landing_path = location.pathname;
    try { attribution.current.referrer = document.referrer ? new URL(document.referrer).origin : ''; } catch {}
    track('sales_leak_page_view');
  }, []);

  useEffect(() => () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    headingRef.current?.focus({ preventScroll: true });
  }, [view, questionIndex]);

  const firstName = contact.name.trim().split(/\s+/)[0];
  const lastName = contact.name.trim().split(/\s+/).slice(1).join(' ');
  const confirmedUrl = useMemo(() => {
    const params = new URLSearchParams({
      pb_submission_id: submissionId.current,
      first_name: firstName,
      last_name: lastName,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
    });
    return `/confirmed?${params.toString()}`;
  }, [contact.company, contact.email, contact.phone, firstName, lastName, view]);
  const calendarUrl = useMemo(() => {
    const next = new URL(BOOKING_CALENDAR_URL);
    next.searchParams.set('first_name', firstName);
    next.searchParams.set('last_name', lastName);
    next.searchParams.set('email', contact.email);
    next.searchParams.set('phone', contact.phone);
    next.searchParams.set('company', contact.company);
    next.searchParams.set('pb_submission_id', submissionId.current);
    return next.toString();
  }, [contact.company, contact.email, contact.phone, firstName, lastName, view]);

  useEffect(() => {
    if (view !== 'booking') return;
    const handleCalendarMessage = (event: MessageEvent) => {
      if (!['https://paul.7stepstosalesmastery.com', 'https://api.leadconnectorhq.com'].includes(event.origin)) return;
      const payload = typeof event.data === 'string' ? event.data : JSON.stringify(event.data ?? '');
      if (/(appointment|booking).*(booked|complete|confirmed|success)/i.test(payload)) {
        track('sales_leak_call_booked', { event_id: submissionId.current });
        trackSchedulePixel(submissionId.current);
        location.assign(confirmedUrl);
      }
    };
    window.addEventListener('message', handleCalendarMessage);
    return () => window.removeEventListener('message', handleCalendarMessage);
  }, [confirmedUrl, view]);

  const insight = useMemo(() => {
    const pain = answers.biggestCost;
    if (pain === 'ghosting') return 'The quote is not the end of the conversation. It is where earlier uncertainty becomes visible.';
    if (pain === 'more-quotes') return '“More quotes” is usually a symptom. The real decision gap appeared earlier in the conversation.';
    if (pain === 'price-objections' || pain === 'discounting') return 'Price feels heavy when the homeowner has not yet built enough certainty around value and outcome.';
    if (pain === 'inconsistent-team') return 'Consistency comes from a shared conversation structure—not asking every salesperson to improvise.';
    return 'Faster decisions begin with a clearer, better-controlled conversation before the quote is presented.';
  }, [answers.biggestCost]);

  function begin() {
    setView('name');
    track('sales_leak_assessment_started');
  }

  function saveName(event: FormEvent) {
    event.preventDefault();
    setError('');
    setView('company');
    track('sales_leak_name_step_complete');
  }

  function saveCompany(event: FormEvent) {
    event.preventDefault();
    setError('');
    setView('quiz');
    track('sales_leak_company_step_complete');
  }

  async function saveContact(event: FormEvent) {
    event.preventDefault();
    setError('');
    track('sales_leak_contact_step_complete');
    await submit();
  }

  function selectAnswer(id: QuestionId, value: string) {
    if (advancing) return;
    setAnswers(current => ({ ...current, [id]: value }));
    track('sales_leak_answer', { question: id, answer: value });
    if (!isMultiSelect(question)) {
      setAdvancing(true);
      advanceTimer.current = window.setTimeout(() => {
        advanceQuestion();
        setAdvancing(false);
        advanceTimer.current = null;
      }, 180);
    }
  }

  function advanceQuestion() {
    setError('');
    if (questionIndex < questions.length - 1) {
      setQuestionIndex(current => current + 1);
      track('sales_leak_step_complete', { step: questionIndex + 1 });
      return;
    }
    setView('contact');
    track('sales_leak_questions_complete');
  }

  function continueQuiz() {
    if (!selected) return;
    advanceQuestion();
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
      setView('booking');
      track(data.preview ? 'sales_leak_preview_complete' : 'sales_leak_submitted', { tier: data.tier, event_id: submissionId.current });
      if (!data.preview) metaTrack('Lead', { content_name:'Sales Leak Assessment', lead_tier:data.tier }, submissionId.current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleCalendarLoad() {
    try {
      const framePath = calendarFrameRef.current?.contentWindow?.location.pathname;
      if (framePath === '/confirmed') location.assign(confirmedUrl);
    } catch {
      // The calendar is cross-origin until its confirmation redirect reaches this site.
    }
  }

  function back() {
    setError('');
    if (view === 'name') setView('intro');
    else if (view === 'company') setView('name');
    else if (view === 'quiz' && questionIndex === 0) setView('company');
    else if (view === 'quiz') setQuestionIndex(current => Math.max(0, current - 1));
    else if (view === 'contact') {
      setQuestionIndex(questions.length - 1);
      setView('quiz');
    }
  }

  return (
    <main className="site-shell">
      {preview && <div className="preview-note"><ShieldCheck size={14}/> Safe preview — details are validated but not stored or sent.</div>}
      <header className="topbar"><Brand /><div className="header-trust"><ShieldCheck size={16}/><span>Private business assessment</span></div></header>
      <div className="calendar-preload" aria-hidden="true">
        <iframe src={BOOKING_CALENDAR_URL} allow="payment" scrolling="no" loading="eager" tabIndex={-1} title="Preloading Paul Broome’s booking calendar" id="paul-broome-calendar-preload"/>
      </div>
      <Script src={BOOKING_EMBED_SCRIPT} strategy="afterInteractive"/>

      {view === 'intro' && (
        <>
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
        <SocialProof onStart={begin}/>
        </>
      )}

      {view === 'name' && (
        <section className="assessment-shell">
          <Progress current={1} total={totalSteps}/>
          <div className="split-card details-layout">
            <aside className="context-panel">
              <div className="mini-visual"><RevenueLeakGraphic /></div>
              <p className="step-label">First things first</p>
              <h2>Your assessment starts with you.</h2>
              <p>We’ll use your first name to personalise the experience as you uncover where sales may be slipping away.</p>
              <div className="secure-note"><LockKeyhole size={17}/><span>No spam. No hard sell. Just practical sales insight.</span></div>
            </aside>
            <div className="form-panel">
              <p className="eyebrow compact"><span/> ABOUT YOU</p>
              <h1 ref={headingRef} tabIndex={-1}>What’s your first name?</h1>
              <form className="details-form single-field-form" onSubmit={saveName}>
                <label><span>First name *</span><input required minLength={2} autoFocus autoComplete="given-name" value={contact.name} onChange={e => setContact({...contact, name:e.target.value})} placeholder="e.g. David" /></label>
                <button className="primary-cta" type="submit">Continue <ArrowRight size={19}/></button>
              </form>
              <button className="back-link" onClick={back}><ArrowLeft size={16}/> Back</button>
            </div>
          </div>
        </section>
      )}

      {view === 'company' && (
        <section className="assessment-shell">
          <Progress current={2} total={totalSteps}/>
          <div className="split-card details-layout">
            <aside className="context-panel">
              <div className="mini-visual"><RevenueLeakGraphic /></div>
              <p className="step-label">Your business</p>
              <h2>Every sales process has its own pressure points.</h2>
              <p>Your company name helps make the assessment feel relevant to the business you’re building.</p>
              <div className="secure-note"><Building2 size={17}/><span>Built for UK home improvement business owners.</span></div>
            </aside>
            <div className="form-panel">
              <p className="eyebrow compact"><span/> ABOUT YOUR BUSINESS</p>
              <h1 ref={headingRef} tabIndex={-1}>{firstName ? `Thanks, ${firstName}. What’s your company called?` : 'What’s your company called?'}</h1>
              <form className="details-form single-field-form" onSubmit={saveCompany}>
                <label><span>Company name *</span><input required minLength={2} autoFocus autoComplete="organization" value={contact.company} onChange={e => setContact({...contact, company:e.target.value})} placeholder="e.g. Smith Roofing Ltd" /></label>
                <button className="primary-cta" type="submit">Start the assessment <ArrowRight size={19}/></button>
              </form>
              <button className="back-link" onClick={back}><ArrowLeft size={16}/> Back</button>
            </div>
          </div>
        </section>
      )}

      {view === 'quiz' && question && (
        <section className="assessment-shell">
          <Progress current={questionIndex + 3} total={totalSteps}/>
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
                    <button key={option.value} type="button" role="radio" aria-checked={isSelected} disabled={advancing} className={`option-card ${isSelected ? 'selected' : ''}`} onClick={() => selectAnswer(question.id, option.value)}>
                      <span className="option-icon"><Icon size={21} strokeWidth={1.8}/></span>
                      <span className="option-copy"><strong>{option.label}</strong>{'note' in option && option.note && <small>{option.note}</small>}</span>
                      <span className="option-check">{isSelected ? <Check size={17}/> : <ChevronRight size={17}/>}</span>
                    </button>
                  );
                })}
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="question-actions">
                <button className="back-link" onClick={back} disabled={advancing}><ArrowLeft size={16}/> Back</button>
                {isMultiSelect(question) ? (
                  <button className="primary-cta next-cta" onClick={continueQuiz} disabled={!selected || busy}>Continue <ArrowRight size={19}/></button>
                ) : (
                  <span className="auto-advance-note">Choose an answer to continue</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {view === 'contact' && (
        <section className="assessment-shell">
          <Progress current={totalSteps} total={totalSteps}/>
          <div className="split-card details-layout">
            <aside className="context-panel">
              <div className="mini-visual"><RevenueLeakGraphic /></div>
              <p className="step-label">Your result is ready</p>
              <h2>Where should we send your sales leak snapshot?</h2>
              <p>Add your best email and phone number to unlock your result and Paul’s short training.</p>
              <div className="secure-note"><LockKeyhole size={17}/><span>Your details stay private and secure.</span></div>
            </aside>
            <div className="form-panel">
              <p className="eyebrow compact"><span/> FINAL STEP</p>
              <h1 ref={headingRef} tabIndex={-1}>See where {contact.company || 'your business'} is losing sales.</h1>
              <form className="details-form" onSubmit={saveContact}>
                <label><span>Email *</span><input required type="email" autoFocus autoComplete="email" value={contact.email} onChange={e => setContact({...contact, email:e.target.value})} placeholder="you@company.co.uk" /></label>
                <label><span>Phone *</span><input required type="tel" minLength={10} maxLength={22} autoComplete="tel" value={contact.phone} onChange={e => setContact({...contact, phone:e.target.value})} placeholder="Your best contact number" /></label>
                <label className="honey" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={contact.website} onChange={e => setContact({...contact, website:e.target.value})}/></label>
                <label className="check-row"><input required type="checkbox" checked={contact.consent} onChange={e => setContact({...contact, consent:e.target.checked})}/><span>Paul Broome Sales Mastery may contact me about my assessment and enquiry.</span></label>
                <label className="check-row optional"><input type="checkbox" checked={contact.marketing} onChange={e => setContact({...contact, marketing:e.target.checked})}/><span>Send me occasional practical sales insights by email. Optional.</span></label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="primary-cta" type="submit" disabled={busy}>{busy ? 'Preparing your result…' : 'YES! I WANT TO FIX MY CLOSE RATE'}{!busy && <ArrowRight size={19}/>}</button>
              </form>
              <button className="back-link" onClick={back} disabled={busy}><ArrowLeft size={16}/> Back</button>
            </div>
          </div>
        </section>
      )}

      {view === 'booking' && result && (
        <section className="booking-shell" aria-label="Book your free sales strategy call">
          <div className="booking-result-strip">
            <div className="complete-mark"><Check size={24}/></div>
            <div><span>ASSESSMENT COMPLETE</span><strong>{firstName ? `${firstName}, your` : 'Your'} sales leak has been identified.</strong><p>{insight}</p></div>
          </div>
          <div className="booking-calendar">
            <aside className="booking-calendar__intro">
              <p className="booking-calendar__eyebrow"><span/> FREE STRATEGY CALL</p>
              <h1 ref={headingRef} tabIndex={-1}>Choose a time to talk with <em>Paul.</em></h1>
              <p className="booking-calendar__copy">A confidential conversation to pinpoint where sales are leaking, what to fix first and whether the 7 Steps to Sales Mastery is right for {contact.company || 'your business'}.</p>
              <div className="booking-calendar__facts">
                <CalendarFact icon={Clock3} title="60 minutes">A focused sales strategy session</CalendarFact>
                <CalendarFact icon={Video} title="Online with Paul">Joining details sent after booking</CalendarFact>
                <CalendarFact icon={Globe2} title="Your local time">Timezone handled by the calendar</CalendarFact>
              </div>
              <div className="booking-calendar__reassurance"><Check size={20}/><span>No obligation. Clear, practical next steps for your close rate.</span></div>
            </aside>
            <div className="booking-calendar__panel">
              <div className="booking-calendar__head">
                <div><span className="booking-calendar__step">01</span><div><strong>Choose your date and time</strong><small>Live availability</small></div></div>
                <span className="booking-calendar__live"><i/> LIVE</span>
              </div>
              <div className="booking-calendar__embed">
                <iframe id="bkrsE26sQmcKSfOkvrys_1789522029137" ref={calendarFrameRef} className="calendar-frame" src={calendarUrl} allow="payment" title="Choose a strategy call time with Paul Broome" scrolling="no" loading="eager" onLoad={handleCalendarLoad}/>
              </div>
              <div className="booking-calendar__after">
                <a className="booking-calendar__external" href={calendarUrl} target="_blank" rel="noreferrer">Open calendar in a new tab <ExternalLink size={14}/></a>
                <a className="booking-calendar__booked" href={confirmedUrl} onClick={() => trackSchedulePixel(submissionId.current)}>Already booked? Complete your call diagnostic <ArrowRight size={15}/></a>
              </div>
              {result.preview && <p className="preview-result">Preview mode: your assessment was not stored or sent.</p>}
            </div>
          </div>
        </section>
      )}

      <footer className="site-footer"><span>© 2026 Paul Broome Sales Mastery</span><span>Specialist sales coaching for UK home improvement businesses</span></footer>
    </main>
  );
}
