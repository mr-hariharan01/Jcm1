# Jegan Cable Mangadu Broadband Management System

This is a refactored full-stack architecture of the original single-file system.

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
    ticket.js
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

## How to run backend

1. Copy environment variables:
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
4. Open app:
   - `http://localhost:5000`

## MongoDB connection guide

Set `MONGODB_URI` in `.env`:

- Local MongoDB:
  - `mongodb://127.0.0.1:27017/jegan_cable`
- MongoDB Atlas:
  - `mongodb+srv://<user>:<password>@<cluster>/jegan_cable`

On boot, the backend uses `mongoose.connect(MONGODB_URI)` and seeds the admin user from `ADMIN_EMAIL` and `ADMIN_PASSWORD` (if missing).

## How frontend connects to API

`frontend/app.js` calls backend endpoints using `fetch` with base path `/api`.

- Auth token is stored in `localStorage`.
- Each protected request sends `Authorization: Bearer <token>`.
- Loading state and toast errors are shown for every API request.

## API Endpoints

### Auth
- `POST /api/auth/login`

### Customer
- `GET /api/customer/:id`
- `GET /api/customer/payments`

### Payments
- `POST /api/payment`
- `PUT /api/payment/approve/:id`

### Admin
- `GET /api/admin/customers`
- `POST /api/admin/customer`
- `DELETE /api/admin/customer/:id`
- `GET /api/admin/payments`
- `GET /api/admin/tickets`

### Tickets
- `POST /api/ticket`
- `GET /api/ticket/my`
- `PUT /api/ticket/reply/:id`

## Notes

- Due date logic: `lastRechargeDate + 28 days`
- Expired status is derived from due date and shown in both dashboards
- Payment approval updates `lastRechargeDate` and sets customer status to active
- Hold-to-connect interaction, charts, notifications, and ticket lifecycle are preserved in the refactored frontend
