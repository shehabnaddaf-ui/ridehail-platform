# RideHail – Deployment Steps

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- (Optional) Twilio, Stripe, Firebase for production

## 1. Database

```bash
createdb ridehail
psql -d ridehail -f database/schema.sql
```

Ensure `DATABASE_URL` is set (e.g. `postgresql://user:pass@host:5432/ridehail`).

## 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, CORS_ORIGIN, STRIPE_*, TWILIO_* (optional)
npm install
npm run dev
```

Create first admin (once):

```bash
curl -X POST http://localhost:4000/api/admin/seed \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ridehail.com","password":"Admin123!"}'
```

Then log in at Admin Dashboard with that email/password.

## 3. Rider App (Expo)

```bash
cd rider-app
npm install
# Set EXPO_PUBLIC_API_URL to your API URL (e.g. https://api.yourapp.com)
npx expo start
```

For Android emulator use `http://10.0.2.2:4000`; for iOS simulator `http://localhost:4000`. Production: set `EXPO_PUBLIC_API_URL` to your deployed API.

Build for stores: `eas build` (Expo Application Services) or eject and use native toolchains.

## 4. Driver App (Expo)

```bash
cd driver-app
npm install
# Set EXPO_PUBLIC_API_URL
npx expo start
```

Same as rider app for local/production URLs and builds.

## 5. Admin Dashboard (React/Vite)

```bash
cd admin-dashboard
npm install
# Create .env with VITE_API_URL=http://localhost:4000 (or production API)
npm run dev
```

Production build:

```bash
npm run build
# Serve the dist/ folder with nginx, S3+CloudFront, or any static host
```

## 6. Environment variables summary

| Variable | Where | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `JWT_SECRET` | Backend | Secret for JWT signing |
| `CORS_ORIGIN` | Backend | Allowed origins (e.g. https://admin.yourapp.com) |
| `STRIPE_SECRET_KEY` | Backend | Stripe API key |
| `EXPO_PUBLIC_API_URL` | Rider/Driver apps | Backend API base URL |
| `VITE_API_URL` | Admin dashboard | Backend API base URL |

## 7. Production (e.g. AWS)

- **Backend**: Run on EC2, ECS, or Lambda + API Gateway; put behind ALB with HTTPS.
- **Database**: RDS PostgreSQL; restrict access to backend only.
- **Static (Admin)**: S3 + CloudFront or Amplify.
- **Mobile**: Build with EAS and submit to App Store / Play Store; point `EXPO_PUBLIC_API_URL` to production API.
- **WebSockets**: Ensure ALB supports WebSockets (default) or use API Gateway WebSocket API if you switch.
