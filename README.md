# LANJUT.ID

**AI-Powered Subscription Retention Platform for BNI Merchant Ecosystem**

LANJUT adalah platform retensi pelanggan berbasis AI yang membantu merchant UMKM subscription-based (gym, studio yoga, pilates, CrossFit, dsb.) di ekosistem BNI mendeteksi risiko churn, memberikan penawaran retensi otomatis, dan menjaga kesehatan margin bisnis — semuanya lewat integrasi Gemini AI dan payment gateway BNI Virtual Account.

---

## Daftar Isi

- [Ringkasan](#ringkasan)
- [Arsitektur](#arsitektur)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Fitur Utama](#fitur-utama)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Konfigurasi Environment](#konfigurasi-environment)
- [CI/CD & Deployment](#cicd--deployment)
- [API Overview](#api-overview)
- [Database](#database)
- [Kontribusi](#kontribusi)

---

## Ringkasan

Merchant yang bergantung pada langganan (membership gym, kelas yoga, dsb.) menghadapi masalah klasik: member berhenti aktif tanpa peringatan, lalu batal langganan begitu saja. LANJUT menutup celah ini dengan pipeline end-to-end:

1. **Deteksi dini** — menganalisis riwayat transaksi & pola kehadiran untuk menandai member berisiko churn.
2. **Intervensi otomatis** — AI menghasilkan survei pembatalan yang dipersonalisasi, menganalisis jawabannya, lalu menyusun penawaran retensi (diskon, freeze, reschedule) yang **tetap menjaga margin floor** yang diwajibkan bank pemberi pinjaman (BNI).
3. **Insight untuk merchant & bank** — dashboard analitik untuk pemilik usaha, dan dashboard portfolio health untuk Relationship Manager BNI yang memantau risiko kredit UMKM secara agregat.

Seluruh logika bisnis (batas diskon, margin floor, kebijakan retensi) dapat dikonfigurasi merchant lewat dua cara: upload dokumen guidebook/SOP (di-parse otomatis oleh AI), atau lewat chatbot bahasa natural dengan guardrail finansial otomatis.

## Arsitektur

Sistem berjalan sebagai 4 service terpisah, diorkestrasi lewat Docker Compose:

```
                         ┌─────────────────────┐
                         │   Nginx (VPS)        │
                         │  reverse proxy :80    │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    │                                 │
           ┌────────▼────────┐             ┌──────────▼──────────┐
           │  Frontend         │             │   Webhook BNI/       │
           │  Next.js :3000    │             │   Midtrans            │
           └────────┬──────────┘             └──────────┬───────────┘
                     │  /api/* (rewrite)                 │
           ┌─────────▼──────────────────────────────────▼──────────┐
           │              Backend Go (Gin) :5001                    │
           │  Auth, transaksi, tenant, offers, orkestrasi AI Gateway │
           └────────┬─────────────────────────┬──────────┬──────────┘
                     │                          │          │
         ┌───────────▼──────────┐   ┌──────────▼───────┐  │
         │  AI Sidecar (FastAPI)  │   │   PostgreSQL 16   │  │
         │  :8000 — Gemini +      │   │   (data utama)     │  │
         │  ML churn model        │   └────────────────────┘  │
         └───────────┬────────────┘                            │
                      │                                          │
              ┌───────▼────────┐                       ┌────────▼─────────┐
              │  Google Gemini  │                       │  Cloudflare R2     │
              │  API (LLM)       │                       │  (storage guidebook)│
              └─────────────────┘                       └────────────────────┘
```

**Prinsip desain penting:** setiap fitur AI punya **fallback deterministik/rule-based**. Jika Gemini API tidak tersedia (quota habis, network down, dsb.), sistem tetap merespons dengan engine heuristik lokal alih-alih error — response API selalu menyertakan field `engine_source` untuk transparansi mana yang sebenarnya menjawab (`"Google Gemini"` vs `"...Fallback Engine"`).

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | Next.js 16 (App Router, Webpack), React 19, TypeScript, Tailwind CSS, Radix UI, Framer Motion |
| **Backend API** | Go 1.26, Gin, pgx (PostgreSQL driver), MinIO client (S3-compatible untuk R2) |
| **AI Sidecar** | Python 3.11, FastAPI, Google Gemini API (`google-generativeai`), scikit-learn/XGBoost untuk model churn prediction |
| **Database** | PostgreSQL 16 |
| **Object Storage** | Cloudflare R2 (S3-compatible, untuk dokumen guidebook merchant) |
| **Payment Gateway** | BNI Virtual Account (SNAP API), Midtrans |
| **Infrastruktur** | Docker Compose, Nginx reverse proxy, GitHub Actions (CI/CD ke VPS) |

## Struktur Proyek

```
lanjut.id/
├── frontend/           # Next.js — dashboard merchant, member, BNI RM, login
│   └── src/
│       ├── app/        # Route pages (merchant, member, bni, payment-gateway, login, demo)
│       └── components/ # Komponen UI per-domain (merchant/, ui/, dsb.)
├── backend-go/         # Go/Gin — REST API, orkestrasi bisnis, integrasi payment
│   ├── cmd/server/     # Entrypoint
│   └── internal/
│       ├── handlers/   # HTTP handlers per domain
│       ├── services/   # AIGateway, R2 storage, dsb.
│       ├── store/      # Data access layer (Postgres)
│       ├── models/     # Domain models
│       └── db/migrations/  # SQL migration (auto-run saat startup)
├── ai/                 # Python/FastAPI — AI sidecar
│   └── app/
│       ├── core/       # Gemini client, guardrails, sanitizer, schema
│       ├── features/   # Guidebook, chatbot, retention, lifecycle, analytics, bookingchat
│       ├── services/   # ML churn model, revenue optimizer, RM payment health
│       └── routers/    # Backward-compat proxy ke features/*/router.py
├── backend/            # Node/Express — layanan legacy (tidak dipakai di docker-compose)
├── docker-compose.yml  # Orkestrasi 4 service (postgres, ai, backend, frontend)
├── nginx-lanjut.id.conf
└── .github/workflows/deploy.yml  # CI/CD: build & deploy selektif ke VPS
```

## Fitur Utama

### Untuk Merchant
- **Ingestion Guidebook AI** — upload dokumen katalog/SOP (PDF/DOCX/TXT), diekstrak otomatis jadi aturan bisnis terstruktur (katalog produk, kebijakan retensi, batas diskon & margin floor) oleh Gemini.
- **Conversational Business Logic Builder** — ubah aturan bisnis lewat chat bahasa natural ("naikkan diskon retensi jadi 20%"), divalidasi guardrail margin BNI secara real-time sebelum diterapkan.
- **Retention Inbox** — daftar member berisiko churn tinggi dengan aksi "Kirim Intervensi AI" yang men-generate penawaran retensi otomatis.
- **Visual Analytics Agent** — chat berbasis sesi untuk query data transaksi & feedback merchant, dijawab dengan narasi AI + agregat data riil.
- **Revenue & Portfolio Insights** — rekomendasi optimasi revenue, tren, dan insight dari riwayat transaksi.

### Untuk Member/Pelanggan
- Survei pembatalan dinamis (pilihan ganda + isian bebas) yang dipersonalisasi berdasarkan riwayat transaksi member.
- Penawaran retensi personal (adjust tier, freeze, reschedule) yang selalu margin-safe.
- Checkout via BNI Virtual Account, riwayat invoice & transaksi.

### Untuk BNI (Relationship Manager)
- Dashboard portfolio health seluruh merchant binaan.
- Audit log payment gateway (request/response BNI VA, redacted).
- Insight kredit UMKM (SME Credit DSS) berbasis retensi & turnover VA riil.

## Menjalankan Secara Lokal

### Prasyarat
- Docker & Docker Compose
- (Opsional, untuk dev tanpa Docker) Go 1.26+, Python 3.11+, Node.js 22+, PostgreSQL 16

### Quick Start (Docker Compose)

```bash
git clone https://github.com/adiradmnk/lanjut.id.git
cd lanjut.id
cp .env.example .env   # isi minimal GEMINI_API_KEY & MAGIC_TOKEN_HMAC_SECRET
docker compose up -d --build
```

Service akan tersedia di:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5001`
- AI Sidecar: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

Migrasi database berjalan otomatis saat container `backend` start pertama kali.

### Menjalankan Tanpa Docker (development)

```bash
# 1. AI sidecar
cd ai
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Backend Go (terminal baru)
cd backend-go
go run ./cmd/server

# 3. Frontend (terminal baru)
cd frontend
npm install
npm run dev
```

## Konfigurasi Environment

Variabel utama (lihat `.env.example` untuk daftar lengkap):

| Variabel | Keterangan |
|---|---|
| `GEMINI_API_KEY` | API key Google Gemini. Kosongkan untuk memaksa semua fitur AI pakai fallback deterministik. |
| `GEMINI_MODEL` | Override nama model Gemini (default: `gemini-3.6-flash`). |
| `DATABASE_URL` | Connection string PostgreSQL. |
| `MAGIC_TOKEN_HMAC_SECRET` | Secret untuk signing magic link member. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Cloudflare R2 untuk penyimpanan dokumen guidebook (opsional — upload tetap jalan tanpa ini, hanya skip penyimpanan file mentah). |
| `BNI_API_URL`, `BNI_CLIENT_ID`, `BNI_CLIENT_SECRET`, dst. | Kredensial integrasi BNI SNAP API. |
| `MAILJET_API_KEY`, `MAILJET_API_SECRET` | Pengiriman email notifikasi. |

**Cek status Gemini engine kapan saja** tanpa perlu baca log:

```bash
curl http://localhost:8000/health
# → { "gemini_engine": { "enabled": true, "model": "gemini-3.6-flash" }, ... }
```

## CI/CD & Deployment

Repo ini punya pipeline **auto-deploy** (`.github/workflows/deploy.yml`) yang berjalan setiap push ke `main`:

1. **Deteksi perubahan path** — hanya rebuild service yang filenya berubah (`frontend/`, `backend-go/`, `ai/`, atau semuanya jika `docker-compose.yml`/workflow berubah).
2. **Test** — `go vet && go build` untuk backend, `npm run build` untuk frontend (dijalankan hanya jika ada perubahan di path terkait).
3. **Deploy** — SSH ke VPS, `git reset --hard origin/main`, lalu `docker compose up -d --no-deps --build <service-yang-berubah>`.

Secrets yang dibutuhkan di GitHub repo settings: `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`, `VPS_PORT` (opsional), `VPS_PROJECT_DIR` (opsional).

## API Overview

Base URL backend: `/api`. Beberapa endpoint kunci:

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/merchant/:tenantId/guidebook` | Upload & ekstrak guidebook merchant |
| `GET` | `/merchant/:tenantId/business-rules` | Ambil aturan bisnis aktif |
| `POST` | `/merchant/:tenantId/chat-instruction` | Chat business logic builder |
| `GET` | `/merchant/:tenantId/at-risk-members` | Daftar member berisiko churn |
| `POST` | `/ai/tenants/:tenantId/members/:memberId/generate-offers` | Generate penawaran retensi AI |
| `POST` | `/merchant/:tenantId/cancellation-survey` | Generate survei pembatalan dinamis |
| `POST` | `/member/subscription/:id/feedback` | Submit feedback → analisis AI → offer |
| `GET` | `/merchant/:tenantId/revenue-insights` | Insight optimasi revenue |
| `POST` | `/merchant/:tenantId/analytics-sessions` | Buat sesi AI analytics agent |
| `GET` | `/bni/portfolio-health` | Dashboard kesehatan portfolio BNI |

AI sidecar (internal, dipanggil backend Go) mengekspos `/api/v1/{guidebook,chatbot,retention,lifecycle,analytics,booking-chat}/*` — lihat `ai/app/main.py` untuk daftar router lengkap.

## Database

Skema utama (lihat `backend-go/internal/db/migrations/`):

- `tenants` — data merchant, konfigurasi finansial (max discount, margin floor)
- `members` — pelanggan/member per tenant
- `class_sessions` — jadwal kelas/sesi
- `transactions` — transaksi & status pembayaran BNI VA
- `merchant_guidebooks` / `guidebooks` — dokumen & aturan bisnis hasil ekstraksi AI
- `feedback` — feedback member (survei pembatalan, dsb.)
- `ai_offers` — penawaran retensi yang di-generate AI
- `churn_history`, `payment_gateway_logs`, `analytics_sessions` — data pendukung analitik

Migrasi berjalan otomatis dan idempotent (`CREATE TABLE IF NOT EXISTS`) setiap kali service `backend` start.

## Kontribusi

1. Buat branch dari `main`
2. Pastikan `go vet ./...` (backend) dan `npm run build` (frontend) lulus sebelum push
3. Buka Pull Request ke `main` — CI akan menjalankan test otomatis, dan setelah merge akan ter-deploy otomatis ke VPS produksi

---

<p align="center">Dibangun untuk ekosistem UMKM subscription-based Indonesia, terintegrasi dengan BNI Payment Gateway.</p>
