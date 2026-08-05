# Financial automation scheduler

The scheduler endpoint is:

`GET /api/cron/financial-automation`

It is not enabled automatically. Configure these server-only environment variables:

- `FINANCIAL_AUTOMATION_CRON_SECRET`: a strong random secret used as the Bearer token.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase server credential. Never prefix it with `NEXT_PUBLIC_`.
- `BEEM_API_KEY`, `BEEM_SECRET_KEY`, `BEEM_SENDER_NAME`: BEEM Africa SMS credentials and approved sender.
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`: Meta WhatsApp Cloud API server credentials.
- `WHATSAPP_FINANCIAL_REMINDER_TEMPLATE_SW`, `WHATSAPP_FINANCIAL_REMINDER_TEMPLATE_EN`: approved pledge-reminder template names.
- `WHATSAPP_PLEDGE_ACKNOWLEDGEMENT_TEMPLATE_SW`, `WHATSAPP_PLEDGE_ACKNOWLEDGEMENT_TEMPLATE_EN`: exact approved Meta template name for newly submitted pledge acknowledgements.
- `WHATSAPP_FINANCIAL_THANK_YOU_TEMPLATE_SW`, `WHATSAPP_FINANCIAL_THANK_YOU_TEMPLATE_EN`: exact approved Meta template names for completed-pledge thank-you messages.
- `WHATSAPP_FINANCIAL_THANK_YOU_TEMPLATE_LANGUAGE_SW=sw`, `WHATSAPP_FINANCIAL_THANK_YOU_TEMPLATE_LANGUAGE_EN=en_US`: exact language codes approved with those Meta templates.
- `WHATSAPP_DAILY_SUMMARY_TEMPLATE_SW`, `WHATSAPP_DAILY_SUMMARY_TEMPLATE_EN`: approved daily-summary template names.
- `WHATSAPP_GRAPH_API_VERSION`: optional Meta Graph version (defaults to `v23.0`).

Example request:

```bash
curl --fail --request GET \
  --header "Authorization: Bearer $FINANCIAL_AUTOMATION_CRON_SECRET" \
  https://your-app.example/api/cron/financial-automation
```

Run the endpoint every 5–15 minutes so configured UTC summary times and retry windows are handled
promptly. Configure the Vercel Cron schedule separately after staging verification; deployment does
not automatically enable scheduled sending.

The endpoint uses cooldown-window and daily idempotency keys, processes recipients and events
independently, retries transient reminder failures at most three times, and returns aggregate counts
only. It never returns names, phone numbers, messages, provider errors, or credentials. WhatsApp
uses approved templates only; missing templates remain visible in preview/configuration state and
are never reported as successful delivery. Meta webhook status is authoritative for WhatsApp
`delivered` and `read`.

Approved financial reminder templates must accept body variables in this order: contributor name,
event title, total pledge, total received, outstanding balance. Daily-summary templates must accept:
event title, collected today, transaction count, contributors today, total pledged, total collected,
outstanding balance, collection percentage, contributors with balances, completed pledges, and top
contributor. Keep the Swahili and English templates structurally aligned with these variables.

The dedicated pledge acknowledgement Meta template name is `financial_pledge_acknowledgement`,
with `sw` and `en_US` language variants. Set both
`WHATSAPP_PLEDGE_ACKNOWLEDGEMENT_TEMPLATE_SW` and
`WHATSAPP_PLEDGE_ACKNOWLEDGEMENT_TEMPLATE_EN` to that exact name. It accepts body variables in
this order: contributor name, event title, total pledge, total received, and balance. It must not
reuse or fall back to the completed-pledge thank-you template.

The canonical completed-pledge configuration is `WHATSAPP_FINANCIAL_THANK_YOU_TEMPLATE_SW`
and `WHATSAPP_FINANCIAL_THANK_YOU_TEMPLATE_EN`. Each value must be the exact Meta template name
(for example, `financial_pledge_thank_you`), not a message body, display label, or Meta status.
During the transition, `WHATSAPP_PLEDGE_THANK_YOU_TEMPLATE_NAME` and
`WHATSAPP_PLEDGE_THANK_YOU_TEMPLATE_LANGUAGE` remain supported as Swahili-only aliases. New
deployments must use the canonical language-specific names.

All variables above are server-only. Never expose the cron secret, service-role key, provider keys,
or WhatsApp access token through `NEXT_PUBLIC_` variables, browser code, logs, or API responses.
