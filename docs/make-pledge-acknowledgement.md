# Make pledge acknowledgement scenario

Smart Event Pass remains authoritative. The scenario may orchestrate an approved message and report delivery state; it must not calculate or update pledge, payment, RSVP, invitation, eligibility, role, or check-in state.

## Modules

1. Add **Webhooks → Custom webhook** and paste that generated HTTPS URL into Automation Center → Integrations → Make.
2. Add a **Router** for `message.acknowledgement.requested` and `pledge.reminder.send_requested`, and deduplicate on `idempotencyKey`.
3. Add a recipient validation filter requiring `data.normalizedRecipientPhone`, `data.recipientName`, `data.language`, and `data.message`. A missing or invalid recipient must report `skipped`; never infer a person from an internal ID.
4. Add **HTTP â†’ Make a request** to the approved WhatsApp endpoint. Map the already-rendered `data.message`; keep Meta credentials in a Make secure connection.
5. Add another **HTTP â†’ Make a request** callback to `callbackUrl`. Send JSON containing `deliveryId`, `status`, and an optional provider-safe `externalExecutionId`. Set the headers named by `callbackAuth.header` and `callbackAuth.deliveryHeader` to `callbackAuth.token` and `deliveryId` respectively.
6. Add an error-handler route that sends `failed`. Do not write directly to Supabase.

The exact scenario is: **Custom webhook â†’ Router â†’ recipient validation â†’ WhatsApp HTTP request â†’ authenticated callback**.

Make's standard modules cannot be assumed to expose the exact raw request bytes needed to reproduce the connector HMAC reliably. Callbacks therefore use a random, delivery-specific bearer token whose SHA-256 hash is stored by Smart Event Pass. The callback is also bound to the delivery UUID and constrained by replay-safe status transitions. The connector signing secret remains available for authenticating outbound Smart Event Pass payloads where a Make plan/module can verify HMAC.

## Field mapping

| Smart Event Pass | Make use |
| --- | --- |
| `deliveryId` | Callback correlation and `X-SEP-Delivery-Id` |
| `idempotencyKey` | Scenario deduplication key |
| `eventType` | Router condition |
| `event.publicReference` | Opaque event correlation |
| `event.name` | Message context |
| `data.recipientName` | Recipient display name |
| `data.normalizedRecipientPhone` | Validated recipient phone |
| `data.language` | `sw` or `en` |
| `data.message` | Rendered, recipient-safe message |
| `callbackUrl` | Status callback destination |
| `callbackAuth` | Delivery-specific callback header names and token |

Accepted callback statuses are `accepted`, `processing`, `completed`, `failed`, and `skipped`. Store production secrets only in Make secure connections/variables; never paste them into source code or scenario notes.
