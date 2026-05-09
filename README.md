# CTS — Chandigarh Tiffin Service

A full-stack platform for managing home-cooked meal delivery. Vendors list their kitchens and meals, customers browse and order, and admins manage everything through a role-based control panel.

**Stack:** FastAPI · PostgreSQL · SQLAlchemy · Alembic · React 19 · TypeScript · Vite · Zustand · Framer Motion

---

## Goal

Build a complete tiffin/meal delivery platform with three distinct experiences:

- **Customer** — browse kitchens, search meals, place orders
- **Vendor** — manage kitchen, meals, and incoming orders
- **Admin** — manage users, roles, permissions, cities, and content

---

## What's Done

### Auth & Access
- [x] JWT-based login with role slug in token
- [x] Register with role validation (customer / vendor only)
- [x] Login blocked if user is blocked or role is disabled
- [x] Permission-based access control (slug-based, DB-driven)
- [x] Login lockout after 5 failed attempts (60s cooldown)
- [x] Change own password (with current password verification)

### Roles & Permissions
- [x] Full CRUD for roles
- [x] Assign / unassign permissions per role
- [x] System roles (admin, customer, vendor) protected from disable or slug change
- [x] Admin role permissions are view-only in UI

### User Management
- [x] List, view, and edit users
- [x] Block / unblock users
- [x] Role assignment from user detail page
- [x] Admin reset user password
- [x] Vendor kitchen details editable from user detail page

### Address Management
- [x] Add, edit, delete addresses per user
- [x] Fields: city, house no., pincode, address text, exact location (maps URL), house photo
- [x] Address ownership enforced (admin can manage any)

### City Management
- [x] Add, edit, toggle active/inactive cities
- [x] Inactive cities hidden from dropdowns

### Vendor & Kitchen
- [x] Vendor profile auto-created on registration
- [x] Kitchen name, open/close times, open status
- [x] Public vendor listing endpoint

### Meals / Menu
- [x] Meals scoped to a vendor (accessed via `/admin/users/:id/meals`)
- [x] Add, edit meals with image upload
- [x] Schedule: daily or specific days of the week
- [x] Active / inactive status per meal
- [x] Public menu endpoint (`GET /menu`) with optional vendor filter
- [x] Public search endpoint (meal name + kitchen name)

### Dashboards
- [x] Role-aware home page (admin / vendor / customer)
- [x] Admin: stat cards (users, cities, roles, meals)
- [x] Vendor: stat cards + recent orders (demo data)
- [x] Customer: hero search, category circles, today's specials, kitchens near you
- [x] Customer search: DB-backed, debounced, ≥ 2 chars, clears on X

### Profile Page
- [x] Self-update name and phone
- [x] Change own password
- [x] Vendor: update kitchen details from profile
- [x] Address management from profile (customer / vendor)

### UI / UX
- [x] Glassmorphism design system
- [x] Floating nav (admin / vendor only — hidden for customer and guests)
- [x] Responsive: desktop, tablet, mobile (320px tested)
- [x] Toast notifications for all actions
- [x] Skeleton loaders on data-heavy sections
- [x] Animated page transitions (Framer Motion)

---

## Pending

### Orders
- [ ] Place order (customer)
- [ ] Order management (vendor — accept, prepare, deliver)
- [ ] Order history (customer)
- [ ] Admin order overview

### Customer Experience
- [ ] Category filtering (requires `category` field on meals)
- [ ] Vendor detail page with full menu
- [ ] Cart and checkout flow
- [ ] Order tracking

### Vendor Dashboard
- [ ] Live order stats from DB (currently demo data)
- [ ] Revenue and customer analytics

### Admin Dashboard
- [ ] Live stat cards from DB (currently static numbers)

### Misc
- [ ] Email / SMS notifications
- [ ] Image CDN (currently stored on local disk)
- [ ] Pagination on large lists

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL running locally

---

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac / Linux

# Install dependencies
pip install -r requirements.txt
```

Create the database in PostgreSQL:

```sql
CREATE DATABASE food_db;
```

Update the connection string in `backend/alembic.ini`:

```ini
sqlalchemy.url = postgresql://postgres:yourpassword@localhost:5432/food_db
```

Also update `backend/app/db/session.py` if it has a hardcoded URL.

Run migrations:

```bash
alembic upgrade head
```

Seed permissions and assign to Super Admin:

```bash
python seed_address_permission.py
```

Start the server:

```bash
uvicorn app.main:app --reload --port 1415
```

API: `http://localhost:1415` · Docs: `http://localhost:1415/docs`

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:1515`

> The frontend expects the backend at `http://localhost:1415/api/v1`. Change `baseURL` in `src/api/axios.ts` if your ports differ.

---

### Default Roles (seeded via DB or manually)

| ID | Name        | Slug      |
|----|-------------|-----------|
| 1  | Super Admin | admin     |
| 2  | Customer    | customer  |
| 3  | Vendor      | vendor    |

Create a Super Admin user directly in the database or via the `/register` endpoint with `role_id: 1` (bypasses the public role restriction since it's a direct DB insert).

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
│   ├── alembic/          # Migrations
│   └── seed_address_permission.py
│
└── frontend/
    └── src/
        ├── api/          # Axios calls
        ├── components/   # Shared + dashboard components
        ├── pages/        # Route-level pages
        ├── store/        # Zustand state (auth, toast)
        ├── hooks/        # usePermissions
        └── styles/       # Per-component CSS
```
