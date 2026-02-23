# Syria-First Backend Architecture

## Principles

- **Offline-tolerant**: Critical actions (request, accept, complete, cash confirm) can be queued and synced when the connection returns.
- **Cash-first**: No dependency on card gateway for core flow; cash reconciliation is a first-class domain.
- **Real-time when available**: WebSockets for live location and status; graceful fallback to polling or cached state when the network is poor.
- **Trust and safety as domains**: Trust scores, safe arrival, family share, silent emergency, and risk zones have dedicated models and APIs.
- **Human override**: Admin can intervene (disputes, crisis, risk zones, manual pricing) so the system works when automation isn’t enough.

---

## High-Level Architecture

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                  API (Express) + Socket.io               │
                    │                  (offline-aware client sync)             │
                    └─────────────────────────────────────────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
        ▼                                     ▼                                     ▼
┌───────────────┐                   ┌───────────────┐                   ┌───────────────┐
│  Auth (phone  │                   │  Trip lifecycle│                   │  Trust &      │
│  + OTP)       │                   │  + matching   │                   │  Safety       │
└───────────────┘                   └───────────────┘                   └───────────────┘
        │                                     │                                     │
        │                             ┌───────┴───────┐                             │
        │                             ▼               ▼                             │
        │                     ┌───────────────┐ ┌───────────────┐                   │
        │                     │  Cash         │ │  Crisis &     │                   │
        │                     │  reconciliation│ │  Risk zones   │                   │
        │                     └───────────────┘ └───────────────┘                   │
        │                             │               │                             │
        └─────────────────────────────┼───────────────┼─────────────────────────────┘
                                      │               │
                                      ▼               ▼
                            ┌───────────────────────────────┐
                            │  PostgreSQL                   │
                            │  (single source of truth)     │
                            └───────────────────────────────┘
```

---

## Offline-Tolerance Strategy

| Layer | Strategy |
|-------|----------|
| **Client** | Queue critical mutations (request ride, accept, complete, cash confirm) in local storage when offline. On reconnect, send with idempotency key; server applies once. |
| **Server** | Idempotency keys for trip accept and complete; return last state so client can reconcile. |
| **Real-time** | Socket.io for live updates when connected; client polls GET /trips/:id when socket is down and uses cached trip state for UI. |
| **Map** | Client can cache last-known driver position and route; low-bandwidth mode requests fewer tiles or static fallback. |

---

## Cash-First Flow

1. **Fare calculation**: Server computes fare (with optional lock); returns to client. Driver sees expected earnings before accept.
2. **Trip complete**: Server creates `trip_cash_records` with `expected_amount`; `collected_amount` and `confirmed_at` set when driver confirms (online or when back online).
3. **Reconciliation**: Admin or batch job can list daily driver cash: expected vs collected; follow up on gaps.
4. **Wallet (future)**: Internal balance for riders/drivers; local wallet integration via separate provider.

---

## Trust & Safety Domains

- **Trust**: `driver_trust_scores`, `rider_trust_scores`, `neighborhoods`, trusted driver flag. Matching can prefer trusted drivers and high-trust riders.
- **Safe arrival**: Trip gets `safe_arrival_confirmed_at` when rider taps; optional reminder and family notification.
- **Family share**: Existing `trip_share_links`; optional “ride for family” with `booked_by_user_id` and rider details.
- **Silent emergency**: `safety_events.event_type = 'silent_emergency'`; same handling as emergency (alert platform, store location).
- **Risk zones & crisis**: `risk_zones` and `crisis_events`; matching and UI can avoid or warn; admin controls.

---

## Security & Auth

- **Phone + OTP**: Primary auth; no email required. JWT after verify.
- **Driver**: Same phone auth; optional document check for trusted tier.
- **Admin**: Email + password; used only for ops.
- **PII**: Minimize logging; store only what’s needed for ops and safety.

---

## Tech Stack (Syria-Aligned)

- **Runtime**: Node.js (Express).
- **DB**: PostgreSQL; connection pooling.
- **Real-time**: Socket.io; Redis adapter when scaling to multiple instances.
- **Jobs**: Optional Bull + Redis for reminders (safe arrival), reconciliation reports, crisis notifications.
- **Maps**: Client-side or optional server-side geocode; safe pickup points from DB.
