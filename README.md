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
4. The result flows directly into Paul’s live Strategy Call calendar, with the visitor’s assessment ID and contact details carried into the booking widget.
5. After booking, `/confirmed` presents a video-led pre-call diagnostic and saves each answer as the prospect progresses.

## Post-booking diagnostic

In HighLevel, open Paul’s **Strategy Call** calendar and set **Advanced settings → Form & confirmation → Confirmation page** to redirect to:

```text
https://paul-broome.vercel.app/confirmed
```

The parent page detects that same-origin confirmation redirect and restores the assessment UUID plus name, company, email and phone before opening the diagnostic. It also listens for HighLevel’s booking-complete message and includes a visible fallback link for visitors who booked in a separate tab. The confirmation page accepts `submission_id`, `lead_id` or `uuid` as fallbacks and tolerates the older malformed `?notrack=true?first_name=...` URL format.

The diagnostic stores its draft locally and autosaves a versioned full snapshot after each change. A `pagehide` keepalive save covers tab closes and navigation. The API only accepts newer revisions, preventing an older slow request from overwriting newer answers. Completed diagnostics receive the same UUID as the original lead.

The £660K figure is explicitly framed as an illustrative calculation: five missed £11K jobs per month across twelve months. It is not presented as a typical result or earnings promise.

## Safe preview mode

`LEAD_CAPTURE_ENABLED=false` is the default. The full experience works, but details are neither stored nor sent. A preview banner makes this clear.

The assessment now uses Paul’s authorised HighLevel calendar directly; `NEXT_STEP_URL` is retained only for compatibility with older lead payloads and is not used by the current interface.

## Production configuration

Copy `.env.example` into the appropriate environment and configure:

- `DATABASE_URL`
- `GHL_PRIVATE_INTEGRATION_KEY`
- `GHL_LOCATION_ID`
- `GHL_WEBHOOK` (HTTPS inbound workflow webhook; supports webhook-only capture without a database)
- `GHL_CUSTOM_FIELDS`
- `GHL_DIAGNOSTIC_FIELDS`
- `GHL_USER_ID` (optional; adds a completed diagnostic as a contact note)
- `CRM_RETRY_SECRET`
- `APP_ORIGIN`
- `NEXT_STEP_URL`
- `LEAD_CAPTURE_ENABLED=true` only after end-to-end testing

For direct API sync and durable server-side history, apply `database/schema.sql` to a private Postgres database before enabling capture. Alternatively, `GHL_WEBHOOK` can receive the assessment and every diagnostic progress save without a database. The API validates the payload, checks origin and content type, limits request size and uses a honeypot. Database-backed capture additionally hashes payloads for idempotency and applies a persistent fixed-window throttle.

## GoHighLevel fields

The lead is upserted with name, company, email and phone. Create and map custom fields as needed:

`submission_id`, `lead_score`, `lead_tier`, `lead_route`, `adSpend`, `sector`, `yearsTrading`, `appointments`, `salespeople`, `closeRate`, `biggestCost`, `averageOrderValue`, `biggestImprovement`, `timeline`, `marketing_consent`, `enquiry_consent`, `consent_version`, `consent_at`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_id`, `fbclid`, `gclid`, `landing_path`, `referrer`.

`GHL_CUSTOM_FIELDS` is a JSON object mapping those keys to actual GHL field IDs. Example:

```json
{"lead_score":"FIELD_ID","closeRate":"FIELD_ID","biggestCost":"FIELD_ID"}
```

`GHL_DIAGNOSTIC_FIELDS` follows the same format. Supported keys are `diagnostic_submission_id`, `diagnostic_status`, `diagnostic_current_step`, `diagnostic_updated_at`, `diagnostic_completed_at`, `offerAndAov`, `monthlyRevenue`, `qualifiedLeads`, `closeRate`, `lostReason`, `lostReasonOther`, `lostDeals`, `lostValue`, `structuredProcess`, `coachingInvestment`, `coachingDetails`, `frustration`, `whyNow`, `consequences`, `soleDecisionMaker` and `readyToInvest`.

Webhook payloads use `assessment.completed`, `diagnostic.progress` and `diagnostic.completed` event names. Every diagnostic payload contains both `abandonment_url` and `resume_url`, dynamically built from the UUID and contact details—no separate abandonment URL environment variable is needed. A HighLevel workflow can wait 30–60 minutes, check that the latest status is not `completed`, then send the supplied URL back to the prospect. When direct API sync and `GHL_USER_ID` are configured, finished answers are also written to a titled contact note.

## Scoring

Scoring is internal and based on advertising investment, appointment volume, team size, current close rate, average order value and implementation timing. All prospects reach the training; the score determines `priority`, `qualified` or `nurture` for downstream workflows.

The score is not shown as a promise of likely results. Adjust the model in `lib/quiz.ts` once real lead-to-sale data is available.

## Tracking handoff

The browser pushes non-PII events to `window.dataLayer`:

- `sales_leak_page_view`
- `sales_leak_assessment_started`
- `sales_leak_contact_step_complete`
- `sales_leak_answer`
- `sales_leak_step_complete`
- `sales_leak_preview_complete`
- `sales_leak_submitted`
- `sales_leak_call_booked`

Meta Pixel `24080705154882371` loads after hydration. It sends the standard `Lead` event after a successful live assessment submission and `Schedule` when the booking handoff is confirmed, using the submission UUID as the browser event ID. Session storage prevents the `/confirmed` handoff from firing the same Schedule event twice. Allowlisted UTM parameters plus `fbclid`, `gclid`, landing path and referrer origin are included with the server payload.

## Brand assets

The logo, favicon and founder portrait are authorised assets loaded from Paul Broome’s existing Cloudinary account. The remaining visual system is original CSS and inline SVG/lucide artwork. Remote image access is restricted in `next.config.ts` to Paul’s Cloudinary path. The branded HighLevel calendar is eagerly preloaded off-screen so its assets and availability are warm before the visitor finishes the assessment.

## Before launch

- Confirm the legal entity and privacy-policy URL.
- Confirm consent wording and retention policy.
- Verify the 43+ years and 4,500+ deal claims used on the page.
- Test all mapped GHL fields, workflows and ownership rules.
- Configure the next-step URL and verify the full redirect journey.
- Confirm consent behaviour for the installed Meta Pixel before paid traffic goes live.
- Remove `robots: noindex` only when the final domain and launch plan require indexing.
