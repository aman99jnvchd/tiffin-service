# Tiffin Service Management System

A full-stack application for managing tiffin delivery services, including Role-Based Access Control (RBAC), Order Management, and City/Vendor management.

## 🏗 Project Structure
- **backend/**: FastAPI (Python) with SQLAlchemy & Alembic
- **frontend/**: React.js with Framer Motion & Glassmorphism UI

---

## 🚀 Setup Guide (For New PC)

Follow these steps to set up the project from scratch on a new machine.

### Prerequisites
1. **Python 3.10+** installed.
2. **Node.js 18+** installed.
3. **PostgreSQL** installed and running.

---

### 🛠 Backend Setup

1. **Navigate to the backend folder:**
   ```bash
   cd backend
```


2. **Create and Activate Virtual Environment:**

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

3. **Install Dependencies:**

```bash
pip install -r requirements.txt
```

4. **Environment Configuration: Create a `.env` file in the `backend/` folder and add your local DB credentials:**

```ini
DATABASE_URL=postgresql://postgres:password@localhost:5432/tiffin_db
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

5. **Database Setup:**

Open your Postgres terminal (pgAdmin or command line) and create the database:

```SQL
CREATE DATABASE tiffin_db;
```

Run Migrations to create tables:

```bash
alembic upgrade head
```

(Optional) Seed Initial Roles/Permissions:

```bash
python init_permissions.py
```

6. **Run the Server:**

```bash
uvicorn app.main:app --reload
```

API will be running at: http://localhost:8000 Docs available at: http://localhost:8000/docs

### 🎨 Frontend Setup

1. **Navigate to the frontend folder:**

```bash
cd ../frontend
```

2. **Install Dependencies:**

```bash
npm install
```

3. **Run the React App:**

```bash
npm start
```

App will be running at: http://localhost:3000

### 🔑 Default Credentials (If Seeded)

Super Admin: admin / (See database for password if manually hashed)

Role Slugs: admin, customer, vendor
