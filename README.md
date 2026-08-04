# Expense Management System

A full-stack expense tracking application with secure, per-user authentication, a normalized relational database, and a REST API consumed by a React frontend. Built to go beyond a simple CRUD demo — includes connection pooling, JWT-based auth, and properly scoped multi-user data isolation.

**Live Demo:** [Add your deployed link here after deployment]
**Backend Repo/API Docs:** [Add your Railway/Render URL + `/docs` here]

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Key Engineering Decisions](#key-engineering-decisions)
- [Challenges & Fixes](#challenges--fixes)
- [Future Improvements](#future-improvements)

---

## Overview

The Expense Management System lets users sign up, log in, and privately track their daily expenses by category. Each user's data is fully isolated at the database level — no user can see or modify another user's expenses, enforced through JWT authentication and `user_id`-scoped queries on every request.

**Core features:**
- Secure signup/login with bcrypt password hashing and JWT-based sessions
- Add, update, and view expenses by date
- Category-wise analytics with percentage breakdown and visual charts
- Fully protected REST API — every data-access endpoint requires a valid token
- Per-user data isolation verified through multi-account testing

---

## Tech Stack

**Backend**
- **FastAPI** — Python web framework for the REST API
- **MySQL** — relational database (via `mysql-connector-python`)
- **Connection Pooling** — `mysql.connector.pooling` for efficient DB connection reuse
- **Passlib (bcrypt)** — password hashing
- **python-jose** — JWT creation and verification
- **Pydantic** — request/response schema validation
- **pytest** — backend testing

**Frontend**
- **React** (via Vite) — component-based UI
- **React Router** — client-side routing and protected routes
- **Axios** — API communication with interceptor-based auth token injection
- **Recharts** — analytics visualization

**Tooling**
- Python virtual environment (`venv`) for dependency isolation
- Git for version control
- `.env`-based configuration (never committed)

---

## Architecture

```
┌─────────────────┐         HTTPS/JSON         ┌──────────────────┐
│                  │  ────────────────────────▶ │                  │
│  React Frontend  │                             │  FastAPI Backend │
│  (Vite + Axios)  │  ◀──────────────────────── │   (REST API)     │
│                  │      JWT in headers         │                  │
└─────────────────┘                             └────────┬─────────┘
                                                            │
                                                  Pooled MySQL Connections
                                                            │
                                                            ▼
                                                  ┌──────────────────┐
                                                  │   MySQL Database │
                                                  │  users, expenses │
                                                  └──────────────────┘
```

**Request lifecycle for a protected route (e.g. fetching expenses):**
1. Frontend attaches JWT to the `Authorization: Bearer <token>` header (handled automatically via an Axios interceptor)
2. FastAPI's `get_current_user` dependency decodes and validates the token before the endpoint runs
3. If valid, the extracted `user_id` is passed into the query — every SQL query filters by `user_id` at the database level, not in application code after the fact
4. Response returns only that user's data

---

## Database Schema

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    expense_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    notes VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, expense_date)
);
```

**Design notes:**
- `FOREIGN KEY ... ON DELETE CASCADE` ensures referential integrity — deleting a user automatically removes their expenses, preventing orphaned rows.
- The composite index `idx_user_date (user_id, expense_date)` is built specifically around the app's real query pattern — every expense lookup filters by *this user* and *this date/range*, so a single composite index serves both the equality and range conditions efficiently, rather than maintaining two separate single-column indexes.
- Passwords are never stored in plain text — only bcrypt hashes.

---

## Authentication Flow

1. **Signup** (`POST /auth/signup`) — password is hashed with bcrypt before storage; duplicate emails are rejected.
2. **Login** (`POST /auth/login`) — credentials are verified against the stored hash; on success, a JWT is issued containing the user's `id` and `email`, signed with a secret key, expiring after 24 hours.
3. **Authenticated requests** — the frontend stores the JWT and attaches it to every subsequent request. The backend decodes and validates the token on each protected route via a FastAPI dependency (`Depends(get_current_user)`), rejecting invalid or expired tokens with `401 Unauthorized` before any database query runs.
4. **Frontend route protection** — a `ProtectedRoute` component redirects unauthenticated users to the login page for a clean UX. This is a usability layer only; the actual security boundary is enforced server-side.

---

## API Endpoints

| Method | Endpoint             | Auth Required | Description                                  |
|--------|-----------------------|----------------|-----------------------------------------------|
| POST   | `/auth/signup`         | No             | Create a new user account                     |
| POST   | `/auth/login`          | No             | Authenticate and receive a JWT                |
| GET    | `/expenses/{date}`     | Yes            | Fetch the logged-in user's expenses for a date|
| PUT    | `/expenses/{date}`     | Yes            | Replace the logged-in user's expenses for a date |
| POST   | `/analytics/`          | Yes            | Get category-wise expense breakdown for a date range |

Interactive API documentation (Swagger UI) is auto-generated by FastAPI and available at `/docs` when the backend is running.

---

## Project Structure

```
Expense-tracking/
├── backend/
│   ├── server.py           # FastAPI app, routes, auth dependency
│   ├── db_helper.py        # Pooled DB connections, all SQL queries
│   ├── auth.py             # Password hashing, JWT creation/verification
│   ├── logging_setup.py    # Centralized logger configuration
│   ├── requirements.txt
│   └── .env                # DB credentials, JWT secret (not committed)
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosInstance.js   # Axios instance with auth interceptors
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Global auth state (token, login, logout)
│   │   ├── components/
│   │   │   └── ProtectedRoute.jsx # Client-side route guarding
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Expenses.jsx
│   │   │   └── Analytics.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
└── tests/
    └── test_db_helper.py
```

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL Server running locally

### Backend

```bash
cd backend
python -m venv ../.venv
../.venv/Scripts/activate      # Windows
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=expense_manager
JWT_SECRET_KEY=your_generated_secret_key
```

Run the two `CREATE TABLE` statements from [Database Schema](#database-schema) in your MySQL client, then start the server:
```bash
uvicorn server:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```


---

## Key Engineering Decisions

- **Connection pooling over a single shared connection** — the original implementation opened one MySQL connection at import time and closed it after every query, which would fail under any concurrent load. Replaced with `mysql.connector.pooling.MySQLConnectionPool` so connections are borrowed and returned rather than destroyed, avoiding the overhead of a fresh TCP + auth handshake on every request.
- **`PUT` instead of `POST` for expense updates** — the endpoint replaces a day's expenses (delete-then-reinsert), which is idempotent. `PUT` is the semantically correct verb; `POST` is reserved for non-idempotent resource creation.
- **SQL-level filtering over application-level filtering** — every query scopes to `user_id` directly in the `WHERE` clause, so the database only ever returns rows belonging to the authenticated user, rather than fetching everything and filtering in Python.
- **Centralized Axios instance with interceptors** — rather than manually attaching the JWT and handling 401s in every component, a single Axios instance handles token injection and auto-logout-on-expiry globally.

---

## Challenges & Fixes

- **Connection lifecycle bug**: the original `get_db_cursor` context manager called `connection.close()` on the single global connection after every query, which would have broken multi-request usage. Diagnosed and fixed by switching to a proper connection pool.
- **bcrypt/passlib version incompatibility**: a newer `bcrypt` release changed its internal API in a way `passlib==1.7.4` didn't expect, causing hashing to fail during signup. Resolved by pinning `bcrypt==4.0.1`, a version compatible with the installed `passlib` release — a good example of a real dependency-compatibility issue diagnosed from a full stack trace rather than assumed from the surface error message.
- **CORS blocking cross-origin requests**: with the frontend (`localhost:5173`) and backend (`localhost:8000`) on different origins, the browser blocked requests by default. Fixed by explicitly configuring `CORSMiddleware` on the FastAPI app.
- **Multi-user data isolation verification**: rather than assuming `user_id` scoping worked, it was explicitly tested by creating two separate accounts and confirming expenses added under one account were completely invisible to the other.

---

## Future Improvements

- Refresh tokens (currently a single 24-hour access token; short-lived access + refresh tokens would be the production-grade approach)
- Pagination on the expenses endpoint for users with a large history
- Docker + docker-compose for consistent local and deployment environments
- Edit/delete individual expense entries (currently full-day replace only)
- Rate limiting on `/auth/login` to mitigate brute-force attempts
