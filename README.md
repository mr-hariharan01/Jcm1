# Jegan Cable Mangadu Broadband Management System

Production-ready full-stack version with separate frontend and backend.

## Project Structure

```text
/frontend
  index.html
  style.css
  app.js
/backend
  server.js
  routes/
    auth.js
    customer.js
    admin.js
    payment.js
  models/
    User.js
    Customer.js
    Payment.js
    Plan.js
    Ticket.js
  middleware/
    auth.js
.env.example
package.json
```

## Setup

1. Copy environment template:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start server:
   ```bash
   npm start
   ```
4. Open in browser:
   - `http://localhost:5000`

## MongoDB Connection Guide

- Install MongoDB locally or use MongoDB Atlas.
- Update `MONGODB_URI` in `.env`.
  - Local example: `mongodb://127.0.0.1:27017/jegan_cable`
  - Atlas example: `mongodb+srv://<user>:<pass>@cluster.mongodb.net/jegan_cable`
- On startup, server connects using Mongoose and seeds an admin account from `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) if it does not already exist.

## API Endpoints

### Auth
- `POST /api/auth/login`

### Customer
- `GET /api/customer/profile`
- `GET /api/customer/payments`
- `POST /api/payment`

### Admin
- `GET /api/admin/customers`
- `POST /api/admin/customer`
- `PUT /api/admin/customer/:id`
- `DELETE /api/admin/customer/:id`
- `GET /api/admin/payments`

### Payments
- `PUT /api/payment/approve/:id`

## Security

- Password hashing with `bcryptjs`
- JWT auth with role-based middleware
- Protected admin/customer routes
- Request validation for required fields and identifier formats
