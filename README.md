# GODAM-E

The seventh semester project for building a full-stack grocery inventory platform.

Full-stack grocery inventory management with Java Spring Boot backend, React frontend,
PostgreSQL + Redis via Docker, and TimeGPT-enabled AI forecasting.

---

## 🔧 Environment Configuration

This project uses a `.env` file for centralized configuration across Docker, backend, and frontend.

### Quick Setup

1. **Copy the example environment file:**
```bash
cp .env.example .env
```

2. **Customize .env if needed** (optional for local development):
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_db
DB_USERNAME=inventory_user
DB_PASSWORD=inventory_pass

# Backend
BACKEND_PORT=8080
FRONTEND_PORT=3001

# AI Integration (optional)
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Note:** `.env` is in `.gitignore` and **never committed**. Each environment (dev/staging/production) has its own `.env`.

---

## Prerequisites


## Step 1 — Start the Database with Docker

```bash
cd docker
docker compose up -d
```

Important: backend login and all APIs depend on PostgreSQL. If Docker is not running, login will fail because `/api/auth/login` cannot connect to the database.

This starts:
| Service    | URL / Port                          | Credentials                          |
|------------|-------------------------------------|--------------------------------------|
| PostgreSQL | localhost:5432                      | user: inventory_user / pass: inventory_pass |
| Redis      | localhost:6379                      | no auth                              |
| pgAdmin    | http://localhost:5050               | admin@inventory.com / admin123       |

```bash
docker compose ps
```

To connect pgAdmin to your DB:
1. Open http://localhost:5050
2. Add Server → Host: `postgres` · Port: `5432` · DB: `inventory_db`
3. Username: `inventory_user` · Password: `inventory_pass`

---

## Step 2 — Configure API Keys

Edit `backend/src/main/resources/application.yml`:

```yaml
app:
  ai:
    anthropic-api-key: YOUR_ANTHROPIC_API_KEY   # ← paste your Claude API key here
```

Or set as environment variable:
```bash
export ANTHROPIC_API_KEY=sk-ant-xxxx
```

---

## Step 3 — Run the Spring Boot Backend

```bash
cd backend
mvn spring-boot:run
```

Use this exact command (no space after the colon). `mvn spring-boot: run` is invalid and will fail.

The app starts on **http://localhost:8080**

Flyway automatically runs the migration and seeds:
- 3 demo users (admin / manager1 / employee1)
- 2 suppliers
- 4 categories
- 5 sample products

---

## Step 4 — Run the React Frontend

```bash
cd frontend
npm install
npm start
```

Opens at **http://localhost:3000**

---

## Demo Login Credentials

| Role     | Username   | Password   |
|----------|------------|------------|
| Admin    | admin      | Admin@123  |
| Manager  | manager1   | Admin@123  |
| Employee | employee1  | Admin@123  |

---

## API Endpoints Reference

### Auth
| Method | Endpoint           | Access  |
|--------|--------------------|---------|
| POST   | /api/auth/login    | Public  |
| POST   | /api/auth/users    | Admin   |
| GET    | /api/auth/users    | Admin+Manager |

### Products
| Method | Endpoint                     | Access         |
|--------|------------------------------|----------------|
| GET    | /api/products                | All            |
| POST   | /api/products                | Admin+Manager  |
| PUT    | /api/products/{id}           | Admin+Manager  |
| DELETE | /api/products/{id}           | Admin only     |
| GET    | /api/products/low-stock      | Admin+Manager  |
| GET    | /api/products/barcode/{code} | All            |
| GET    | /api/products/{id}/barcode   | All            |

### Inventory
| Method | Endpoint                              | Access |
|--------|---------------------------------------|--------|
| POST   | /api/inventory/products/{id}/adjust   | All    |
| GET    | /api/inventory/products/{id}/movements| All    |
| GET    | /api/inventory/dashboard              | All    |
| GET    | /api/inventory/products/{id}/eoq      | Admin+Manager |

### Orders
| Method | Endpoint              | Access        |
|--------|-----------------------|---------------|
| GET    | /api/orders           | Admin+Manager |
| POST   | /api/orders           | Admin+Manager |
| PATCH  | /api/orders/{id}/approve | Admin+Manager |
| PATCH  | /api/orders/{id}/receive | All           |
| PATCH  | /api/orders/{id}/cancel  | Admin+Manager |

### AI
| Method | Endpoint                  | Access        |
|--------|---------------------------|---------------|
| POST   | /api/ai/chat              | Admin+Manager |
| GET    | /api/ai/forecast          | Admin+Manager |
| GET    | /api/ai/alerts            | Admin+Manager |
| PATCH  | /api/ai/alerts/{id}/read  | Admin+Manager |
| POST   | /api/ai/generate-alerts   | Admin only    |

---

## Docker Commands Reference

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Stop and delete all data (fresh start)
docker compose down -v

# View logs
docker compose logs postgres
docker compose logs redis

# Connect to PostgreSQL shell
docker exec -it inventory_postgres psql -U inventory_user -d inventory_db
```

---

## Project Structure

```
inventory-app/
├── docker/
│   └── docker-compose.yml          ← Start here
├── backend/                        ← Spring Boot Java app
│   ├── pom.xml
│   └── src/main/java/com/inventory/
│       ├── config/                 ← Security, CORS, AI config
│       ├── controller/             ← REST endpoints
│       ├── dto/                    ← Request/Response objects
│       ├── model/                  ← JPA entities + enums
│       ├── repository/             ← Spring Data interfaces
│       ├── security/               ← JWT filter + utility
│       └── service/                ← Business logic + AI calls
└── frontend/                       ← React app
    └── src/
        ├── components/Layout.js    ← Sidebar navigation
        ├── context/AuthContext.js  ← JWT auth state
        ├── pages/                  ← All page components
        └── services/api.js         ← Axios API calls
```

---

## Common Issues

**Port 5432 already in use**
```bash
# Find and kill the process, or change the port in docker-compose.yml
lsof -i :5432
```

**Flyway migration fails**
```bash
# Reset the database completely
docker compose down -v
docker compose up -d
```

**CORS error from frontend**
Make sure the backend is running on port 8080 and frontend on 3000.
The proxy in package.json handles `/api` → `localhost:8080`.

**AI features not working**
Set your `ANTHROPIC_API_KEY` in `application.yml` or as an env variable.
