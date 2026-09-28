import test from 'node:test';
import assert from 'node:assert/strict';
import { trackLeadOnce } from '../lib/lead-tracking';

test('a submission fires once across squeeze, assessment, retries and reload markers', () => {
  const values = new Map<string, string>();
  const calls: unknown[][] = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const browser = {
    localStorage: { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) },
    fbq: (...args: unknown[]) => calls.push(args),
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  try {
    assert.equal(trackLeadOnce('squeeze-test', 'Sales Leak Squeeze Page'), true);
    assert.equal(trackLeadOnce('squeeze-test', 'Sales Leak Assessment'), false);
    assert.equal(trackLeadOnce('squeeze-test', 'Sales Leak Squeeze Page'), false);
    assert.equal(trackLeadOnce('normal-test', 'Sales Leak Assessment'), true);
    values.set('paul_broome_lead_pixel_reloaded-test', '1');
    assert.equal(trackLeadOnce('reloaded-test', 'Sales Leak Assessment'), false);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], ['track', 'Lead', { content_name: 'Sales Leak Squeeze Page' }, { eventID: 'squeeze-test' }]);
    Object.defineProperty(browser, 'localStorage', { get() { throw new Error('Storage blocked'); } });
    assert.equal(trackLeadOnce('blocked-storage-test', 'Sales Leak Assessment'), true);
    assert.equal(trackLeadOnce('blocked-storage-test', 'Sales Leak Assessment'), false);
    Object.defineProperty(browser, 'fbq', { value: undefined, configurable: true });
    assert.equal(trackLeadOnce('pixel-not-ready-test', 'Sales Leak Assessment'), false);
    Object.defineProperty(browser, 'fbq', { value: (...args: unknown[]) => calls.push(args) });
    assert.equal(trackLeadOnce('pixel-not-ready-test', 'Sales Leak Assessment'), true);
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
