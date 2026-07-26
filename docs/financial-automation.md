# Financial automation scheduler

The scheduler endpoint is:

`GET /api/cron/financial-automation`

It is not enabled automatically. Configure these server-only environment variables:

- `FINANCIAL_AUTOMATION_CRON_SECRET`: a strong random secret used as the Bearer token.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase server credential. Never prefix it with `NEXT_PUBLIC_`.

Example request:

```text
Authorization: Bearer <FINANCIAL_AUTOMATION_CRON_SECRET>
```

The endpoint uses daily idempotency keys, continues after individual failures, records every
accepted attempt, and returns only aggregate counts. Configure a Vercel Cron schedule separately
after testing in staging. WhatsApp automation remains disabled until an approved financial
message template is configured; those attempts are recorded as failed rather than reported sent.
