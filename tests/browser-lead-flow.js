// Run with agent-browser eval --stdin on a local page with LEAD_CAPTURE_ENABLED=true.
// CRM responses and the pixel are mocked: no real contacts or conversions are sent.
(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const events = [], requests = [];
  window.fbq = (...args) => events.push(args);
  const originalFetch = window.fetch;
  window.fetch = async (url, init) => {
    if (String(url).startsWith('/api/leads')) {
      requests.push({ url, body: JSON.parse(init.body) });
      return new Response(JSON.stringify(String(url).endsWith('/contact') ? { preview:false, contactId:'browser-test', contactToken:'test-token' } : { preview:false, score:100, tier:'priority', route:'training' }), { status:200, headers:{'Content-Type':'application/json'} });
    }
    return originalFetch(url, init);
  };
  const fill = async (selector, value) => {
    const input = document.querySelector(selector);
    if (!input) throw Error('Missing field '+selector);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', {bubbles:true}));
    await pause(80);
  };
  const submit = async () => { document.querySelector('form.details-form').requestSubmit(); await pause(350); };
  const isSqueeze = location.pathname === '/squeeze';
  const checkConsent = () => {
    const checks = document.querySelectorAll('form input[type=checkbox]');
    if(checks.length!==1 || !checks[0].checked) throw Error('Expected one pre-ticked consent checkbox');
    const button = document.querySelector('form button[type=submit]');
    if(!(button.compareDocumentPosition(checks[0]) & Node.DOCUMENT_POSITION_FOLLOWING)) throw Error('Consent must follow button');
  };
  if (isSqueeze) {
    checkConsent();
    await fill('input[autocomplete=name]', 'Browser Test');
    await fill('input[autocomplete=email]', 'browser@example.com');
    await fill('input[autocomplete=tel]', '07700900123');
    await submit();
    if(events.filter(e=>e[1]==='Lead').length!==1) throw Error('Squeeze did not fire exactly one Lead');
  } else {
    document.querySelector('.hero-cta').click();
    await pause(300);
    if(events.some(e=>e[1]==='Lead')) throw Error('Lead fired before contact submission');
  }
  for(let i=0;i<20 && !document.querySelector('.booking-shell');i++) {
    if(document.querySelector('input[autocomplete=given-name]')) { await fill('input[autocomplete=given-name]', 'Browser Test'); await submit(); }
    if(document.querySelector('input[autocomplete=organization]')) { await fill('input[autocomplete=organization]', 'Test Company'); await submit(); }
    if(document.querySelector('.option-card')) {
      document.querySelector('.option-card').click();
      await pause(350);
      const next = document.querySelector('.next-cta');
      if(next && !next.disabled) { next.click(); await pause(350); }
    } else if(!isSqueeze && document.querySelector('input[autocomplete=email]')) {
      checkConsent();
      if(events.some(e=>e[1]==='Lead')) throw Error('Premature Lead');
      await fill('input[autocomplete=email]', 'normal@example.com');
      await fill('input[autocomplete=tel]', '07700900123');
      await submit();
    } else await pause(350);
  }
  if(!document.querySelector('.booking-shell')) throw Error('Booking screen not reached');
  const leads=events.filter(e=>e[1]==='Lead');
  if(leads.length!==1) throw Error('Expected one total Lead, got '+leads.length);
  if(requests.some(r=>r.body.marketing!==false)) throw Error('Unexpected marketing opt-in');
  if(isSqueeze && requests[1]?.body.contactId!=='browser-test') throw Error('Existing contact was not reused');
  return JSON.stringify({funnel:isSqueeze?'squeeze':'normal', leads:leads.length, requests:requests.map(r=>r.url), booking:true, consent:'one pre-ticked checkbox below button', marketing:false});
})()
