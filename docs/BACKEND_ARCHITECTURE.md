# RideHail — Backend Architecture (Next-Gen)

## Principles

- **Real-time first**: WebSockets for location, trip status, and live admin map; REST for CRUD and idempotent operations.
- **Event-driven**: Domain events (trip_matched, trip_started, driver_location, safety_alert) drive side effects (notifications, analytics, fraud checks).
- **Clean domain separation**: Rider, Driver, and Platform (admin) are distinct bounded contexts with clear APIs and ownership.
- **Graceful failure**: Network, GPS, and payment failures have defined behaviors; no silent data loss; retries and user-facing messages.

---

## High-Level Architecture

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                     API Gateway / LB                      │
                    └─────────────────────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
            │  REST API     │         │  Socket.io     │         │  Webhooks      │
            │  (Express)    │         │  (Real-time)  │         │  (Stripe, etc) │
            └───────┬───────┘         └───────┬───────┘         └───────┬───────┘
                    │                         │                         │
                    └─────────────────────────┼─────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
            │  Auth         │         │  Trip          │         │  Safety &      │
            │  (JWT, OTP)   │         │  (match,      │         │  Trust         │
            │               │         │   status)     │         │  (scores,     │
            └───────────────┘         └───────────────┘         │   emergency)   │
                    │                         │                  └───────────────┘
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
            │  Fare &       │         │  Events        │         │  Zones &      │
            │  Surge        │         │  (emit to      │         │  Fatigue       │
            │               │         │   socket,      │         │                │
            └───────────────┘         │   workers)     │         └───────────────┘
                    │                 └───────────────┘                 │
                    │                         │                         │
                    └─────────────────────────┼─────────────────────────┘
                                              │
                                              ▼
                                    ┌───────────────────┐
                                    │  PostgreSQL       │
                                    │  (single source   │
                                    │   of truth)       │
                                    └───────────────────┘
```

---

## Bounded Contexts

| Context | Responsibility | Key entities |
|--------|----------------|--------------|
| **Rider** | Identity, profile, trip requests, payments, safety (share, emergency), ratings given | users, trips (as rider), payments, safety_events |
| **Driver** | Identity, documents, location, availability, trip execution, earnings, fatigue, trust score | drivers, vehicles, trips (as driver), wallets, driver_sessions, trust_scores |
| **Platform** | Matching, fare/surge, commission, zones, disputes, fraud, admin ops | fare_config, surge_rules, smart_zones, disputes, fraud_signals, admins |

---

## Real-Time (Socket.io)

- **Channels**:
  - `user:{userId}` — trip updates, driver location, safety alerts.
  - `driver:{driverId}` — ride requests, trip updates, zone hints.
  - `admin` — live map feed (aggregated, anonymized or with permissions).
- **Events**:
  - To rider: `trip_matched`, `driver_location`, `trip_status`, `trip_completed`, `safety_alert`.
  - To driver: `ride_request`, `trip_cancelled`, `zone_update`.
  - To admin: `city_snapshot` (periodic), `dispute_created`, `emergency_alert`.
- **Scalability**: Use Redis adapter for multi-instance Socket.io; optionally separate "realtime" service.

---

## Event-Driven Side Effects

Events (e.g. trip completed, emergency tapped) can trigger:

- **Notifications**: Push (FCM) or in-app; context-aware, non-spammy.
- **Analytics**: Trip duration, revenue, cancellation reasons — for product and ops.
- **Trust & safety**: Update trust scores, flag for review, feed fraud model.
- **Fatigue**: Update driver session length; trigger rest suggestion when threshold hit.

Implementation: in-process emitters first; later replace with message queue (e.g. Redis/RabbitMQ) and workers.

---

## Graceful Failure Handling

| Failure | Behavior |
|---------|----------|
| **DB down** | Health check fails; return 503; retry with backoff; show "We're fixing this" in app. |
| **Socket disconnect** | Client reconnects with JWT; server re-attaches to rooms; replay last trip state if needed. |
| **Payment (Stripe) fail** | Record failure; don’t mark trip paid; show "Update payment" in app; retry idempotently. |
| **GPS unavailable** | Allow manual pickup pin; store "estimated" flag; support can adjust. |
| **Matching timeout** | After N seconds, expand search or show "No drivers; try in a few minutes" with optional notify when available. |

---

## Security

- **Auth**: JWT with short-lived access + optional refresh; OTP for rider; driver/admin with credentials or magic link.
- **RBAC**: Middleware enforces rider / driver / admin; sensitive admin routes require admin role.
- **PII**: Minimize logging of phone/email; encrypt or tokenize in DB if required by policy.
- **Safety**: Emergency and dispute data access restricted; audit log for admin actions.

---

## Tech Stack (Current / Suggested)

- **Runtime**: Node.js (Express).
- **DB**: PostgreSQL (single primary); connection pooling (pg).
- **Real-time**: Socket.io (Redis adapter for scale).
- **Payments**: Stripe (webhooks for idempotent confirmation).
- **Jobs** (scale-up): Bull/BullMQ with Redis for fatigue, surge, and notifications.
- **Maps**: Optional server-side Google APIs (Directions, Distance Matrix) for ETA and route validation.
