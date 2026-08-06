---
name: Postgres timestamp equality claims
description: Why optimistic-locking on timestamp columns fails between JS and Postgres
---
Never use equality on a timestamp column as an optimistic-lock/claim condition when the value round-trips through JS.

**Why:** Postgres stores timestamps with microsecond precision; JS `Date` only has milliseconds, so `WHERE ts = $jsDate` silently never matches. This made a booking-email retry claim always fail with no error.

**How to apply:** For atomic row claims, condition on an inequality (e.g. `last_attempt_at IS NULL OR last_attempt_at < backoffCutoff`) plus a counter column, not timestamp equality.

Also: in the API server, `console.log/error` output is swallowed (pino); use the shared `logger` or debugging output never appears in workflow logs.
