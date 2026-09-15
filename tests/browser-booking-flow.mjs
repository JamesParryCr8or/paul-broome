// Optional CDP end-to-end check: node tests/browser-booking-flow.mjs [debug-port]
import assert from 'node:assert/strict';

const port = process.argv[2] || '9224';
const target = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json()).then(items => items.find(item => item.type === 'page'));
assert(target?.webSocketDebuggerUrl, 'No Chrome page target found');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once:true}); socket.addEventListener('error', reject, {once:true}); });
let nextId = 0;
const waiting = new Map();
socket.addEventListener('message', event => { const message=JSON.parse(event.data); if(!message.id) return; const pending=waiting.get(message.id); if(!pending) return; waiting.delete(message.id); message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result); });
function command(method, params={}) { const id=++nextId; socket.send(JSON.stringify({id,method,params})); return new Promise((resolve,reject)=>waiting.set(id,{resolve,reject})); }
async function evaluate(expression) { const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}); if(result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
async function waitFor(expression, timeout=20000) { const started=Date.now(); while(Date.now()-started<timeout){ if(await evaluate(expression)) return; await new Promise(resolve=>setTimeout(resolve,150)); } throw new Error(`Timed out waiting for: ${expression}`); }

await command('Page.enable');
await command('Runtime.enable');
await waitFor("document.querySelector('.hero-cta')");
await evaluate("document.querySelector('.hero-cta').click()");
await waitFor("document.querySelector('.details-form')");
await evaluate(`(() => { const set=(s,v)=>{const i=document.querySelector(s); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true}));}; set('input[autocomplete="name"]','Preview Owner'); set('input[autocomplete="organization"]','Preview Roofing Ltd'); set('input[autocomplete="tel"]','07700900123'); set('input[autocomplete="email"]','preview@example.com'); document.querySelector('.check-row input').click(); document.querySelector('.details-form').requestSubmit(); })()`);
await waitFor("document.querySelector('.question-panel')");
for (let i=0;i<10;i++) {
  await evaluate("document.querySelector('.option-card').click()");
  await evaluate("document.querySelector('.next-cta').click()");
  if (i<9) await waitFor(`document.querySelector('.question-number')?.textContent.includes('${String(i+2).padStart(2,'0')}')`);
}
await waitFor("document.querySelector('.complete-card')", 30000);
const state = JSON.parse(await evaluate(`JSON.stringify({heading:document.querySelector('.complete-card h1')?.textContent,overlay:Boolean(document.querySelector('[data-nextjs-dialog]')),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth})`));
assert.match(state.heading, /sales leak snapshot/i);
assert.equal(state.overlay, false);
assert.equal(state.overflow, false);
console.log('PASS: hero, contact step, ten visual questions, API preview completion and responsive overflow check.');
socket.close();
