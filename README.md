# 🚗 RideHail Platform

A complete ride-hailing platform with backend API and admin dashboard.

## 🌟 Features

- **Backend API**: RESTful API built with Node.js and Express
- **Admin Dashboard**: React-based dashboard for managing users, drivers, and trips
- **PostgreSQL Database**: Robust data storage
- **Authentication**: JWT-based authentication
- **Real-time Updates**: Auto-refresh status detection

## 📦 Project Structure

```
ridehail-platform/
├── backend/              # Backend API (Node.js + Express)
├── admin-dashboard/      # Admin Dashboard (React + Vite)
├── database/            # Database schema and migrations
└── docs/                # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/ridehail-platform.git
cd ridehail-platform
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install admin dashboard dependencies:
```bash
cd admin-dashboard
npm install
```

4. Set up environment variables:
```bash
# backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/ridehail
JWT_SECRET=your-secret-key
PORT=4000

# admin-dashboard/.env
VITE_API_URL=http://localhost:4000
```

5. Run database migrations:
```bash
psql -U postgres -d ridehail -f database/schema.sql
```

6. Start the backend:
```bash
cd backend
npm start
```

7. Start the admin dashboard:
```bash
cd admin-dashboard
npm run dev
```

## 🌐 Deployment

### Deploy to Vercel

1. **Backend**:
   - Connect your GitHub repository
   - Set root directory to `backend`
   - Add environment variables
   - Deploy

2. **Admin Dashboard**:
   - Connect your GitHub repository
   - Set root directory to `admin-dashboard`
   - Add `VITE_API_URL` environment variable
   - Deploy

See [دليل_الرفع_على_GitHub_و_Vercel.md](./دليل_الرفع_على_GitHub_و_Vercel.md) for detailed instructions.

## 📚 Documentation

- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Deployment Guide](./دليل_الرفع_على_GitHub_و_Vercel.md)

## 🔐 Default Credentials

```
Email: admin@ridehail.com
Password: admin123
```

**⚠️ Change these credentials in production!**

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, PostgreSQL
- **Admin Dashboard**: React, Vite, TailwindCSS
- **Authentication**: JWT
- **Deployment**: Vercel

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support, email support@ridehail.com or open an issue on GitHub.

---

Made with ❤️ for the ride-hailing community
