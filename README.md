# CleanRun IMMS

**Instrument Management & Maintenance System** — A full-stack web application for laboratories to manage instruments, maintenance, calibration, AMC contracts, inventory, and compliance reporting.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI · SQLAlchemy · PostgreSQL · JWT Auth |
| Frontend | React 18 · Vite · shadcn/ui · TanStack Query · Zustand · Zod |
| Styling | Tailwind CSS · CSS custom properties (dark/light theme) |
| PWA | vite-plugin-pwa · Workbox |

---

## Features

### Instrument Management
- Full CRUD with status tracking (Operational / Calibrating / Broken Down / Scheduled / Out of Service)
- QR code generation and SVG download per instrument
- Excel import / export
- Equipment code auto-generation
- Per-instrument history tabs (tickets, calibration, AMC)

### Maintenance
- **Breakdown Tickets** — report, assign to technician, track resolution, auto MTTR calculation
- **AMC Contracts** — comprehensive/non-comprehensive, expiry tracking, vendor email notification on breakdown
- **Calibration Records** — date tracking, next-due alerts, pass/fail status
- **Service Logs** — full maintenance log with labour cost, parts cost, parts used

### Inventory
- Spare parts with minimum stock levels
- Stock transactions (in / out / adjust)
- Low-stock alerts on dashboard

### Vendors
- Full CRUD with contact details
- Linked to instruments via AMC contracts

### Reports (manager only)
- MTTR (Mean Time To Repair) per instrument
- Downtime cost analysis
- Audit readiness report
- PDF export for calibration, AMC, vendors, monthly service, audit

### Dashboard
- Live instrument status counts (with role-aware panels)
- Low-stock alerts, calibration due alerts, open tickets
- Maintenance calendar
- Notification bell with real-time alerts

### Admin
- User management with role-based access (Manager / Technician / Employee)
- Granular permissions per user
- Full audit log with search and filter
- Company settings, branding, custom dropdown options, PDF templates

---

## Project Structure

```
CleanRun/
├── app/                        # FastAPI backend
│   ├── main.py                 # App entry point, CORS, router registration
│   ├── models.py               # SQLAlchemy ORM models
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── auth.py                 # JWT utilities
│   ├── audit.py                # Audit logging helper
│   ├── deps.py                 # FastAPI dependencies (auth, db)
│   ├── database.py             # DB engine + session
│   ├── tasks.py                # Celery async tasks (AMC/calibration alerts)
│   └── routers/
│       ├── auth.py             # Login, me, password, avatar, logout
│       ├── users.py            # User CRUD, permissions, audit log
│       ├── instruments.py      # Instrument CRUD, import/export, QR
│       ├── maintenance.py      # Tickets, AMC, calibration, service logs
│       ├── inventory.py        # Parts, stock transactions
│       ├── vendors.py          # Vendor CRUD
│       ├── reports.py          # MTTR, downtime, audit, dashboard, calendar
│       ├── pdf_reports.py      # PDF generation endpoints
│       └── settings_router.py  # Company settings, logo, options, PDF templates
│
├── frontend/
│   ├── src/
│   │   ├── api/axios.js        # Axios instance with JWT + auto token refresh
│   │   ├── store/authStore.js  # Zustand auth store
│   │   ├── hooks/queries.js    # All TanStack Query hooks
│   │   ├── context/            # Auth, Theme, Settings contexts
│   │   ├── components/         # Layout, Sidebar, NotificationBell, etc.
│   │   ├── components/ui/      # shadcn/ui components
│   │   └── pages/              # All page components
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── .env.example                # Environment variable template
└── requirements.txt            # Python dependencies
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL

### 1. Backend

```bash
# Clone and enter project
git clone https://github.com/devprav04/Clearrun.git
cd Clearrun

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY

# Run migrations (creates all tables)
python -c "from app.database import Base, engine; from app import models; Base.metadata.create_all(engine)"

# Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at **http://localhost:8000**  
API docs at **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at **http://localhost:5173**

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django-style secret key for JWT signing |
| `DATABASE_URL` | PostgreSQL connection string |
| `ACCESS_TOKEN_EXPIRE_HOURS` | Access token TTL (default: 8) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL (default: 7) |
| `EMAIL_HOST` | SMTP host for vendor notifications |
| `EMAIL_HOST_USER` | SMTP username |
| `EMAIL_HOST_PASSWORD` | SMTP password |
| `DEFAULT_FROM_EMAIL` | Sender address for emails |

---

## User Roles

| Role | Access |
|---|---|
| **Manager** | Full access — all pages, user management, reports, settings, audit log |
| **Technician** | Dashboard (own tickets), instruments, maintenance, inventory |
| **Employee** | Dashboard, instruments (read), inventory (read) |

---

## API Reference

Full interactive docs available at `/docs` (Swagger UI) when the backend is running.

Key endpoint groups:

| Prefix | Description |
|---|---|
| `/api/auth/` | Login, token refresh, profile, password change, logout |
| `/api/instruments/` | CRUD, import/export, QR lookup |
| `/api/maintenance/` | Tickets, AMC, calibration, service logs |
| `/api/inventory/` | Parts, stock transactions |
| `/api/vendors/` | Vendor CRUD |
| `/api/reports/` | Dashboard, MTTR, downtime, audit, calendar, PDF |
| `/api/auth/users/` | User management (manager only) |
| `/api/settings/` | Company settings, logo, custom options, PDF templates |

---

## License

MIT
