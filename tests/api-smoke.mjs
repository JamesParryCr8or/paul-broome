// Run against a local preview: node tests/api-smoke.mjs [port]
import assert from 'node:assert/strict';

const port = process.argv[2] || '3000';
const origin = `http://127.0.0.1:${port}`;
const answers = {
  adSpend:'over-5000', sector:'roofing', yearsTrading:'6-10', appointments:'50-99', salespeople:'4-6',
  closeRate:'3-4', biggestCost:'more-quotes', averageOrderValue:'10000-19999', biggestImprovement:'close-rate', timeline:'now',
};
const payload = {
  id:crypto.randomUUID(), answers, name:'Preview Owner', company:'Preview Roofing Ltd', email:'preview@example.com',
  phone:'07700900123', consent:true, marketing:false, website:'', attribution:{utm_source:'facebook',utm_campaign:'preview-test'},
};
async function submit(data, requestOrigin = origin) {
  return fetch(`${origin}/api/leads`, {method:'POST', headers:{'Content-Type':'application/json', Origin:requestOrigin}, body:JSON.stringify(data), signal:AbortSignal.timeout(30000)});
}

const home = await fetch(origin, {signal:AbortSignal.timeout(30000)});
assert.equal(home.status, 200);
assert.match(await home.text(), /Safe preview/, 'Refuse to test against a live capture environment');
const first = await submit(payload);
assert.equal(first.status, 200);
const body = await first.json();
assert.equal(body.preview, true);
assert.equal(body.route, 'training');
assert.equal(body.tier, 'priority');
assert.equal((await submit({...payload, consent:false})).status, 400);
assert.equal((await submit(payload, 'https://untrusted.example')).status, 403);
const retry = await fetch(`${origin}/api/integrations/retry`, {method:'POST', signal:AbortSignal.timeout(30000)});
assert.equal(retry.status, 401);
console.log('PASS: page, preview submission, scoring, consent validation, origin rejection and retry authentication.');
