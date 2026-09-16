'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft, ArrowRight, BadgePoundSterling, BarChart3, BriefcaseBusiness, Check, CheckCircle2,
  ChevronRight, CircleDollarSign, Clock3, Gauge, HandCoins, HeartHandshake, Lightbulb,
  ListChecks, LockKeyhole, MessageCircleQuestion, PlayCircle, PoundSterling, Save, ShieldCheck,
  Sparkles, Target, TrendingDown, UserCheck, UsersRound, type LucideIcon,
} from 'lucide-react';
import type { DiagnosticAnswers } from '@/lib/diagnostic';

type InitialIdentity = { submissionId: string; fullName: string; email: string; phone: string };
type View = 'intro' | 'details' | 'question' | 'complete';
type AnswerId = keyof DiagnosticAnswers;
type Choice = { value: string; label: string; note?: string; icon: LucideIcon };
type DiagnosticQuestion = {
  id: AnswerId; number: number; eyebrow: string; title: string; hint: string; icon: LucideIcon;
  kind: 'text' | 'number' | 'textarea' | 'choice'; placeholder?: string; suffix?: string; options?: Choice[];
};

const LOGO_URL = 'https://res.cloudinary.com/dzaleq73i/image/upload/q_auto/f_auto/v1778512410/6865401885221373497a2d33_hk2yba.png';
const VIDEO_URL = 'https://content.apisystem.tech/hls/medias/2x8A5up52ublohNgZGKU/media/transcoded_videos/cts-6eecfb328b220a5f_,360,480,720,1080,p.mp4.urlset/index-f4-v1-a1.m3u8';
const STORAGE_KEY = 'paul_broome_diagnostic_v1';
const LEAD_ID_KEY = 'paul_broome_submission_id';

const questions: DiagnosticQuestion[] = [
  { id:'offerAndAov', number:1, eyebrow:'Your offer', title:'What do you sell—and what is your average order value?', hint:'A quick description and an approximate figure is perfect.', icon:BriefcaseBusiness, kind:'text', placeholder:'e.g. Replacement roofs, average order value £14,500' },
  { id:'monthlyRevenue', number:2, eyebrow:'Revenue', title:'What is your current monthly revenue?', hint:'Choose the band that best reflects a normal month.', icon:BarChart3, kind:'choice', options:[
    {value:'under-10k',label:'Under £10k',icon:TrendingDown},{value:'10k-30k',label:'£10k–£30k',icon:BarChart3},
    {value:'30k-50k',label:'£30k–£50k',icon:BadgePoundSterling},{value:'50k-plus',label:'£50k+',icon:CircleDollarSign},
  ]},
  { id:'qualifiedLeads', number:3, eyebrow:'Lead flow', title:'How many qualified leads do you work per week?', hint:'Count the enquiries that genuinely fit your service and buying area.', icon:UsersRound, kind:'number', placeholder:'e.g. 18' },
  { id:'closeRate', number:4, eyebrow:'Conversion', title:'What is your current close rate?', hint:'Use your honest average rather than your best month.', icon:Gauge, kind:'number', placeholder:'e.g. 35', suffix:'%' },
  { id:'lostReason', number:5, eyebrow:'The leak', title:'Where are you losing most deals right now?', hint:'Choose the objection or issue you hear most often.', icon:TrendingDown, kind:'choice', options:[
    {value:'think-about-it',label:'“Need to think about it”',icon:Clock3},{value:'speak-to-partner',label:'“Speak to partner”',icon:UsersRound},
    {value:'price',label:'Price',icon:PoundSterling},{value:'poor-leads',label:'Poor leads',icon:Target},{value:'other',label:'Other',icon:MessageCircleQuestion},
  ]},
  { id:'lostDeals', number:6, eyebrow:'Missed opportunity', title:'How many deals did you lose last month that should have closed?', hint:'Your best estimate is enough.', icon:TrendingDown, kind:'number', placeholder:'e.g. 6' },
  { id:'lostValue', number:7, eyebrow:'Commercial impact', title:'What was the approximate value of those lost deals?', hint:'Use the combined contract value, before costs.', icon:HandCoins, kind:'number', placeholder:'e.g. 72000', suffix:'£' },
  { id:'structuredProcess', number:8, eyebrow:'Sales process', title:'Do you currently follow a structured sales process?', hint:'Think about what happens consistently on every appointment.', icon:ListChecks, kind:'choice', options:[
    {value:'yes-consistent',label:'Yes — consistent framework',icon:CheckCircle2},{value:'somewhat-inconsistent',label:'Somewhat — inconsistent',icon:ListChecks},
    {value:'no-wing-it',label:'No — I wing it',icon:Sparkles},
  ]},
  { id:'coachingInvestment', number:9, eyebrow:'Previous support', title:'Have you ever invested in sales coaching or training before?', hint:'This helps Paul avoid repeating advice you have already tried.', icon:Lightbulb, kind:'choice', options:[
    {value:'yes',label:'Yes',icon:CheckCircle2},{value:'no',label:'No',icon:ArrowRight},
  ]},
  { id:'coachingDetails', number:10, eyebrow:'What happened', title:'What did you try—and why didn’t it work?', hint:'Be candid. The more context Paul has, the more useful your call will be.', icon:MessageCircleQuestion, kind:'textarea', placeholder:'Tell us what you invested in, what changed, and what was still missing…' },
  { id:'frustration', number:11, eyebrow:'The real frustration', title:'What specifically frustrates you most about your current sales results?', hint:'There is no polished answer required. Say it as you would on the call.', icon:TrendingDown, kind:'textarea', placeholder:'The thing that frustrates me most is…' },
  { id:'whyNow', number:12, eyebrow:'Why now', title:'Why is it important to fix this now?', hint:'What has made this a priority today rather than six months from now?', icon:Clock3, kind:'textarea', placeholder:'It matters now because…' },
  { id:'consequences', number:13, eyebrow:'Personal impact', title:'What are the consequences to you personally if nothing changes in the next 3–6 months?', hint:'Consider time, stress, confidence, family pressure and the future of the business.', icon:HeartHandshake, kind:'textarea', placeholder:'If nothing changes…' },
  { id:'soleDecisionMaker', number:14, eyebrow:'Decision making', title:'Are you the sole decision maker when investing in improving your business?', hint:'If somebody else should be involved, Paul can plan for that before the call.', icon:UserCheck, kind:'choice', options:[
    {value:'yes',label:'Yes',icon:UserCheck},{value:'no',label:'No',icon:UsersRound},
  ]},
  { id:'readyToInvest', number:15, eyebrow:'Readiness', title:'After we identify a clear way to increase your sales, are you ready to invest and implement immediately?', hint:'Choose the answer that best reflects where you are today.', icon:Target, kind:'choice', options:[
    {value:'yes-ready',label:'Yes — ready now',note:'If the plan makes commercial sense',icon:CheckCircle2},
    {value:'depends-on-cost',label:'Depends on cost',note:'I need to understand the investment',icon:PoundSterling},
    {value:'just-exploring',label:'No — just exploring',note:'I am gathering information for now',icon:Lightbulb},
  ]},
];

function track(event: string, detail: Record<string, unknown> = {}) {
  const win = window as typeof window & { dataLayer?: unknown[] };
  win.dataLayer ||= [];
  win.dataLayer.push({ event, ...detail });
}

function trackSchedulePixel(submissionId: string) {
  if (!submissionId) return false;
  const key = `paul_broome_schedule_pixel_${submissionId}`;
  try { if (sessionStorage.getItem(key)) return true; } catch {}
  const fbq = (window as typeof window & { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq !== 'function') return false;
  fbq('track', 'Schedule', { content_name:'Paul Broome Strategy Call' }, { eventID:submissionId });
  try { sessionStorage.setItem(key, '1'); } catch {}
  return true;
}

function HlsVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = VIDEO_URL;
      return;
    }
    let cancelled = false;
    let player: { destroy: () => void } | undefined;
    void import('hls.js').then(({default:Hls}) => {
      if (cancelled || !Hls.isSupported()) return;
      const hls = new Hls({ enableWorker:true, startLevel:-1 });
      player = hls;
      hls.loadSource(VIDEO_URL);
      hls.attachMedia(video);
    });
    return () => { cancelled = true; player?.destroy(); };
  }, []);
  return <video ref={videoRef} controls playsInline preload="metadata" poster="/diagnostic-hero.webp" aria-label="A message from Paul Broome after booking your call" />;
}

function DiagnosticGraphic({ icon: Icon, step }: { icon: LucideIcon; step: number }) {
  return (
    <div className="diagnostic-orbit" aria-hidden="true">
      <svg viewBox="0 0 260 260"><circle cx="130" cy="130" r="102"/><circle cx="130" cy="130" r="78"/><path d="M28 130a102 102 0 0 1 204 0"/>{[0,1,2,3,4,5,6,7].map(i => <circle key={i} className="dot" cx={130+102*Math.cos((i*45-90)*Math.PI/180)} cy={130+102*Math.sin((i*45-90)*Math.PI/180)} r="4"/>)}</svg>
      <span className="diagnostic-core"><Icon size={47} strokeWidth={1.45}/></span>
      <span className="diagnostic-step-chip">{String(step).padStart(2,'0')}</span>
    </div>
  );
}

export default function Diagnostic({ initial, preview }: { initial: InitialIdentity; preview: boolean }) {
  const [view, setView] = useState<View>('intro');
  const [leadId, setLeadId] = useState(initial.submissionId);
  const [fullName, setFullName] = useState(initial.fullName);
  const [email, setEmail] = useState(initial.email);
  const [phone] = useState(initial.phone);
  const [answers, setAnswers] = useState<DiagnosticAnswers>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [advancing, setAdvancing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const revision = useRef(0);
  const saveTimer = useRef<number | null>(null);
  const hydrated = useRef(false);

  const activeQuestions = useMemo(() => questions.filter(question => question.id !== 'coachingDetails' || answers.coachingInvestment === 'yes'), [answers.coachingInvestment]);
  const currentQuestion = activeQuestions[Math.min(questionIndex, activeQuestions.length - 1)];
  const currentValue = currentQuestion ? answers[currentQuestion.id] || '' : '';
  const totalScreens = activeQuestions.length + 1;
  const progress = view === 'details' ? 0 : Math.round(((questionIndex + 1) / totalScreens) * 100);

  useEffect(() => {
    let id = initial.submissionId;
    try {
      const storedId = localStorage.getItem(LEAD_ID_KEY);
      id = id || storedId || crypto.randomUUID();
      localStorage.setItem(LEAD_ID_KEY, id);
      const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (draft?.id === id) {
        if (!initial.fullName && draft.fullName) setFullName(draft.fullName);
        if (!initial.email && draft.email) setEmail(draft.email);
        if (draft.answers) setAnswers(draft.answers);
        if (Number.isInteger(draft.questionIndex)) setQuestionIndex(Math.max(0, draft.questionIndex));
      }
    } catch {}
    setLeadId(id);
    revision.current = Date.now();
    hydrated.current = true;
    let retry: number | undefined;
    if (!preview) {
      trackSchedulePixel(id);
      retry = window.setTimeout(() => trackSchedulePixel(id), 1000);
    }
    track('diagnostic_page_view', { submission_id: id });
    return () => { if (retry !== undefined) window.clearTimeout(retry); };
  }, [initial.email, initial.fullName, initial.submissionId, preview]);

  const saveDraft = useCallback(async (completed = false, keepalive = false) => {
    if (!hydrated.current || !leadId) return;
    revision.current += 1;
    const payload = { id:leadId, revision:revision.current, currentStep:view === 'complete' ? activeQuestions.length : questionIndex, completed, fullName, email, phone, answers, attribution:{ landing_path:location.pathname } };
    try {
      if (!keepalive) setSaveStatus('saving');
      const response = await fetch('/api/diagnostic', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload), keepalive });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'We could not save your answers.');
      if (!keepalive) setSaveStatus('saved');
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ id:leadId, fullName, email, answers, questionIndex })); } catch {}
      return data;
    } catch (caught) {
      if (!keepalive) setSaveStatus('error');
      throw caught;
    }
  }, [activeQuestions.length, answers, email, fullName, leadId, phone, questionIndex, view]);

  useEffect(() => {
    if (!hydrated.current || view === 'intro' || view === 'complete') return;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { saveDraft().catch(() => {}); }, 700);
    return () => { if (saveTimer.current !== null) window.clearTimeout(saveTimer.current); };
  }, [answers, email, fullName, questionIndex, saveDraft, view]);

  useEffect(() => {
    const flush = () => { if (view !== 'intro' && view !== 'complete') saveDraft(false, true).catch(() => {}); };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [saveDraft, view]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({top:0,behavior:reduced?'auto':'smooth'});
    headingRef.current?.focus({preventScroll:true});
  }, [questionIndex, view]);

  function start() { setView('details'); track('diagnostic_started', { submission_id:leadId }); }
  function confirmDetails(event: FormEvent) {
    event.preventDefault(); setError(''); setView('question'); setQuestionIndex(0);
    track('diagnostic_identity_confirmed', { submission_id:leadId });
  }
  function setAnswer(id: AnswerId, value: string) {
    setAnswers(current => ({...current,[id]:value}));
    track('diagnostic_answer', { question:id, submission_id:leadId });
  }
  function goNext() {
    if (!currentQuestion) return;
    if (!currentValue.trim()) { setError('Please add an answer before continuing.'); return; }
    if (currentQuestion.id === 'lostReason' && currentValue === 'other' && !answers.lostReasonOther?.trim()) { setError('Please tell us where those deals are being lost.'); return; }
    if (currentQuestion.id === 'closeRate' && Number(currentValue) > 100) { setError('Please enter a percentage between 0 and 100.'); return; }
    setError('');
    if (questionIndex < activeQuestions.length - 1) { setQuestionIndex(index => index + 1); return; }
    complete();
  }
  function choose(value: string) {
    if (!currentQuestion || advancing) return;
    setAnswer(currentQuestion.id, value);
    if ((currentQuestion.id === 'lostReason' && value === 'other')) return;
    setAdvancing(true);
    window.setTimeout(() => { setAdvancing(false); setError(''); if (questionIndex < activeQuestions.length - 1) setQuestionIndex(index => index + 1); else complete({...answers,[currentQuestion.id]:value}); }, 190);
  }
  async function complete(answerOverride?: DiagnosticAnswers) {
    setBusy(true); setError('');
    const original = answers;
    if (answerOverride) setAnswers(answerOverride);
    try {
      const finalAnswers = answerOverride || original;
      revision.current += 1;
      const response = await fetch('/api/diagnostic', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:leadId, revision:revision.current, currentStep:activeQuestions.length, completed:true, fullName, email, phone, answers:finalAnswers, attribution:{landing_path:location.pathname} }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Please check every answer and try again.');
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      setView('complete'); setSaveStatus('saved');
      track('diagnostic_completed', { submission_id:leadId, preview:data.preview });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'We could not submit your diagnostic. Please try again.'); }
    finally { setBusy(false); }
  }
  function back() {
    setError('');
    if (view === 'details') setView('intro');
    else if (view === 'question' && questionIndex === 0) setView('details');
    else if (view === 'question') setQuestionIndex(index => Math.max(0,index-1));
  }

  return (
    <main className="diagnostic-page">
      {preview && <div className="preview-note"><ShieldCheck size={14}/> Safe preview — progress stays in this browser until the CRM is connected.</div>}
      <header className="topbar diagnostic-topbar">
        <a className="brand" href="/" aria-label="Paul Broome Sales Mastery home"><Image src={LOGO_URL} alt="Paul Broome Sales Mastery" width={350} height={180} priority /></a>
        <div className="diagnostic-save"><span className={saveStatus}><Save size={14}/>{saveStatus === 'saving'?'Saving…':saveStatus === 'error'?'Save paused':saveStatus === 'saved'?'Progress saved':'Private diagnostic'}</span></div>
      </header>

      {view === 'intro' && <section className="diagnostic-hero">
        <div className="diagnostic-hero-copy">
          <p className="eyebrow"><span/> YOUR CALL IS BOOKED</p>
          <h1 ref={headingRef} tabIndex={-1}>Let’s make your call <em>count.</em></h1>
          <p>Please answer the following as clearly as you can. It will save us a ton of time on the upcoming call and let Paul focus immediately on the sales leaks that matter most.</p>
          <div className="diagnostic-benefits"><span><Check size={15}/> Takes 4–6 minutes</span><span><LockKeyhole size={15}/> Saves automatically</span><span><Target size={15}/> Tailors your call</span></div>
          <button className="primary-cta" onClick={start}>Start my diagnostic <ArrowRight size={19}/></button>
        </div>
        <div className="diagnostic-video-wrap">
          <div className="video-label"><PlayCircle size={16}/><span>A quick message from Paul</span></div>
          <HlsVideo />
        </div>
      </section>}

      {view === 'details' && <section className="diagnostic-form-shell">
        <div className="diagnostic-progress"><div><span>Confirm your details</span><strong>Ready to begin</strong></div><i><b style={{width:'4%'}}/></i></div>
        <div className="diagnostic-card identity-card">
          <aside><DiagnosticGraphic icon={UserCheck} step={0}/><p>We use these details to reconnect your diagnostic to the call you have just booked.</p></aside>
          <div className="diagnostic-question">
            <p className="eyebrow compact"><span/> BEFORE WE BEGIN</p>
            <h1 ref={headingRef} tabIndex={-1}>Confirm it’s you.</h1>
            <p className="diagnostic-hint">Your booking details may already be filled in. Check they are correct, then continue.</p>
            <form className="diagnostic-details" onSubmit={confirmDetails}>
              <label><span>Full name *</span><input required minLength={2} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name"/></label>
              <label><span>Email *</span><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.co.uk"/></label>
              <button className="primary-cta" type="submit">Begin diagnostic <ArrowRight size={19}/></button>
            </form>
            <button className="back-link" onClick={back}><ArrowLeft size={16}/> Back</button>
          </div>
        </div>
      </section>}

      {view === 'question' && currentQuestion && <section className="diagnostic-form-shell">
        <div className="diagnostic-progress"><div><span>Pre-call sales diagnostic</span><strong>{progress}% complete</strong></div><i><b style={{width:`${progress}%`}}/></i></div>
        <div className="diagnostic-card">
          <aside><span className="diagnostic-question-number">{String(currentQuestion.number).padStart(2,'0')}<small>/ 15</small></span><DiagnosticGraphic icon={currentQuestion.icon} step={currentQuestion.number}/><p><Sparkles size={15}/> Your progress is saved as you go, so you can safely return if interrupted.</p></aside>
          <div className="diagnostic-question">
            <p className="eyebrow compact"><span/> {currentQuestion.eyebrow.toUpperCase()}</p>
            <h1 ref={headingRef} tabIndex={-1}>{currentQuestion.title}</h1>
            <p className="diagnostic-hint">{currentQuestion.hint}</p>
            {currentQuestion.kind === 'choice' ? <div className={`diagnostic-options ${currentQuestion.options!.length <= 3?'compact':''}`} role="radiogroup" aria-label={currentQuestion.title}>
              {currentQuestion.options!.map(option => { const Icon=option.icon; const selected=currentValue===option.value; return <button key={option.value} type="button" role="radio" aria-checked={selected} disabled={advancing||busy} className={selected?'selected':''} onClick={()=>choose(option.value)}><span className="choice-icon"><Icon size={21}/></span><span><strong>{option.label}</strong>{option.note&&<small>{option.note}</small>}</span><span className="choice-arrow">{selected?<Check size={17}/>:<ChevronRight size={17}/>}</span></button>; })}
              {currentQuestion.id === 'lostReason' && currentValue === 'other' && <label className="diagnostic-other"><span>Tell us where those deals are being lost *</span><input autoFocus value={answers.lostReasonOther||''} onChange={e=>setAnswer('lostReasonOther',e.target.value)} placeholder="Briefly describe what is happening"/></label>}
            </div> : <form className="diagnostic-answer-form" onSubmit={e=>{e.preventDefault();goNext();}}>
              {currentQuestion.kind === 'textarea' ? <textarea autoFocus rows={7} required value={currentValue} onChange={e=>setAnswer(currentQuestion.id,e.target.value)} placeholder={currentQuestion.placeholder}/> : <div className="diagnostic-input-wrap">{currentQuestion.suffix==='£'&&<span>£</span>}<input autoFocus required type={currentQuestion.kind==='number'?'number':'text'} min={currentQuestion.kind==='number'?'0':undefined} max={currentQuestion.id==='closeRate'?'100':undefined} inputMode={currentQuestion.kind==='number'?'decimal':undefined} value={currentValue} onChange={e=>setAnswer(currentQuestion.id,e.target.value)} placeholder={currentQuestion.placeholder}/>{currentQuestion.suffix==='%'&&<span>%</span>}</div>}
              <button className="primary-cta" type="submit" disabled={busy}>{questionIndex===activeQuestions.length-1?'Complete diagnostic':'Continue'} <ArrowRight size={19}/></button>
            </form>}
            {error&&<p className="form-error" role="alert">{error}</p>}
            <div className="diagnostic-actions"><button className="back-link" onClick={back} disabled={busy||advancing}><ArrowLeft size={16}/> Back</button>{currentQuestion.kind==='choice'&&(currentQuestion.id==='lostReason'&&currentValue==='other')&&<button className="primary-cta slim" onClick={goNext}>Continue <ArrowRight size={18}/></button>}<span><LockKeyhole size={13}/> Private &amp; secure</span></div>
          </div>
        </div>
      </section>}

      {view === 'complete' && <section className="diagnostic-complete">
        <div className="complete-mark"><Check size={30}/></div><p className="eyebrow centred"><span/> DIAGNOSTIC COMPLETE <span/></p>
        <h1 ref={headingRef} tabIndex={-1}>Perfect. Paul can now prepare properly for your call.</h1>
        <p>Your answers are saved against your booking. There is nothing else you need to do—just turn up ready for a direct, commercially focused conversation.</p>
        <div className="diagnostic-complete-grid"><span><Clock3 size={21}/><strong>Check your calendar</strong><small>Your booking confirmation contains the call details.</small></span><span><Target size={21}/><strong>Bring your numbers</strong><small>Have recent leads, closes and order values to hand.</small></span><span><ListChecks size={21}/><strong>Come ready to act</strong><small>The call will focus on practical next steps.</small></span></div>
      </section>}
      <footer className="site-footer"><span>© 2026 Paul Broome Sales Mastery</span><span>Private pre-call sales diagnostic</span></footer>
    </main>
  );
}
