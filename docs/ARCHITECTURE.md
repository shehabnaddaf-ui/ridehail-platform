# RideHail – System Architecture

## Overview

- **Rider App** (React Native/Expo): Book rides, track driver, pay, rate.
- **Driver App** (React Native/Expo): Go online, receive requests, navigate, complete trips, view earnings.
- **Admin Dashboard** (React/Vite): Manage drivers (approve/reject), view trips, configure fares and commission, view reports.
- **Backend** (Node.js/Express): REST API + Socket.io for real-time updates.

## Data flow

1. **Rider** logs in with phone + OTP, sees map, taps “Book a ride”, sets pickup/dropoff, gets fare estimate, requests ride.
2. **Backend** finds nearest online driver (matching by distance + rating), creates trip, assigns driver, emits over Socket.io to rider and driver.
3. **Driver** receives ride request (Socket.io), accepts (or is auto-assigned in current flow), updates status: arriving → start trip → complete trip. Location is sent periodically (HTTP or socket).
4. **Rider** sees driver location in real time (Socket.io), trip status, then receipt after completion.
5. **Payments**: Cash is recorded at trip completion; card uses Stripe PaymentIntent (client confirms, backend records).
6. **Commission**: On trip completion, platform percentage is computed; driver earnings go to wallet.

## Matching algorithm

- Query drivers: `status = approved`, `is_online = true`, bounding box around pickup.
- Filter by ride type (vehicle’s `ride_types` array).
- Sort by haversine distance to pickup; tie-break by driver rating.
- Assign first driver (or broadcast to several for accept/reject in a future version).

## Cancellation

- `cancellation_rules`: free cancel within X minutes, then fixed fee.
- Rider cancel: check elapsed time, set `cancel_fee`, set status to `cancelled`.

## Security

- JWT for user, driver, and admin (different `type` in payload).
- Role-based routes: `authUser`, `authDriver`, `authAdmin`.
- Stripe: use webhooks in production to confirm payments; do not trust client-only confirmation.

## Scaling notes

- **DB**: Connection pooling (pg), indexes on trips(rider_id, driver_id, status), drivers(status, is_online), location.
- **API**: Stateless; scale with multiple Node instances behind a load balancer.
- **Socket.io**: Use Redis adapter for multi-instance Socket.io.
- **Maps**: Prefer Google Directions/Distance Matrix for real distance/duration and routing when you add it.
