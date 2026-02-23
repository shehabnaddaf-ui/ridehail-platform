# RideHail — API Structure (Next-Gen)

## Overview

- **REST**: Auth, CRUD, idempotent operations. JSON. Version prefix optional (e.g. `/api/v1/`).
- **Real-time**: Socket.io namespaces/channels; see BACKEND_ARCHITECTURE.
- **Auth**: `Authorization: Bearer <JWT>`. JWT payload includes `type` (user | driver | admin) and id.

---

## REST Endpoints (Grouped by Domain)

### Auth
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | /api/auth/otp/send | Public | Send OTP to phone (rider) |
| POST | /api/auth/otp/verify | Public | Verify OTP; return JWT + user |
| POST | /api/auth/driver/register | Public | Driver signup (documents, vehicle) |
| POST | /api/auth/driver/login | Public | Driver login (phone + OTP or password) |
| POST | /api/auth/admin/login | Public | Admin login (email + password) |

### Users (Rider)
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | /api/users/me | Rider | Current user profile |
| PATCH | /api/users/me | Rider | Update profile |
| GET | /api/users/me/preferences | Rider | Ride type default, notifications |
| PATCH | /api/users/me/preferences | Rider | Update preferences (default ride type, etc.) |

### Drivers
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | /api/drivers/me | Driver | Profile, vehicle, wallet summary |
| PATCH | /api/drivers/me | Driver | Update profile |
| POST | /api/drivers/location | Driver | Report lat/lng (or via socket) |
| PATCH | /api/drivers/online | Driver | Set is_online |
| GET | /api/drivers/wallet | Driver | Balance, recent earnings |
| GET | /api/drivers/zones | Driver | Smart zones (high demand areas) |
| GET | /api/drivers/fatigue | Driver | Current session; rest suggestion if any |

### Trips
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | /api/trips/estimate | Rider | Fare estimate (pickup, dropoff, ride_type) |
| POST | /api/trips | Rider | Create ride request |
| GET | /api/trips | Rider | My trips (list) |
| GET | /api/trips/:id | Rider/Driver | Trip detail |
| POST | /api/trips/:id/cancel | Rider | Cancel (with reason); apply cancel rules |
| GET | /api/trips/driver/list | Driver | Driver’s trips |
| PATCH | /api/trips/:id/status | Driver | driver_arriving | in_progress | completed |

### Safety
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | /api/safety/share | Rider | Create trip share link; return URL |
| POST | /api/safety/emergency | Rider | One-tap emergency; alert platform/support |
| GET | /api/safety/trip/:tripId/share-status | Rider | Whether trip is shared, link expiry |

### Trust & Ratings
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | /api/trust/driver/:driverId | Rider | Driver trust score breakdown (driving, cancel, feedback) |
| POST | /api/ratings | Rider | Rate driver after trip |
| POST | /api/ratings/driver | Driver | Rate rider after trip |

### Payments
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | /api/payments/create-intent | Rider | Stripe PaymentIntent for trip |
| POST | /api/payments/confirm | Rider | Confirm payment (or webhook) |
| GET | /api/payments/receipt/:tripId | Rider | Trip receipt |

### Fare & Surge
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | /api/fare/config | Public | Fare config by ride type |
| GET | /api/fare/surge | Public/Rider | Current surge multiplier for area (optional) |

### Promotions
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | /api/promotions/validate | Rider | Validate promo code; return discount |

### Admin
| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | /api/admin/seed | Public | Create first admin (once) |
| GET | /api/admin/drivers | Admin | List drivers (filter status) |
| PATCH | /api/admin/drivers/:id/approve | Admin | Approve driver |
| PATCH | /api/admin/drivers/:id/reject | Admin | Reject driver |
| GET | /api/admin/trips | Admin | List trips |
| GET | /api/admin/reports/summary | Admin | Rides, revenue, commission, active drivers |
| GET | /api/admin/reports/live-map | Admin | Geo aggregation for live map (frustration/stress zones) |
| GET | /api/admin/fare | Admin | Fare config |
| PATCH | /api/admin/fare/:rideType | Admin | Update fare config |
| GET | /api/admin/commission | Admin | Commission config |
| PATCH | /api/admin/commission | Admin | Update commission % |
| GET | /api/admin/disputes | Admin | Dispute queue |
| GET | /api/admin/disputes/:id | Admin | Dispute detail + AI suggestion |
| PATCH | /api/admin/disputes/:id/resolve | Admin | Resolve dispute |
| GET | /api/admin/fraud/signals | Admin | Recent fraud signals |

---

## Socket.io Events

### Client → Server
- `driver_location` — { lat, lng } (driver)
- (Future) `typing` for in-trip chat

### Server → Client
- `trip_matched` — trip object (rider)
- `driver_location` — { lat, lng } (rider, during trip)
- `trip_status` — { tripId, status } (rider)
- `trip_completed` — { tripId, fare_amount } (rider)
- `ride_request` — trip object (driver)
- `trip_cancelled` — { tripId } (driver)
- `zone_update` — list of smart zones (driver)
- `safety_alert` — e.g. route deviation (rider)
- `emergency_ack` — after emergency tap (rider)

---

## Response Conventions

- **Success**: `{ success: true, ...data }`
- **Error**: `{ success: false, error: "message" }` with HTTP 4xx/5xx
- **Validation**: `{ success: false, errors: [{ path, message }] }` (e.g. 400)
