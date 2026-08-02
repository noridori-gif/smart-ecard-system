# Make pledge acknowledgement scenario

Smart Event Pass remains authoritative. The scenario may orchestrate an approved message and report delivery state; it must not calculate or update pledge, payment, RSVP, invitation, eligibility, role, or check-in state.

## Modules

1. Add **Webhooks → Custom webhook** and paste that generated HTTPS URL into Automation Center → Integrations → Make.
2. Verify the `X-SEP-Signature` against `X-SEP-Timestamp + "." + rawBody` using the one-time signing secret. Reject requests older than five minutes and deduplicate on `idempotencyKey`.
3. Validate `schemaVersion`, `deliveryId`, `idempotencyKey`, `eventType`, `occurredAt`, `event.publicReference`, `subject.type`, and `subject.publicReference`.
4. Add a router for recipient data available versus unavailable. A missing recipient must produce `skipped`; never infer or look up a person from internal numeric IDs.
5. Send the acknowledgement through the approved channel. Treat the initial Smart Event Pass request as webhook acceptance, not proof of message delivery.
6. POST a signed raw JSON callback to `callbackUrl` with `deliveryId`, `status`, and an optional provider-safe `externalExecutionId`.
7. Add an error handler that posts `failed`. Do not write directly to Supabase.

## Field mapping

| Smart Event Pass | Make use |
| --- | --- |
| `deliveryId` | Callback correlation and `X-SEP-Delivery-Id` |
| `idempotencyKey` | Scenario deduplication key |
| `eventType` | Router condition |
| `event.publicReference` | Opaque event correlation |
| `event.name` | Message context |
| `subject.type` | Subject router condition |
| `subject.publicReference` | Opaque subject correlation |
| `data` | Minimum event-specific public-safe inputs |
| `callbackUrl` | Signed status callback destination |

Accepted callback statuses are `accepted`, `processing`, `completed`, `failed`, and `skipped`. Store production secrets only in Make secure connections/variables; never paste them into source code or scenario notes.
