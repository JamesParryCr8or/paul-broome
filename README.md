# Paul Broome Sales Mastery · Sales Leak Assessment

A mobile-first Next.js squeeze-page quiz for established UK home improvement businesses. It captures contact details, takes prospects through ten visual qualification questions, scores commercial fit server-side, and prepares a clean handoff to GoHighLevel and the next funnel step.

## Run locally

```powershell
npm run dev
npm test
npm run typecheck
npm run build
```

The `&` in some Windows workspace paths can interfere with npm. From this folder, the direct equivalents are:

```powershell
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000
node node_modules/tsx/dist/cli.mjs --test tests/quiz.test.ts
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
```

## Funnel journey

1. Focused squeeze page: “Are You Making This £660K Sales Mistake?”
2. Contact details: name, company, phone and email.
3. Ten one-at-a-time assessment questions covering spend, sector, trading history, appointments, team, conversion, leakage, order value, desired outcome and readiness.
4. Completion insight and optional redirect to the training, booking calendar or next GHL funnel step.

The £660K figure is explicitly framed as an illustrative calculation: five missed £11K jobs per month across twelve months. It is not presented as a typical result or earnings promise.

## Safe preview mode

`LEAD_CAPTURE_ENABLED=false` is the default. The full experience works, but details are neither stored nor sent. A preview banner makes this clear.

Set `NEXT_STEP_URL` to an HTTPS destination when the post-assessment training or GHL page is ready. In preview mode the completion screen shows the configured destination as a button rather than automatically redirecting.

## Production configuration

Copy `.env.example` into the appropriate environment and configure:

- `DATABASE_URL`
- `GHL_PRIVATE_INTEGRATION_KEY`
- `GHL_LOCATION_ID`
- `GHL_CUSTOM_FIELDS`
- `CRM_RETRY_SECRET`
- `APP_ORIGIN`
- `NEXT_STEP_URL`
- `LEAD_CAPTURE_ENABLED=true` only after end-to-end testing

Apply `database/schema.sql` to a private Postgres database before enabling capture. The API validates the complete payload, checks origin and content type, limits request size, uses a honeypot, hashes payloads for idempotency, applies a persistent fixed-window throttle, and performs the GHL sync after the response.

## GoHighLevel fields

The lead is upserted with name, company, email and phone. Create and map custom fields as needed:

`submission_id`, `lead_score`, `lead_tier`, `lead_route`, `adSpend`, `sector`, `yearsTrading`, `appointments`, `salespeople`, `closeRate`, `biggestCost`, `averageOrderValue`, `biggestImprovement`, `timeline`, `marketing_consent`, `enquiry_consent`, `consent_version`, `consent_at`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_id`, `fbclid`, `gclid`, `landing_path`, `referrer`.

`GHL_CUSTOM_FIELDS` is a JSON object mapping those keys to actual GHL field IDs. Example:

```json
{"lead_score":"FIELD_ID","closeRate":"FIELD_ID","biggestCost":"FIELD_ID"}
```

## Scoring

Scoring is internal and based on advertising investment, appointment volume, team size, current close rate, average order value and implementation timing. All prospects reach the training; the score determines `priority`, `qualified` or `nurture` for downstream workflows.

The score is not shown as a promise of likely results. Adjust the model in `lib/quiz.ts` once real lead-to-sale data is available.

## Tracking handoff

The browser currently pushes non-PII events to `window.dataLayer` only:

- `sales_leak_page_view`
- `sales_leak_assessment_started`
- `sales_leak_contact_step_complete`
- `sales_leak_answer`
- `sales_leak_step_complete`
- `sales_leak_preview_complete`
- `sales_leak_submitted`

Allowlisted UTM parameters plus `fbclid`, `gclid`, landing path and referrer origin are included with the server payload. Meta Pixel, CAPI, GA4 and GTM are deliberately not network-connected yet. Add an approved consent mechanism and deduplicated browser/server events when those integrations are configured.

## Brand assets

The logo and founder portrait are authorised assets loaded from Paul Broome’s existing Cloudinary account. The remaining visual system is original CSS and inline SVG/lucide artwork. Remote image access is restricted in `next.config.ts` to Paul’s Cloudinary path.

## Before launch

- Confirm the legal entity and privacy-policy URL.
- Confirm consent wording and retention policy.
- Verify the 43+ years and 4,500+ deal claims used on the page.
- Test all mapped GHL fields, workflows and ownership rules.
- Configure the next-step URL and verify the full redirect journey.
- Install approved GTM/Meta tracking and consent behaviour.
- Remove `robots: noindex` only when the final domain and launch plan require indexing.
