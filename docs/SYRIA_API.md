# Syria-First API Design

## Conventions

- **Auth**: `Authorization: Bearer <JWT>`. Phone-based login for rider/driver.
- **Locale**: `Accept-Language: ar` or `en`; responses can include `message_ar` / `message_en` where needed.
- **Idempotency**: For accept/complete, client sends `Idempotency-Key: <uuid>` so retries don’t double-apply.
- **Offline**: Client may send queued actions with `X-Offline-Queued: true` and server timestamp; server applies and returns current state.

---

## New / Extended Endpoints (Syria)

### Safe Pickup Points
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | /api/pickup-points | Rider | List safe pickup suggestions near lat/lng (or neighborhood) |

### Trust
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | /api/trust/driver/:id | Rider | Driver trust score + trusted badge + neighborhood |
| GET | /api/trust/rider/me | Rider | Current rider trust profile (for display) |

### Safe Arrival
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | /api/trips/:id/safe-arrival | Rider | Confirm safe arrival (sets safe_arrival_confirmed_at) |

### Cash Reconciliation
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | /api/trips/:id/cash-received | Driver | Confirm cash received (amount, optional notes) |
| GET | /api/drivers/cash-summary | Driver | Today’s expected vs collected cash |
| GET | /api/admin/cash-reconciliation | Admin | List by driver/date for manual follow-up |

### Ride for Family
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | /api/trips | Rider | Optional: booked_by_user_id, rider_phone, rider_name_for_display |

### Crisis & Risk Zones
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | /api/crisis/active | Public/Rider/Driver | Active crisis events and messages |
| GET | /api/risk-zones | Public/Rider/Driver | Active risk zones (for map and matching) |
| GET | /api/admin/crisis | Admin | List/create/update crisis events |
| GET | /api/admin/risk-zones | Admin | CRUD risk zones |

### Neighborhoods & Trust Clusters
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | /api/neighborhoods | Rider/Driver | List neighborhoods (for pickup suggestions, “known in your area”) |

### Driver Daily Minimum
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | /api/drivers/daily-guarantee | Driver | Today’s trips, earnings, minimum guarantee, top-up if any |

### Locale / Copy
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | /api/locale | Public | Key-value copy (ar/en) for app strings |

---

## Socket Events (Unchanged + Additions)

- **To rider**: `trip_matched`, `driver_location`, `trip_status`, `trip_completed`, `safety_alert`, `emergency_ack`, `crisis_alert` (new).
- **To driver**: `ride_request`, `trip_cancelled`, `zone_update`, `crisis_alert` (new).
- **To admin**: `emergency_alert`, `silent_emergency_alert` (new).

---

## Response Shape (Syria Extensions)

- **Trip**: Include `fare_locked`, `safe_arrival_confirmed_at`, `driver.is_trusted_driver`, `driver.neighborhood_name`, `booked_by_user_id`, `rider_name_for_display` when applicable.
- **Driver card**: Include `trust_score`, `is_trusted_driver`, `vehicle_photo_url`, `neighborhood_name` (for “معروف في منطقتك”).
- **Crisis**: `{ active: true, message_ar, message_en, rider_advice_ar, allow_new_rides }`.
- **Risk zone**: `{ id, name_ar, center, radius_km, risk_level, reason }`.
