# SamTopup — Free Fire Bangladesh Automated Top-Up Platform MVP

An automated Free Fire Bangladesh top-up ecommerce platform foundation built with Next.js 16 (App Router), TypeScript, PostgreSQL, Prisma ORM 7, Auth.js v5 (NextAuth), and Tailwind CSS with shadcn/ui.

---

## Technical Stack & Architecture

- **Framework**: Next.js 16 (App Router with Server Components & Server Actions)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 & shadcn/ui
- **Database**: PostgreSQL
- **ORM**: Prisma ORM 7 (with `@prisma/adapter-pg` driver adapter)
- **Authentication**: Auth.js v5 (Email/Password credentials via `bcryptjs` + Google OAuth 2.0)
- **Validation**: Zod schema validation
- **Deployment**: Vercel ready (Serverless architecture)

---

## Architectural Principles Implemented

### 1. Money Safety & Ledger
- All monetary amounts in the database schema and internal services are stored strictly as integers in **paisa** (1 NPR = 100 paisa).
- Floating-point arithmetic is strictly forbidden for money calculations.
- Display helper functions (`formatNPR`, `paisaToRupees`) format paisa into formatted NPR strings (e.g. `Rs. 1,250.50`) for user interfaces.
- The `WalletTransaction` model maintains a complete audit ledger (`balanceBefore`, `balanceAfter`, `amount`, `type`, `reference`, `description`).

### 2. Explicit Order State Machine
Order statuses are strictly enforced via the `OrderStatus` enum:
- `PENDING`
- `PROCESSING`
- `COMPLETED`
- `FAILED`
- `REFUNDED`
- `MANUAL_REVIEW`

### 3. Decoupled Provider Abstraction
Fulfillment mechanisms are decoupled from the order system via the `TopupProvider` interface (`src/server/providers/topup-provider.ts`). Future Telegram MTProto or UniPin suppliers can implement this interface without modifying core order processing logic.

### 4. Server/Client Security Boundary
- Database access, user lookup, password verification, and secret keys execute strictly on the server.
- Protected routes (`/dashboard`, `/admin`) are guarded by Next.js 16 Proxy (`src/proxy.ts`). Admin access is checked server-side (`src/app/admin/layout.tsx`).

---

## Project Structure

```text
samtopup/
├── prisma/
│   └── schema.prisma         # Database schema (Auth, Wallet, Orders, Products, Logs)
├── src/
│   ├── app/
│   │   ├── (auth)/           # Authentication route group (/login, /register)
│   │   ├── (dashboard)/      # Protected dashboard route group (/dashboard)
│   │   ├── admin/            # Protected admin panel (/admin)
│   │   ├── api/
│   │   │   └── auth/         # Auth.js handler & user registration API endpoint
│   │   ├── layout.tsx        # Root layout (Inter font, SessionProvider, Toaster)
│   │   ├── page.tsx          # Landing page
│   │   └── globals.css       # Tailwind CSS v4 & theme design system
│   ├── components/
│   │   ├── auth/             # Login & Registration form components
│   │   ├── shared/           # Navbar, Footer, Loading, ErrorDisplay, SessionProvider
│   │   └── ui/               # shadcn/ui components (button, card, input, sheet, etc.)
│   ├── config/
│   │   └── constants.ts      # Currency config (NPR), status labels/colors, navigation
│   ├── generated/
│   │   └── prisma/           # Generated Prisma v7 Client & Types
│   ├── lib/
│   │   ├── db/               # Prisma singleton client with Postgres driver adapter
│   │   ├── money/            # Integer-based NPR currency & paisa utilities
│   │   ├── validation/       # Zod validation schemas for forms & APIs
│   │   └── utils.ts          # Tailwind class merger utility
│   ├── server/
│   │   ├── providers/        # TopupProvider interface abstraction
│   │   └── services/         # User registration, authentication & database services
│   ├── types/                # TypeScript type declarations
│   ├── auth.config.ts        # Edge/Proxy compatible Auth.js configuration
│   ├── auth.ts               # Full Auth.js config (Prisma adapter, Credentials, Google)
│   └── proxy.ts              # Next.js 16 Proxy for route protection & authorization
├── .env.example              # Environment variables template
├── README.md                 # Project documentation
└── tsconfig.json             # Strict TypeScript configuration
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/samtopup?schema=public"

# Auth.js (Generate secret with: openssl rand -base64 32)
AUTH_SECRET="your-generated-auth-secret"
AUTH_TRUST_HOST=true

# Google OAuth (https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="SamTopup"
```

---

## Local Development Instructions

### 1. Prerequisites
- Node.js 20.19.0+
- PostgreSQL database instance

### 2. Setup Dependencies
```bash
npm install
```

### 3. Database Generation & Migration
```bash
# Generate Prisma v7 Client
npx prisma generate

# Apply dev migrations to PostgreSQL
npx prisma migrate dev --name init
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment to Vercel

1. Push code to your GitHub / GitLab repository.
2. Import the project into Vercel.
3. Configure Environment Variables in the Vercel Dashboard:
   - `DATABASE_URL` (PostgreSQL / Neon / Supabase connection string)
   - `AUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL`
4. Build settings automatically detect Next.js. Vercel will run `npm run build`.

---

## Verification & Status

- ✅ Prisma Schema valid and validated (`npx prisma validate`)
- ✅ Prisma Client generated (`npx prisma generate`)
- ✅ Production build successful with zero TypeScript or ESLint errors (`npm run build`)
- ✅ Security baseline established (no secrets committed, server-side auth checks)
"# SamTopup" 
