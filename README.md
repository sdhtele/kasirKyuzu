# 🛒 Sistem Kasir - Toko Makanan

Sistem kasir modern dengan fitur lengkap untuk toko retail/makanan. Dibangun dengan React + Vite (Frontend) dan Python FastAPI (Backend).

![Sistem Kasir](https://via.placeholder.com/800x400?text=Sistem+Kasir+Toko+Makanan)

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 📷 **Barcode Scanner** | Scan barcode EAN-13, UPC, Code128, QR Code |
| 🔐 **Multi-User Auth** | Login dengan role Admin & Kasir |
| 📦 **Inventory** | Manajemen stok dengan alert stok rendah |
| 💳 **Multi Payment** | Cash, QRIS, Debit, Credit |
| 🏷️ **Diskon/Promo** | Kode promo dengan persentase atau nominal |
| 📊 **Laporan** | Report harian, bulanan, dan best sellers |
| 🖨️ **Cetak Struk** | Format struk thermal printer |

---

## 🏗️ Arsitektur Sistem

Sistem kasir ini dibangun dengan arsitektur client-server yang terpisah, memberikan fleksibilitas dan skalabilitas:

```mermaid
graph TB
    subgraph "Frontend - React + Vite"
        A[👤 User Interface]
        A --> B[Login Page]
        A --> C[Cashier Page]
        A --> D[Admin Dashboard]
        
        B --> E[Auth Context]
        C --> F[Cart Management]
        C --> G[Barcode Scanner]
        D --> H[Product Management]
        D --> I[Reports & Analytics]
        
        F --> J[Checkout Modal]
        J --> K[Payment Processing]
    end
    
    subgraph "Backend - FastAPI"
        L[API Gateway]
        L --> M[Auth Routes]
        L --> N[Product Routes]
        L --> O[Transaction Routes]
        L --> P[Discount Routes]
        L --> Q[Report Routes]
        
        M --> R[JWT Authentication]
        N --> S[Product CRUD]
        O --> T[Transaction CRUD]
        P --> U[Discount Validation]
        Q --> V[Analytics Engine]
    end
    
    subgraph "Database - SQLite"
        W[(kasir.db)]
        W --> X[Users Table]
        W --> Y[Products Table]
        W --> Z[Transactions Table]
        W --> AA[Discounts Table]
        W --> AB[Customers Table]
    end
    
    subgraph "Storage"
        AC[File System]
        AC --> AD[Product Images]
    end
    
    E -->|HTTP/JSON| M
    F -->|HTTP/JSON| N
    J -->|HTTP/JSON| O
    G -->|HTTP/JSON| N
    H -->|HTTP/JSON| N
    I -->|HTTP/JSON| Q
    
    R --> X
    S --> Y
    S --> AD
    T --> Z
    U --> AA
    V --> Z
    V --> Y
    
    style A fill:#4CAF50
    style L fill:#2196F3
    style W fill:#FF9800
    style AC fill:#9C27B0
```

### Alur Kerja Sistem

1. **Login & Authentication**
   - User login melalui frontend
   - Backend memvalidasi kredensial dengan database
   - JWT token digenerate dan disimpan di browser
   - Token digunakan untuk autentikasi request berikutnya

2. **Proses Transaksi Kasir**
   - Scan barcode atau pilih produk manual
   - Produk ditambahkan ke cart
   - Sistem cek stok di database
   - Kasir input jumlah dan terapkan diskon
   - Checkout → pilih metode pembayaran
   - Backend catat transaksi & update stok
   - Generate struk digital

3. **Manajemen Inventory (Admin)**
   - Admin tambah/edit/hapus produk
   - Upload gambar produk → disimpan di file system
   - Update stok produk
   - Sistem alert jika stok rendah

4. **Laporan & Analytics**
   - Backend aggregate data transaksi
   - Generate laporan harian/bulanan
   - Analisis produk terlaris
   - Export ke Excel/PDF

---

## 🚀 Cara Menjalankan

### Prasyarat

- **Python 3.9+** - [Download Python](https://python.org)
- **Node.js 18+** - [Download Node.js](https://nodejs.org)
- **Git** (opsional) - [Download Git](https://git-scm.com)

### 1️⃣ Clone / Download Project

```bash
# Jika menggunakan git
git clone <repository-url>
cd program_kasir

# Atau download dan extract ZIP
```

### 2️⃣ Setup Backend (Python FastAPI)

```bash
# Masuk ke folder backend
cd backend

# Buat virtual environment (disarankan)
python -m venv venv

# Aktifkan virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Jalankan server backend
python -m uvicorn main:app --reload --port 8000
```

Backend akan berjalan di: **http://localhost:8000**

### 3️⃣ Setup Frontend (React + Vite)

Buka terminal baru:

```bash
# Masuk ke folder frontend
cd frontend

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Frontend akan berjalan di: **http://localhost:3000**

### 4️⃣ Buka Aplikasi

Buka browser dan akses: **http://localhost:3000**

---

## 🔑 Akun Default

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Kasir | `kasir` | `kasir123` |

**Admin** dapat mengakses semua fitur termasuk manajemen produk, stok, diskon, dan laporan.

**Kasir** hanya dapat mengakses kasir dan riwayat transaksi.

---

## 📁 Struktur Project

```
program_kasir/
├── backend/                 # Python FastAPI Backend
│   ├── main.py             # Entry point & app initialization
│   ├── database.py         # SQLite database config
│   ├── models.py           # SQLAlchemy models
│   ├── auth.py             # JWT authentication
│   ├── requirements.txt    # Python dependencies
│   ├── kasir.db           # SQLite database with demo data
│   ├── .env.example       # Environment variables template
│   ├── uploads/           # Product images (included for demo)
│   └── routes/
│       ├── auth.py         # Auth endpoints
│       ├── products.py     # Product endpoints
│       ├── transactions.py # Transaction endpoints
│       ├── discounts.py    # Discount endpoints
│       ├── reports.py      # Report endpoints
│       ├── customers.py    # Customer endpoints
│       ├── export.py       # Export endpoints
│       └── users.py        # User management endpoints
│
├── frontend/               # React + Vite Frontend
│   ├── package.json       # Node.js dependencies
│   ├── vite.config.js     # Vite configuration
│   ├── index.html         # HTML entry point
│   └── src/
│       ├── main.jsx       # React entry point
│       ├── App.jsx        # Main app component
│       ├── index.css      # Global styles
│       ├── context/
│       │   ├── AuthContext.jsx  # Auth state management
│       │   └── ThemeContext.jsx # Theme management
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── Cart.jsx
│       │   ├── BarcodeScanner.jsx
│       │   └── CheckoutModal.jsx
│       └── pages/
│           ├── LoginPage.jsx
│           ├── CashierPage.jsx
│           ├── AdminPage.jsx
│           ├── InventoryPage.jsx
│           ├── DiscountsPage.jsx
│           ├── ReportsPage.jsx
│           └── HistoryPage.jsx
│
├── .gitignore             # Git ignore rules
└── README.md              # Dokumentasi ini
```

> 💡 **Demo Data Included**
> Repository ini sudah include `kasir.db` (database dengan sample data) dan `uploads/` (gambar produk dummy) agar bisa langsung dicoba tanpa setup tambahan.

> ⚠️ **File yang TIDAK di-commit ke Git:**
> - `node_modules/` - Dependencies Node.js (install dengan `npm install`)
> - `__pycache__/` - Python cache (auto-generated)
> - `.venv/` - Python virtual environment (buat sendiri)




---

## 🔌 API Endpoints

### Auth
```
POST /api/auth/login     - Login
POST /api/auth/register  - Register (admin only)
GET  /api/auth/me        - Get current user
```

### Products
```
GET    /api/products              - List all products
GET    /api/products/{id}         - Get product by ID
GET    /api/products/barcode/{code} - Get by barcode
POST   /api/products              - Create product
PUT    /api/products/{id}         - Update product
PUT    /api/products/{id}/stock   - Adjust stock
DELETE /api/products/{id}         - Delete product
GET    /api/products/{id}/barcode-image - Get barcode image
```

### Transactions
```
GET  /api/transactions      - List transactions
POST /api/transactions      - Create transaction
GET  /api/transactions/{id} - Get transaction detail
```

### Discounts
```
GET    /api/discounts              - List discounts
POST   /api/discounts              - Create discount
GET    /api/discounts/validate/{code} - Validate promo code
PUT    /api/discounts/{id}         - Update discount
DELETE /api/discounts/{id}         - Delete discount
```

### Reports
```
GET /api/reports/daily       - Daily sales report
GET /api/reports/monthly     - Monthly summary
GET /api/reports/best-sellers - Top selling products
GET /api/reports/summary     - Dashboard summary
```

---

## 📷 Cara Menggunakan Barcode Scanner

1. Klik tombol **"▶️ Mulai Scan"**
2. **Izinkan akses kamera** jika browser meminta
3. Arahkan kamera ke **barcode produk**
4. Scanner akan **otomatis mendeteksi** dan menambahkan ke keranjang
5. Terdengar **suara beep** saat berhasil

**Tips:**
- Pastikan pencahayaan cukup terang
- Jarak kamera 10-20 cm dari barcode
- Barcode harus dalam fokus (tidak blur)

**Input Manual:** Jika scanner tidak terdeteksi, ketik barcode secara manual di input box.

---

## 🛠️ Development

### Reset Database

Hapus file `backend/kasir.db` dan restart server untuk reset database dengan data awal.

```bash
# Windows
del backend\kasir.db

# Linux/Mac
rm backend/kasir.db
```

### Build Production

```bash
# Frontend
cd frontend
npm run build

# Output di folder: frontend/dist/
```

---

## 📝 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, html5-qrcode |
| Backend | Python 3.9+, FastAPI, SQLAlchemy |
| Database | SQLite |
| Auth | JWT (python-jose), pbkdf2_sha256 |
| Styling | Vanilla CSS (Glassmorphism) |

---

## 📄 License

MIT License - Free for personal and commercial use.

---

## 🙋 Support

Jika ada pertanyaan atau masalah, silakan buat Issue di repository ini.
