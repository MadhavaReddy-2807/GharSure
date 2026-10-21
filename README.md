# GharSure - Mobile-First Household Intelligence

GharSure is an Indian household intelligence and zero-cost product trials web application designed mobile-first. This repository contains the complete authentication, WhatsApp OTP onboarding flow, sequential customer ID allocation system, and authenticated 4-tab mobile shell built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase Postgres**, and **Meta WhatsApp Business Cloud API**.

---

## 📱 Onboarding Architecture & Flow

The onboarding journey is designed for high conversion on mobile browsers with a clean, white-first aesthetic:

1. **Screen 1: Splash Screen (`/splash` / `/`)**
   - Features the authentic GharSure logo and subtle brand accents.
   - Automatically inspects the session token:
     - Unauthenticated users $\rightarrow$ redirected to `/auth`.
     - Incomplete onboarding $\rightarrow$ resumed at `/onboarding`.
     - Completed profiles $\rightarrow$ redirected to `/home`.

2. **Screen 2: Phone Entry (`/auth`)**
   - Clean mobile number input with default India `+91` country code.
   - Triggers native mobile numeric keypad (`inputMode="numeric"`).
   - Validates Indian E.164 phone formats (`+91XXXXXXXXXX`).

3. **Screen 3: WhatsApp OTP Verification (`/auth/verify`)**
   - 6-digit OTP input supporting mobile SMS/WhatsApp autofill and clipboard paste.
   - 60-second resend cooldown timer and attempt lockouts.
   - Constant-time HMAC SHA-256 verification prevents timing and replay attacks.
   - Generates or retrieves customer profile and sets an HTTP-only secure JWT session.

4. **Screen 4: Profile Onboarding (`/onboarding`)**
   - Collects Full Name and City (with quick-select chips for Bangalore, Mumbai, Hyderabad, Delhi NCR, Pune, etc.).
   - Optional nickname / display name.
   - Client and server-side Zod validation.
   - Sets `onboarding_completed = true`.

5. **Screen 5: Authenticated 4-Tab Shell (`/home`, `/rewards`, `/refer`, `/store`)**
   - Persistent mobile bottom navigation bar with 4 tabs.
   - Displays the sequential customer ID badge (`GH000001`).
   - Safe-area inset aware to ensure no form or button is occluded.

---

## 🔒 Concurrency-Safe Sequential Customer IDs

Every customer is assigned a sequential, human-readable identifier:
`GH000001`, `GH000002`, `GH000003`...

### How Race Conditions and Collisions are Prevented:
- **Database Sequence:** Backed by PostgreSQL sequence `customer_id_seq` with atomic allocation (`nextval`).
- **Default Expression:** Assigned automatically on row creation:
  ```sql
  customer_id VARCHAR(16) UNIQUE NOT NULL DEFAULT ('GH' || lpad(nextval('customer_id_seq')::text, 6, '0'))
  ```
- **Upsert Idempotency:** The database upsert matches on `phone_e164`. If a phone number already exists, `customer_id` is untouched, avoiding gaps or duplicate customer records.
- **Client Immutability Trigger:** A PostgreSQL `BEFORE UPDATE` trigger explicitly prevents clients or API updates from modifying `id`, `customer_id`, or `phone_e164`.
- **In-Memory Store Synchronization:** When running in local development or unit test mode without a live database, an atomic counter ensures identical thread-safe concurrency behavior.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router, Server Actions & API Route Handlers)
- **Language:** TypeScript with strict type checking
- **Styling:** Tailwind CSS (primarily white `#ffffff`, dark navy `#002D4C`, GharSure orange `#F47200`, ivory `#FCF6EA`)
- **Database:** Supabase PostgreSQL with committed SQL migrations & Row Level Security (RLS)
- **Authentication:** WhatsApp OTP via Meta Cloud API + Secure HTTP-only JWT Sessions (`jose`)
- **Validation:** Zod v3
- **Icons:** Lucide React
- **Testing:** Vitest

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18.17 (Node 20+ or 24 recommended)
- npm or pnpm

### 2. Installation
```bash
git clone https://github.com/anindyaac/gharsure.git
cd gharsure
npm install
```

### 3. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env.local
```

For immediate local testing, **Development Mock Mode** is enabled by default in `.env.local`:
```env
OTP_DEV_MOCK_ENABLED=true
OTP_DEV_MOCK_CODE="123456"
```
In mock mode, you can enter any valid 10-digit Indian phone number (e.g. `9876543210`) and enter `123456` on the verification screen without needing Meta credentials.

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your mobile browser or DevTools mobile device emulator (375x812, 390x844, 430x932).

### 5. Running the Automated Tests
```bash
npm run test
```
Runs 26 automated unit, concurrency, security, and integration tests with 100% pass rate.

---

## 🌐 Supabase & Meta WhatsApp Production Setup

### A. Applying Database Migrations to Supabase
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase Dashboard.
3. Open and run the migration script located at:
   `supabase/migrations/20261021000000_gharsure_initial_schema.sql`
4. Copy your project URL, anon key, and service role key into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

### B. Setting up Meta WhatsApp Cloud API
1. Create a Meta Developer App under **Business** type.
2. Add **WhatsApp** product.
3. In WhatsApp API Setup, obtain:
   - `Phone Number ID` $\rightarrow$ `META_WHATSAPP_PHONE_NUMBER_ID`
   - `WhatsApp Business Account ID` $\rightarrow$ `META_WHATSAPP_BUSINESS_ACCOUNT_ID`
   - Permanent System User Access Token $\rightarrow$ `META_WHATSAPP_ACCESS_TOKEN`
4. Create and submit an **Authentication Message Template** in WhatsApp Manager:
   - Category: `AUTHENTICATION`
   - Template Name: `gharsure_auth_otp` (or your chosen name)
   - Add a 1-tap autofill or copy-code button with a dynamic variable `{{1}}`.
5. Update `.env.local`:
   ```env
   OTP_DEV_MOCK_ENABLED=false
   META_WHATSAPP_PHONE_NUMBER_ID="your_phone_id"
   META_WHATSAPP_ACCESS_TOKEN="your_access_token"
   META_WHATSAPP_OTP_TEMPLATE_NAME="gharsure_auth_otp"
   ```

---

## 🧪 Test Suite Summary

The repository includes comprehensive tests:
- `tests/phone.test.ts`: E.164 normalization, validation, masking (+91).
- `tests/otp.test.ts`: Cryptographic random generation, HMAC-SHA256 hashing, timing-safe equality.
- `tests/concurrency.test.ts`: Concurrent simultaneous signups, zero collisions, sequential IDs (`GH000001`).
- `tests/auth-flow.test.ts`: Cooldown enforcement, expiration, attempt limit lockouts, replay prevention.
- `tests/onboarding.test.ts`: Profile saving, onboarding completion state flag.
- `tests/security-and-routes.test.ts`: Client ID mutation protection, Zod validation, session isolation.
- `tests/e2e-api.test.ts`: Full API lifecycle from OTP dispatch to verified home state.

---

## 📄 License
Private & Confidential — GharSure Inc.
