# DEF App Mobile — Run Commands

## START EVERYTHING

Open **4 terminals**:

### Terminal 1 — Database + CloudBeaver
```
cd "C:\Users\Ronish Sharma\Final DEF app\DEF App Mobile"
docker compose up db adminer cloudbeaver -d
```

### Terminal 2 — Backend (port 8004)
```
cd "C:\Users\Ronish Sharma\Final DEF app\DEF App Mobile\backend"
"C:\Users\Ronish Sharma\bin\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8004 --reload
```

### Terminal 3 — Frontend (port 5174)
```
cd "C:\Users\Ronish Sharma\Final DEF app\DEF App Mobile\frontend"
npm run dev
```

### Terminal 4 — WhatsApp (port 8003)
```
cd "C:\Users\Ronish Sharma\Final DEF app\DEF App Mobile\whatsapp"
node index.js
```

> After starting WhatsApp, open http://localhost:8003/qr and scan with WhatsApp.
> Session is saved — you only need to scan once. Subsequent starts reconnect automatically.

---

## URLS

| What | URL |
|---|---|
| Customer portal | http://localhost:5174/login |
| Staff portal | http://localhost:5174/staff/login |
| Database (Adminer) | http://localhost:8081 |
| CloudBeaver (visual DB) | http://localhost:8085 |
| WhatsApp QR | http://localhost:8003/qr |
| API docs | http://localhost:8004/docs |

### Adminer login
- System: PostgreSQL · Server: `db` · User: `defuser` · Password: `defpassword123` · DB: `defmobile`

---

## STAFF CREDENTIALS (seeded)

| Role | Email | Password |
|---|---|---|
| Admin | admin@def.com | admin123 |
| Central Team | central@def.com | central123 |
| Finance | finance@def.com | finance123 |
| Operations | ops@def.com | ops123 |
| Sales | sales@def.com | sales123 |

---

## RESTART INDIVIDUAL SERVICES

| Service | How to restart |
|---|---|
| Backend | `Ctrl+C` → re-run the uvicorn command. Auto-reloads on file save — no restart needed for code changes. |
| Frontend | `Ctrl+C` → re-run `npm run dev`. Auto-reloads on file save too. |
| WhatsApp | `Ctrl+C` → re-run `node index.js`. Session saved — no re-scan needed. |
| Database | `docker compose down` → `docker compose up db adminer -d` |

---

## STOP EVERYTHING

1. Terminal 2 (Backend) → `Ctrl+C`
2. Terminal 3 (Frontend) → `Ctrl+C`
3. Terminal 4 (WhatsApp) → `Ctrl+C`
4. Terminal 1 (Database):
```
docker compose down
```

---

## WIPE DATABASE (start completely fresh)
```
docker compose down -v
```
> ⚠️ This deletes all data including customers, orders, and payments. SKUs and staff accounts will be re-seeded on next backend start.

---

## FULL ORDER FLOW (test reference)

| Step | Who | Where |
|---|---|---|
| Register | Customer | http://localhost:5174/register |
| Approve customer | Central | Staff → Customers → Approve |
| Login | Customer | http://localhost:5174/login |
| Place order | Customer | Portal → Order tab |
| Verify + send proforma | Central | Staff → Orders → order → Verify |
| Upload payment proof | Customer | Portal → Orders → order → Upload |
| Verify payment | Central / Finance | Staff → Payments or Orders → order |
| Confirm order | Central | Staff → Orders → order → Confirm |
| Dispatch / Mark shipped | Central / Ops | Staff → Orders → order → Dispatch |
| Mark delivered | Central / Ops | Staff → Orders → order → Delivered |
| Confirm receipt (GRN) | Customer | Portal → Orders → order → Confirm |
| Close order | Central | Staff → Orders → order → Close |
