# SC3 Backend — Pembelian & Penerimaan Barang

REST API untuk Studi Kasus 3 (Pembelian & Penerimaan Barang). Dibangun dengan **Fastify 4**, **Prisma 5** + **MySQL 8**, dijalankan via **Docker Compose** (Node 20).

Kontrak lengkap tiap endpoint ada di `SC3.postman_collection.json` (repositori ini) dan `REQUIREMENTS.md` (file lokal, tidak ter-commit — ambil dari maintainer jika diperlukan).

## Struktur

```
├── package.json                # Fastify 4, Prisma 5, @fastify/cors — script: dev, prisma:*, seed
├── docker-compose.yml          # 3 service: db (MySQL 8.0), db-init (shadow db), app
├── Dockerfile                  # Multi-stage node:20-bullseye-slim
├── prisma.config.ts            # Konfigurasi Prisma (root-level)
├── tsconfig.json
├── .env.example                # Kredensial MySQL + DATABASE_URL — wajib disalin ke .env
├── prisma/
│   ├── schema.prisma           # Models: ItemCategory, Item, Vendor, PurchaseOrder(+Item),
│   │                           #                                         GoodsReceipt(+Item); enum Uom, POStatus
│   ├── seed.js                 # Seed kategori 3 level & 9 vendor
│   └── migrations/             # init + remove_no_pr
├── src/
│   ├── server.js               # Fastify bootstrap: CORS, error handler + logging, health, prefix /api/v1
│   ├── config/prisma.js        # PrismaClient singleton
│   ├── routes/                 # item/po/gr.routes.js  → daftar endpoint
│   ├── handlers/               # item/po/gr.handler.js → request ↔ service
│   ├── schemas/               # item/po/gr.schema.js  → schema JSON (Ajv, additionalProperties: false)
│   ├── services/               # item/po/gr.service.js → business logic + query Prisma
│   └── utils/
│       ├── response.js         # Helper envelope { success, data, message }
│       └── tx-retry.js         # Prisma transaction retry (P2028/P2034) — digunakan PO & GR
└── SC3.postman_collection.json # Kontrak API v1.1 untuk Postman
```

Arsitektur request: `route → (Ajv validation) → handler → service → Prisma` dengan response envelope `{ success, data, message }`; error memakai `{ success: false, error, details }`.

## Run Instructions

### Port & URL

| Service | Port | Catatan |
|---|---|---|
| app (Fastify) | `8080` | `http://localhost:8080/api/v1` |
| db (MySQL) | `3306` (exposed ke host) | password & nama db dari `.env` |

### Setup Docker (disarankan)

```bash
# 1. Clone & masuk ke root repo
git clone https://github.com/fahmiarya/Purchase-Receipt_Backend.git
cd Purchase-Receipt_Backend

# 2. Siapkan .env
cp .env.example .env
# isi MYSQL_ROOT_PASSWORD, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD
# (DATABASE_URL di .env hanya untuk akses dari host; di dalam container
#  docker-compose men-override dengan host db:3306)

# 3. Build & start (db + db-init + app)
docker compose up -d --build

# 4. Verifikasi
curl http://localhost:8080/api/v1/health
# → {"success":true,"data":{"status":"ok"}}
```

Saat container `app` berjalan, perintah berikut dijalankan otomatis:
`npx prisma generate && npx prisma migrate deploy && npx prisma db seed && node src/server.js`
— jadi skema database dan data seed (kategori 3 level + 9 vendor) langsung siap.

### Setup Non-Docker

```bash
npm ci

# 1. Set DATABASE_URL di .env sesuai kredensial MySQL lokal:
#   DATABASE_URL="mysql://<user>:<password>@localhost:3306/<database>"

# 2. Generate client & terapkan skema
npm run prisma:generate
npm run prisma:migrate

# 3. Seed master data
npm run seed

# 4. Jalankan server (port 8080)
npm run dev
```

> **Penting CORS**: frontend Flutter Web (dev server / build) diizinkan penuh melalui `@fastify/cors` dengan `origin: true` — di-register di `src/server.js`.

## Catatan Kontrak API

Semua endpoint berprefix `/api/v1`. Daftar lengkap + contoh body ada di `SC3.postman_collection.json`.

### Endpoint

| Modul | Endpoint | Keterangan |
|---|---|---|
| Health | `GET /health` | |
| Items | `GET /items?category_code=&search=&include_inactive=` | `category_code` bisa level 1/2/3 — otomatis include kategori turunannya. Default **hanya item aktif**; `include_inactive=true` untuk melihat semua |
| | `GET /items/:id`, `POST /items`, `PUT /items/:id`, `PATCH /items/:id/toggle-status` | toggle aktif/nonaktif — body `{ "isActive": false }` |
| | `GET /items/:id/stock` | stok real-time |
| PO | `GET /purchase-orders?status=&vendor=&date=` | `vendor` = id; `date` = hari persis |
| | `GET /purchase-orders/:id`, `POST /purchase-orders`, `PUT /purchase-orders/:id`, `PATCH /purchase-orders/:id/cancel` | |
| | `GET /purchase-orders/:id/receipt-status` | status penerimaan per PO |
| GR | `GET /goods-receipts?po_id=&date=`, `GET /goods-receipts/:id`, `POST /goods-receipts` | |

Filter tanggal kedua module mendukung **rentang** `startDate`/`endDate` (`YYYY-MM-DD`, inclusive) selain `date` exact day; rentang terbalik/tanggal tidak valid → 422. Semua endpoint list mendukung pagination `skip`/`take` (opsional).

### Aturan bisnis yang di-enforce backend

- **Item create** hanya menerima `{ name, itemCategoryCode, brandCode, uom }`. `code` di-generate otomatis `{L1}-{L2}-{L3}-{brandCode}-{sequence}` (sequence per kombinasi kategori+brand) dan `stock` mulai `0`.
- **Item update** hanya data master (`name`, `brandCode`, `uom`). `stock` tidak dapat diubah manual — hanya bergerak lewat Goods Receipt.
- **Item tidak pernah dihapus** — hanya toggle aktif/nonaktif via `PATCH /items/:id/toggle-status` (body `{ isActive }`, idempotent). Item aktif dipakai untuk PO; item nonaktif tetap ada di data history dan bisa diaktifkan kembali. List default hanya menampilkan item aktif.
- **PO**: update/cancel hanya saat status `open`; cancel ditolak bila sudah punya GR. `status` filter menerima kapitalisasi apa pun (`Open`); `all` = tanpa filter. Item yang **nonaktif ditolak (422)** saat ditarik ke PO.
- **GR**: hanya untuk PO `open`/`partial`; `qtyDiterima` > 0 dan ≤ sisa PO; **`tglGR` tidak boleh lebih awal dari `tglPO`** (hari sama diperbolehkan); pembuatan GR atomik dalam satu transaksi Prisma (item PO, stok item, status PO) dengan retry otomatis `P2028`/`P2034`.
- **GR immutable** — tidak ada endpoint edit/delete; koreksi lewat Goods Return (di luar scope).
- **Deserialisasi decimal**: Prisma `Decimal` dikirim sebagai **string** (`"100"`) — frontend mem-parse dengan helper sehingga tidak ada type error.
