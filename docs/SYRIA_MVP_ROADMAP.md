# Syria MVP vs Scale — Rollout Roadmap

## Principles

- **Trust and safety first**: Every phase must strengthen perceived safety and reduce anxiety.
- **Cash and offline first**: No dependency on cards or perfect connectivity for core flow.
- **One city then expand**: Prove in one city (e.g. Damascus or Aleppo) before multi-city.
- **Human override**: Admin and ops can always intervene; automation supports, does not replace.

---

## Phase 1: Syria MVP (Weeks 1–12)

**Goal**: Reliable, safe-feeling rides in one city with cash and family safety.

### Rider
- [x] Phone + OTP auth (no email required)
- [x] Live map; pickup/dropoff; fare estimate; price shown early
- [x] One action: “Request ride” (Arabic: اطلب رحلة)
- [x] Driver card: name, vehicle; trusted badge when applicable
- [x] Micro-copy: سائق موثّق · الرحلة مراقبة · الدعم جاهز
- [x] Trip share with family (live link)
- [x] Silent emergency (one tap, no panic UI)
- [x] Safe arrival confirmation (“أكد وصولك بأمان”)
- [x] Cash-only flow; optional wallet balance (no card required)
- [ ] Safe pickup suggestions (API + UI: اقتراحات آمنة)
- [ ] Low-bandwidth mode (reduce tiles/animations; queue actions when offline)

### Driver
- [x] Registration + admin approval
- [x] Online/offline; location; accept/start/complete
- [x] Earnings shown before accept (estimated fare)
- [x] Cash confirmation after trip (استلمت النقد؟)
- [x] Cash summary (today expected vs collected)
- [x] Fatigue suggestion; smart zones when data exists
- [ ] Offline-ready accept (queue + sync when back online)
- [ ] Trusted driver tier (documents + behavior); badge in app

### Platform
- [x] Admin: drivers, trips, fare, commission
- [x] Admin: disputes, cash reconciliation, risk zones list, crisis list
- [x] Cancellation rules; commission; fare config
- [ ] Seed neighborhoods and safe pickup points for pilot city
- [ ] Manual risk zone / crisis create (form or DB)

### Tech
- [x] REST + Socket.io; PostgreSQL; Syria schema (cash, safe arrival, crisis, risk, neighborhoods)
- [ ] Idempotency for accept/complete (offline retries)
- [ ] Single region; one backend instance acceptable for MVP

**MVP success**: Riders complete trips with cash, confirm safe arrival, share with family; drivers confirm cash; ops see reconciliation and can manage risk/crisis.

---

## Phase 2: Trust & city intelligence (Weeks 13–24)

**Goal**: Trust scores, trusted driver program, and city-level ops.

### Rider
- [ ] Driver trust score in UI (breakdown + “موثّق” tier)
- [ ] Rider trust profile (completion, no-shows); drivers see tier
- [ ] Safe pickup points in UI (tap to set pickup)
- [ ] Route deviation alert (subtle)
- [ ] Low-bandwidth mode shipped; offline queue for request/accept

### Driver
- [ ] Trusted driver application and verification
- [ ] “معروف في منطقتك” (known in your area) from neighborhood data
- [ ] Daily minimum / top-up when below threshold (configurable)
- [ ] Offline accept: store trip locally; sync when online

### Platform
- [ ] Trusted driver pipeline (documents, behavior, consistency)
- [ ] Neighborhood-based matching (prefer same area when possible)
- [ ] Risk zones: create/edit in admin; app fetches and warns or avoids
- [ ] Crisis: create/end in admin; rider/driver see message and optional pause
- [ ] Live city map (trips, demand) for ops

### Tech
- [ ] Redis adapter for Socket.io if multi-instance
- [ ] Optional job queue for safe-arrival reminders, reconciliation reports

---

## Phase 3: Community & resilience (Weeks 25–36)

**Goal**: Neighborhood trust clusters, ride-for-family, crisis resilience.

### Rider
- [ ] Ride for family (book for another person; family follows trip)
- [ ] Predictive suggestion (“معتاد تروح الساعة ٨؟”) for repeat patterns
- [ ] Crisis message in app when active; optional “ننصح بتأجيل الرحلة”

### Driver
- [ ] Community promotions (local business partnerships)
- [ ] Stronger fatigue logic; optional “suggested break” strength

### Platform
- [ ] Neighborhood trust clusters (aggregate scores by area)
- [ ] Crisis mode: scope by zone/city; allow_new_rides flag; rider/driver advice
- [ ] Fraud signals (unusual cancel, payment mismatch); review queue

### Tech
- [ ] Event-driven side effects (notifications, trust updates)
- [ ] Analytics for demand and patterns

---

## Phase 4: Scale & new cities (Ongoing)

**Goal**: Multi-city, reliability at scale, local wallets.

- [ ] Second city rollout (same product; new neighborhoods, pickup points, risk zones)
- [ ] Local wallet integration (when available)
- [ ] “Notify when drivers available” when no supply
- [ ] Matching timeout and expand search; clear rider message
- [ ] A/B tests for copy and flow (Arabic)

---

## Syria-specific checklist before launch

| Item | Owner |
|------|--------|
| Arabic copy for all rider/driver screens | Product |
| Safe pickup points for pilot city | Ops + DB |
| Neighborhoods for pilot city | Ops + DB |
| Cash-only default; no card required | Product + Backend |
| Safe arrival and family share tested | QA |
| Silent emergency and crisis flow tested | QA |
| Risk zone and crisis admin flows | Ops |
| Offline behavior documented and tested | QA |
| Legal/partner requirements (e.g. transport) | Legal |

---

## Summary

| Phase | Focus | Rider win | Driver win | Platform win |
|-------|--------|-----------|------------|--------------|
| 1 MVP | One city, cash, safety | Safe ride, share, safe arrival | Cash confirm, earnings clear | Reconciliation, risk/crisis lists |
| 2 Trust | Scores, trusted tier | Trust badge, safe pickups | Trusted badge, neighborhood | Trust pipeline, city map |
| 3 Community | Family ride, crisis | Ride for family, crisis msg | Promotions, fatigue | Trust clusters, crisis scope |
| 4 Scale | Multi-city | Notify when available | Daily minimum | Local wallets, reliability |

Build so that in Syria the app is the one people rely on daily: safer, clearer, and working even when conditions are bad.
