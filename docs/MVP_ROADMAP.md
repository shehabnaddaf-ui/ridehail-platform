# RideHail — MVP vs Scale-Up Roadmap

## Product lens

- **MVP**: Prove core value with minimal anxiety and maximum trust. One city, one ride type default, manual ops where AI isn’t needed.
- **Scale-up**: Add intelligence, automation, and emotional differentiation so the product feels alive and premium at scale.

---

## Phase 1: MVP (Weeks 1–8)

**Goal**: Safe, reliable ride from A to B with clear pricing and basic safety.

### Rider
- [x] Phone + OTP auth
- [x] Live map, pickup/dropoff, fare estimate
- [x] Single primary CTA: Request ride
- [x] Driver match (nearest available)
- [x] Real-time driver location and trip status
- [x] Micro-copy: Driver verified · Trip tracked · Support ready
- [x] Trip sharing (share link)
- [x] One-tap emergency
- [x] Cash + card (Stripe)
- [x] Ride history and receipt
- [ ] Default ride type from preferences (backend ready; wire in rider app)

### Driver
- [x] Registration + admin approval
- [x] Online/offline, location updates
- [x] Accept ride (or auto-assign in current flow)
- [x] Start / complete trip, earnings and wallet
- [x] Smart zones (API + UI when zones exist)
- [x] Fatigue: rest suggestion + take break
- [x] Earnings screen with “daily goal” style copy

### Platform
- [x] Admin: drivers (approve/reject), trips, fare config, commission
- [x] Admin: disputes list and resolve (no AI yet)
- [x] Cancellation rules and commission in DB
- [ ] Seed first admin; no self-serve admin signup in prod

### Tech
- [x] REST + Socket.io
- [x] PostgreSQL schema + next-gen (trust, safety, zones, fatigue, disputes)
- [ ] Single region; no Redis adapter (single instance OK for MVP)

**MVP success**: Riders complete trips with low anxiety; drivers get paid; platform takes commission; safety layer (share + emergency) and trust copy are visible.

---

## Phase 2: Trust & intelligence (Weeks 9–16)

**Goal**: Deeper trust (driver score, fairness) and first platform intelligence.

### Rider
- [ ] Driver trust score in UI (breakdown: driving, cancellation, feedback)
- [ ] Route deviation detection (compare actual vs expected polyline; alert if > threshold)
- [ ] Reassurance push: “Driver 2 min away”, “Trip tracked” (FCM)

### Driver
- [ ] Trust score visible to driver (how they’re doing)
- [ ] Reputation rewards (e.g. “Top 20% this week”) — gamification
- [ ] Ride preview before accept: destination, estimated fare, ride type

### Platform
- [ ] Live map for admin: active trips + simple demand view
- [ ] Emotional indicators v1: zones with “long wait” or “high demand” from aggregates
- [ ] Surge rules: caps, explanations (“High demand in your area”)
- [ ] Dispute queue: AI suggestion (rule-based or simple model) for resolution
- [ ] Fraud signals: log unusual cancels, payment failures; review queue

### Tech
- [ ] Redis adapter for Socket.io (multi-instance)
- [ ] Background jobs (Bull + Redis): surge refresh, notification send
- [ ] Optional: Google Directions/Distance Matrix for ETA and route

---

## Phase 3: Feels alive (Weeks 17–24)

**Goal**: App feels fast, anticipatory, and context-aware.

### Rider
- [ ] Nearby drivers moving on map (before request)
- [ ] Predictive pickup: “Ride to Office? Leave in ~5 min” for repeat patterns
- [ ] Mood-based UX: dark mode at night; subtle copy/theme
- [ ] Fare guarantee: “Fare locked” within rules (e.g. no route change)

### Driver
- [ ] Push when entering a smart zone: “High demand in [Zone] for ~45 min”
- [ ] Streak / consistency rewards in earnings UI
- [ ] Softer fatigue logic: time + trip count + optional break reminder

### Platform
- [ ] Rider frustration zones (e.g. avg wait, cancel rate by area)
- [ ] Driver stress zones (density, earnings per hour)
- [ ] Surge that feels fair: explain + cap; A/B test messaging
- [ ] Silent quality: auto-flag low ratings, deviations; reduce support load

### Tech
- [ ] Event bus (e.g. Redis pub/sub or queue) for domain events
- [ ] Analytics pipeline for patterns (predictive pickup, zones)

---

## Phase 4: Scale (Ongoing)

**Goal**: Multi-city, reliability, and cost control.

- [ ] Multi-region deployment; DB read replicas
- [ ] Matching: expand search after timeout; “Notify when drivers available”
- [ ] Payments: retries, idempotency, full Stripe webhook handling
- [ ] Loyalty: non-spammy rewards (e.g. “3 rides this week → $5 off next”)
- [ ] Driver burnout: longer-session insights; optional “suggested break” strength
- [ ] AI dispute resolution: train on resolved disputes; suggest outcome + confidence
- [ ] Fraud: pattern model (anomaly detection) and auto-flag

---

## Summary

| Phase   | Focus                    | Rider win              | Driver win           | Platform win        |
|---------|--------------------------|------------------------|----------------------|---------------------|
| MVP     | Core ride + safety       | Safe, clear, low anxiety| Earn, zones, fatigue | Ops, disputes       |
| Trust   | Scores, fairness         | Trust score, deviation | Reputation, preview  | Live map, surge, AI |
| Alive   | Anticipatory, context    | Predict, mood UX       | Zone push, streaks   | Emotional indicators|
| Scale   | Reliability, multi-city | Notify when available  | Burnout prevention   | Fraud, loyalty      |

Build so that **every phase** reinforces: minimize anxiety, maximize control, and create emotional trust. Ship MVP first; layer intelligence and “alive” behavior so millions can rely on it daily.
