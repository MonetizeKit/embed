---
"@monetizekit/embed": minor
---

Add activation-funnel event instrumentation (overview-dashboard FRD OVR-21).

The pricing-table widget now posts `widget_view` on mount and `checkout_started`
when a paid-plan CTA is clicked to `{baseUrl}/api/v1/events/funnel`, tagged with
a stable per-browser anonymous session id (persisted in `localStorage`). Posting
is fire-and-forget (`fetch(..., { keepalive: true })`) and never blocks or
throws into widget rendering. Requires the monorepo's `POST /api/v1/events/funnel`
endpoint, which is backward-compatible and ignores unknown events — safe to
deploy this release before or after that endpoint ships.
