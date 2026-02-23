# RideHail — UX Flow Diagrams (Text)

## Flow 1: Rider — First Open to Ride Request

```
[App Open]
    │
    ├─► [Splash / Brand] (~200ms)
    │
    ▼
[Live Map Screen]
    │
    ├─► GPS lock (instant visual: "You are here" pulse)
    ├─► Nearby drivers (subtle moving dots) — optional, reduces "will I get a ride?" anxiety
    │
    ▼
[Primary CTA: "Request Ride" or "Where to?"]
    │
    ├─► User taps "Where to?" or destination field
    ▼
[Destination Input]
    │
    ├─► Pickup: auto from GPS (smart pin: safest stopping point)
    ├─► Dropoff: type or map tap
    │
    ▼
[Fare & Ride Type]
    │
    ├─► Fare estimate (confident, e.g. "$12–14" or "From $12")
    ├─► Default ride type from history (or "Economy")
    ├─► Micro-copy: "Driver verified · Trip tracked · Support ready"
    │
    ▼
[Single primary button: "Request Ride"]
    │
    ├─► Tap
    ▼
[Feedback within ~300ms]
    │
    ├─► "Finding your driver..." (optional: show nearby cars moving)
    ├─► Then: "Driver matched" + driver card (name, photo, trust score, ETA)
    │
    ▼
[Waiting for driver]
    │
    ├─► Real-time driver movement on map
    ├─► Countdown / "~4 min away"
    ├─► Optional: "Share trip" (safety)
    │
    ▼
[Driver arriving]
    │
    ├─► "Driver is 1 min away"
    ├─► "Driver has arrived"
    │
    ▼
[Trip in progress]
    │
    ├─► Live route + driver position
    ├─► Subtle reassurance: "Trip tracked"
    ├─► One-tap emergency (always visible, low prominence)
    ├─► Route deviation detection (background; surface only if notable)
    │
    ▼
[Trip ended]
    │
    ├─► Receipt + "Rate your driver"
    ├─► Optional: "Share trip summary" (safety record)
```

---

## Flow 2: Rider — Safety Layer (Trip Sharing & Emergency)

```
[During trip]
    │
    ├─► [Share trip]
    │       │
    │       ├─► Tap "Share trip"
    │       ├─► Live link generated (view-only map + ETA)
    │       ├─► Share via SMS / WhatsApp / Copy link
    │       └─► Recipient sees: rider name, driver, route, ETA (no control)
    │
    └─► [Emergency]
            │
            ├─► Tap "Emergency" (one tap)
            ├─► Confirm (optional short confirmation to avoid misfires)
            ├─► Platform: alert support + optional authorities; share live location
            ├─► Rider: "Help is on the way" + optional call to support
            └─► Trip may be flagged for review
```

---

## Flow 3: Driver — Going Online to Completing a Trip

```
[Driver opens app]
    │
    ▼
[Map + Online toggle]
    │
    ├─► "Smart zones" (if available): "High demand in [Zone] for ~45 min"
    ├─► Toggle ON → start sending location; show "You’re online"
    │
    ▼
[Ride request received]
    │
    ├─► Preview: pickup, dropoff, estimated fare, ride type
    ├─► Accept / Decline (respect autonomy; no auto-assign in this flow)
    │
    ▼
[Accepted]
    │
    ├─► Navigation to pickup (turn-by-turn)
    ├─► "Rider: [Name]" + optional note
    ├─► Actions: "I’m arriving" → "Start trip" → "Complete trip"
    │
    ▼
[Trip in progress]
    │
    ├─► Navigation to dropoff
    ├─► Earnings for this trip (live) — motivational
    │
    ▼
[Trip completed]
    │
    ├─► "Trip complete" + earnings for trip
    ├─► Rate rider (short)
    ├─► Return to map; optional: "You’re $X away from your daily goal"
```

---

## Flow 4: Driver — Fatigue & Rest Suggestion

```
[Driver online for N hours or N trips]
    │
    ├─► Background: session length + trip count
    ▼
[Threshold reached]
    │
    ├─► Soft notification: "You’ve been on the road for X hours. Consider a short break."
    ├─► No penalty; dismissible
    ├─► Optional: "Take 15 min break" (marks break; no rides for 15 min)
    └─► If ignored and session very long: optional stronger nudge (policy-dependent)
```

---

## Flow 5: Admin — Live City & Emotional Indicators

```
[Admin dashboard — Live map]
    │
    ├─► Base layer: city map
    ├─► Overlay: active trips (dots or lines)
    ├─► Overlay: rider frustration zones (e.g. long wait, many cancels) — color or icon
    ├─► Overlay: driver stress zones (e.g. high density, low earnings) — color or icon
    │
    ▼
[Actions]
    │
    ├─► Surge: adjust multiplier or enable/disable by zone (with fairness rules)
    ├─► Dispatch: nudge drivers to high-demand zones (via in-app or push)
    ├─► Support: flag trip for review (e.g. dispute, emergency)
    └─► Reports: revenue, commission, fraud patterns
```

---

## Flow 6: Dispute Resolution (AI-Assisted)

```
[Dispute created — rider or driver]
    │
    ▼
[Admin queue]
    │
    ├─► AI suggestion: similar past cases + suggested outcome (e.g. "Refund 50%")
    ├─► Admin reviews: trip details, chat, ratings, route
    ├─► Admin decides: accept AI suggestion / override / escalate
    │
    ▼
[Outcome]
    │
    ├─► Notify parties
    ├─► Refund / credit / warning as needed
    └─► Log for model improvement
```

---

## Flow 7: Predictive Pickup (Scale-Up)

```
[Background: user history + time/location]
    │
    ├─► Pattern: e.g. "User A often goes from Home to Office at ~8am"
    ▼
[Trigger: user opens app at 7:55 near Home]
    │
    ├─► Subtle prompt: "Ride to Office? Leave in ~5 min."
    ├─► One tap → prefill destination; user taps "Request Ride"
    └─► Reduces steps and feels anticipatory
```

---

## Cross-Cutting: Graceful Failure

- **Network off**: Clear message "No connection. We’ll retry." + retry; don’t lose state.
- **GPS weak**: "Getting your location..." with fallback to manual pickup.
- **Payment failed**: "Update payment method" with clear next step; don’t block trip history.
- **Driver cancelled**: "Driver had to cancel. Finding another driver..." (or offer to re-request).

All flows assume **real-time updates** (WebSocket) so that status changes and location updates feel instant.
