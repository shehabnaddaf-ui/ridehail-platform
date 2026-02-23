# RideHail API Documentation

## Base URL
```
http://localhost:4000/api
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Token Types
- **User Token**: For rider endpoints (expires in 7 days)
- **Driver Token**: For driver endpoints (expires in 7 days)
- **Admin Token**: For admin endpoints (expires in 24 hours)

---

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **OTP**: 3 requests per hour per IP

---

## Pagination

List endpoints support pagination with query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Response format:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error
- `503`: Service Unavailable

---

## Endpoints

### Authentication

#### Send OTP
```http
POST /api/auth/otp/send
```

Request:
```json
{
  "phone": "+1234567890"
}
```

Response:
```json
{
  "success": true,
  "message": "OTP sent",
  "expiresIn": 600
}
```

#### Verify OTP
```http
POST /api/auth/otp/verify
```

Request:
```json
{
  "phone": "+1234567890",
  "code": "123456"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "phone": "+1234567890",
    "full_name": "User 7890",
    "email": null,
    "role": "rider"
  }
}
```

#### Admin Login
```http
POST /api/auth/admin/login
```

Request:
```json
{
  "email": "admin@ridehail.com",
  "password": "SecurePassword123!"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "uuid",
    "email": "admin@ridehail.com",
    "full_name": "Admin"
  }
}
```

---

### Trips

#### Estimate Fare
```http
POST /api/trips/estimate
Authorization: Bearer <user_token>
```

Request:
```json
{
  "pickup_lat": 33.5138,
  "pickup_lng": 36.2765,
  "dropoff_lat": 33.5200,
  "dropoff_lng": 36.2900,
  "ride_type": "economy"
}
```

Response:
```json
{
  "success": true,
  "estimate": {
    "distance_km": 2.5,
    "duration_min": 8,
    "fare": 15000,
    "ride_type": "economy"
  }
}
```

#### Request Ride
```http
POST /api/trips
Authorization: Bearer <user_token>
```

Request:
```json
{
  "pickup_lat": 33.5138,
  "pickup_lng": 36.2765,
  "dropoff_lat": 33.5200,
  "dropoff_lng": 36.2900,
  "pickup_address": "Damascus, Syria",
  "dropoff_address": "Mezzeh, Damascus",
  "ride_type": "economy",
  "payment_method": "cash"
}
```

Response:
```json
{
  "success": true,
  "trip": {
    "id": "uuid",
    "rider_id": "uuid",
    "driver_id": "uuid",
    "status": "accepted",
    "estimated_fare": 15000,
    "driver_name": "John Doe",
    "driver_rating": 4.8,
    ...
  }
}
```

#### Get My Trips
```http
GET /api/trips?page=1&limit=20&status=completed
Authorization: Bearer <user_token>
```

Response:
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

#### Cancel Trip
```http
POST /api/trips/:id/cancel
Authorization: Bearer <user_token>
```

Request:
```json
{
  "reason": "Changed my mind"
}
```

Response:
```json
{
  "success": true,
  "cancel_fee": 5000
}
```

---

### VIP System

#### Get VIP Status
```http
GET /api/vip/status
Authorization: Bearer <user_token>
```

Response:
```json
{
  "success": true,
  "vip": {
    "vip_status": true,
    "vip_since": "2024-01-01T00:00:00Z",
    "vip_level": 15,
    "auto_activated": true,
    "trips_until_next_reward": 2,
    "total_rewards": 3
  }
}
```

#### Get Rewards
```http
GET /api/vip/rewards
Authorization: Bearer <user_token>
```

Response:
```json
{
  "success": true,
  "rewards": [
    {
      "id": "uuid",
      "reward_type": "discount",
      "reward_value": 3000,
      "description": "20% discount reward",
      "given_at": "2024-01-15T00:00:00Z",
      "used_at": null
    }
  ]
}
```

---

### Admin

#### Get Drivers
```http
GET /api/admin/drivers?page=1&limit=20&status=approved
Authorization: Bearer <admin_token>
```

#### Approve Driver
```http
PATCH /api/admin/drivers/:id/approve
Authorization: Bearer <admin_token>
```

#### Get Reports Summary
```http
GET /api/admin/reports/summary
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "success": true,
  "summary": {
    "total_rides": 1500,
    "total_revenue": 22500000,
    "total_commission": 4500000,
    "active_drivers": 45
  }
}
```

---

## WebSocket Events

Connect to Socket.io at `http://localhost:4000` with authentication:
```javascript
const socket = io('http://localhost:4000', {
  auth: { token: 'your-jwt-token' }
});
```

### Events

#### Driver → Server
- `driver_location`: Send location updates
  ```json
  { "lat": 33.5138, "lng": 36.2765 }
  ```

#### Server → Rider
- `trip_matched`: Trip assigned to driver
- `driver_location`: Driver location update
- `trip_status`: Trip status changed
- `trip_completed`: Trip finished
- `vip_reward_unlocked`: VIP reward earned

#### Server → Driver
- `ride_request`: New ride request
- `trip_cancelled`: Trip cancelled by rider

---

## Best Practices

1. **Always validate input** on the client side before sending requests
2. **Handle rate limiting** with exponential backoff
3. **Store tokens securely** (never in localStorage for sensitive apps)
4. **Implement retry logic** for network failures
5. **Use pagination** for list endpoints
6. **Subscribe to WebSocket events** for real-time updates
7. **Handle token expiration** gracefully

---

## Security

- All passwords must meet strength requirements (8+ chars, uppercase, lowercase, number, special char)
- OTP codes expire after 10 minutes
- Rate limiting prevents brute force attacks
- All inputs are sanitized to prevent XSS and injection attacks
- HTTPS required in production
- JWT tokens should be stored securely

---

## Support

For issues or questions:
- GitHub: [repository-url]
- Email: support@ridehail.com
- Documentation: [docs-url]
