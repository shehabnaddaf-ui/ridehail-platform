# Syria UX Flows — Psychological Explanation

## Design Principles in Every Flow

- **Reduce uncertainty** at each step (where, who, how much, when).
- **One primary action** per screen where possible.
- **Optimistic feedback** so the user sees progress even if the network is slow.
- **Offline-aware** so critical steps (accept, complete, cash) can be queued and synced later.
- **Local language and tone** (Arabic-first, reassuring, family-oriented).

---

## Flow 1: Rider — Open App to Request Ride

```
[App Open]
    │
    ├─► Low-bandwidth check (optional): reduce map tiles, disable animations
    ├─► Live map with "أنت هنا" (You are here) — instant orientation
    │
    ▼
[Where to? / Request Ride]
    │
    ├─► Pickup: auto from GPS + "اقتراحات آمنة" (Safe suggestions) — common/safe points
    ├─► Dropoff: type or tap map
    │
    ▼
[Price & Reassurance]
    │
    ├─► "السعر التقريبي: X ل.س" (Approx price) — clear, early
    ├─► "السعر ثابت عند التأكيد" (Price locked on confirm) when applicable
    ├─► Micro-copy: "سائق موثّق · الرحلة مراقبة · الدعم جاهز"
    │
    ▼
[Single button: "اطلب رحلة" (Request Ride)]
    │
    ├─► Tap → immediate visual: "جاري البحث عن سائق..." (Searching for driver)
    ├─► (Optimistic: show state even before API response)
    │
    ▼
[Driver matched]
    │
    ├─► Driver card: photo, name, vehicle photo, plate, trust badge "موثّق"
    ├─► "السائق في الطريق إليك" (Driver on the way to you)
    ├─► Map: driver moving toward pickup (real-time when online)
    ├─► Arrival: "سيصل خلال X دقائق" + "قريب منك" when close
    │
    ▼
[Trip in progress]
    │
    ├─► Route + driver position (cached if offline)
    ├─► "شارك الرحلة مع العائلة" (Share with family)
    ├─► Silent emergency (one tap, no obvious panic UI)
    ├─► Deviation alert if route diverges (subtle)
    │
    ▼
[Trip ended]
    │
    ├─► "أكد وصولك بأمان" (Confirm safe arrival) — rider taps to close loop
    ├─► Receipt: distance, time, amount (cash)
    ├─► Rate driver (short)
```

**Psychology**: Each step answers one question (Where? Who? How much? When? Safe?). Optimistic UI and offline tolerance prevent “is it broken?” anxiety. Safe arrival is an explicit ritual for rider and family.

---

## Flow 2: Family Ride Sharing & Safe Arrival

```
[Rider in trip]
    │
    ├─► "شارك الرحلة مع العائلة"
    ▼
[Share sheet]
    │
    ├─► Generate link (view-only: map, driver, ETA)
    ├─► Share via WhatsApp / SMS / copy
    ├─► Family opens link: sees live (or last-known) position, ETA
    │
    ▼
[Trip ends]
    │
    ├─► Rider sees: "هل وصلت بأمان؟ اضغط لتأكيد" (Did you arrive safely? Tap to confirm)
    ├─► Tap → "وصلت بأمان" (Arrived safely) sent to platform + optional notify family
    └─► If no confirm after N min: optional gentle reminder or family notification
```

**Psychology**: Family can watch without calling; rider confirms safety explicitly. Closes the loop and reduces family anxiety.

---

## Flow 3: Silent Emergency

```
[During trip]
    │
    ├─► Subtle control: e.g. long-press on "Share" or dedicated small button (no red panic screen)
    ▼
[One tap / long-press]
    │
    ├─► No visible change on rider screen (or minimal "تم الإبلاغ" in small text)
    ├─► Backend: alert platform/support; store location; optional notify family link
    ├─► Rider can continue trip; support may call or follow up
```

**Psychology**: Rider gets help without escalating tension in the car. Silent trigger respects high-stakes situations.

---

## Flow 4: Driver — Offline-Ready Accept & Cash

```
[Driver online]
    │
    ├─► App caches: zones, recent trips, today's earnings
    ▼
[Ride request received]
    │
    ├─► Push or in-app: pickup, dropoff, fare, estimated earnings
    ├─► "قبل الرحلة" (Accept) / "رفض" (Decline)
    ├─► If offline: accept stored locally; synced when connection returns
    │
    ▼
[Trip in progress]
    │
    ├─► Navigation (cached map tiles if needed)
    ├─► At end: "استلمت النقد؟ المبلغ: X" (Received cash? Amount: X)
    ├─► Driver confirms → reconciliation recorded (online or when back online)
    │
    ▼
[Daily reconciliation]
    │
    ├─► "مطابقة النقد اليوم" (Today's cash match): expected vs collected
    ├─► Shortfalls/surplus logged; platform can follow up manually if needed
```

**Psychology**: Driver never blocked by “no connection”; earnings are clear before accept; cash is tracked without surprise.

---

## Flow 5: Rider Trust Profile & Trusted Driver Badge

```
[Rider history]
    │
    ├─► Trust score: completion rate, no-shows, respect (from driver ratings)
    ├─► Shown to driver only as tier or badge (e.g. "راكب موثوق") when relevant
    │
    ▼
[Driver profile]
    │
    ├─► Trusted driver: documents verified + behavior + completion consistency
    ├─► Badge "موثّق" on driver card and in trip
    ├─► Optional: "معروف في منطقتك" (Known in your area) for neighborhood cluster
```

**Psychology**: Both sides have skin in the game; bad actors naturally get fewer matches. Trust is visible and local.

---

## Flow 6: Crisis Mode (Admin)

```
[Admin enables crisis for zone/city]
    │
    ├─► Risk zones: areas marked; optional "لا تتوجه هنا" (Don’t go here) or reduced service
    ├─► Riders: "ظروف استثنائية — ننصح بتأجيل الرحلة" (Exceptional conditions — consider postponing)
    ├─► Drivers: same zones; optional pause new rides in zone
    │
    ▼
[Recovery]
    │
    ├─► Admin lifts or softens crisis; app returns to normal messaging
```

**Psychology**: Platform shows it takes safety seriously; manual control keeps human judgment in the loop.

---

## Flow 7: Low-Bandwidth Mode

```
[App detects slow/unstable network]
    │
    ├─► Option: "وضع توفير البيانات" (Data saver) or auto light mode
    ├─► Fewer map tiles; no auto-play; smaller images (driver/vehicle thumb)
    ├─► Critical data (trip state, price, driver id) cached and retried
    │
    ▼
[Request / Accept / Complete]
    │
    ├─► Actions queued if offline; sync when connection returns
    ├─► "سيتم التحديث عند الاتصال" (Will update when connected) — no dead screen
```

**Psychology**: User stays in control; app doesn’t pretend to work when it can’t—clear, honest feedback.

---

## Cross-Cutting: Cash-First Payment

- **Before ride**: Price shown and locked (within policy).
- **After ride**: Rider pays driver cash; driver confirms amount in app.
- **Reconciliation**: Platform knows expected vs collected; disputes or follow-up use this.
- **Wallet (future)**: Balance for top-up, rewards, or local wallets—no change to cash flow at launch.

All flows assume **Arabic-first copy**, **one primary CTA** where possible, and **offline-tolerant** critical path (request, accept, complete, cash confirm).
