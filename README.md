# CTS — Chandigarh Tiffin Service

A full-stack platform for managing home-cooked meal delivery. Vendors list their kitchens and meals, customers browse and order, and admins manage everything through a role-based control panel.

**Stack:** FastAPI · PostgreSQL · SQLAlchemy · Alembic · React 19 · TypeScript · Vite · Zustand · Framer Motion

---

## Features

**Customer Experience**
- Browse kitchens, search meals, and filter by dietary preferences (Veg, Non-Veg, Egg).
- Flexible subscriptions (Continuous everyday deliveries) or one-time scheduled orders.
- Cart & Checkout flow with auto-calculating wallet deductions and COD options.
- Delivery history with meal ratings and order feedback.

**Vendor Management**
- Manage kitchen profile, operating hours, and delivery cut-off times.
- Full menu control: Add meals, set availability days, define service types (Breakfast, Lunch, Dinner).
- View and manage incoming orders in real-time.

**Admin & System**
- Role-based Access Control (RBAC) with granular permissions.
- Manage users, roles, and cities.
- Global dashboard with live platform statistics.

**Wallet & Billing**
- Built-in customer wallet system for seamless cashless daily billing.
- Strict cancellation policies with automatic COD revocation and negative balance enforcement.

**UI / UX**
- Premium Dark Mode Glassmorphism design system.
- Responsive layout with Framer Motion page transitions.
- Toast notifications and skeleton loaders for smooth UX.

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL running locally

### Database
Create the database and update `backend/alembic.ini`:
```sql
CREATE DATABASE food_db;
```
```ini
sqlalchemy.url = postgresql://postgres:yourpassword@localhost:5432/food_db
```

### Backend
```bash
cd backend
python -m venv venv
# Activate venv: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)

pip install -r requirements.txt
alembic upgrade head
python seed_address_permission.py

uvicorn app.main:app --reload --port 1415
```
API: `http://localhost:1415` · Docs: `http://localhost:1415/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App: `http://localhost:1515`

---

## Default Roles
| ID | Name        | Slug      |
|----|-------------|-----------|
| 1  | Super Admin | admin     |
| 2  | Customer    | customer  |
| 3  | Vendor      | vendor    |

Create a Super Admin user directly in the database or via the `/register` endpoint by forcing `role_id: 1`.

---

## Project Structure

```
/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── core/         # Security (JWT, hashing)
│   │   ├── db/           # DB session
│   │   ├── models/       # SQLAlchemy models
│   │   └── schemas/      # Pydantic schemas
│   └── alembic/          # Migrations
│
└── frontend/
    └── src/
        ├── api/          # Axios endpoints
        ├── components/   # Shared React components
        ├── pages/        # Route-level pages
        ├── store/        # Zustand state stores
        ├── hooks/        # Custom hooks
        └── styles/       # Per-component CSS
```
