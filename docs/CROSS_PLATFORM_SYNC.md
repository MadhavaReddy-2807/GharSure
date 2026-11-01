# GharSure Cross-Platform Architecture & Synchronization Guide

This document specifies the end-to-end synchronization contract between the **GharSure Web Platform / Admin Portal** (`D:\Projects\GharSure`) and the **GharSure Mobile (Flutter Android) Application** (`D:\Projects\GharSure App`).

---

## 1. Unified Architecture & Database Source of Truth

Both Web and Mobile clients communicate with the same Next.js API server (`https://ghar-sure-sand.vercel.app` in production or `http://10.0.2.2:3000` / local LAN in development) backed by **Supabase PostgreSQL** (`postgresql://postgres:...@db.omegywbaorhruvcivatc.supabase.co:5432/postgres`).

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Next.js Web / Admin App     │       │       Flutter Android App       │
│      (D:\Projects\GharSure)     │       │     (D:\Projects\GharSure App)  │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │ (Cookies & Bearer)                      │ (Bearer Token)
                 ▼                                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          Next.js API Server Routes                        │
│          /api/auth/*, /api/cart, /api/checkout/*, /api/surveys/*          │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        Supabase PostgreSQL Database                       │
│    customers, customer_carts, coin_transactions, surveys, orders, etc.   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Session Resolution

### The Dual-Transport Session Model
Previously, mobile checkout resulted in a false `"You must sign in before proceeding"` error because:
1. `/api/auth/verify-otp` only sent an HTTP `Set-Cookie` header and did not return the JWT `token` in the JSON response body.
2. Flutter clients could not automatically propagate cookies across all HTTP clients.
3. Server routes only inspected Next.js `cookies()`, ignoring the standard `Authorization: Bearer <token>` header.

### Resolution
- **Token Delivery:** `/api/auth/verify-otp` now sets the cookie AND returns:
  ```json
  {
    "success": true,
    "token": "<jwt_string>",
    "customer": { ... },
    "isNewUser": false
  }
  ```
- **Session Verification (`src/lib/session.ts`):** `verifyRequestSession(req)` and `getCurrentSession()` now extract bearer tokens:
  ```ts
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }
  ```
- **Mobile Storage (`D:\Projects\GharSure App\lib\core\network\api_client.dart`):** `ApiClient` securely stores the token in `SharedPreferences` and attaches `Authorization: Bearer <token>` to all HTTP requests (`GET`, `POST`, `PUT`, `DELETE`).

---

## 3. Atomic Sequential Customer ID Generation

To prevent ID collisions and duplicate user accounts:
- Every verified phone number maps to **exactly one** record in `customers`.
- Customer IDs are generated atomically using a dedicated PostgreSQL sequence:
  ```sql
  CREATE SEQUENCE IF NOT EXISTS customer_id_seq START WITH 1 INCREMENT BY 1;
  ```
- Formatted as `GH000001` via `to_char(nextval('customer_id_seq'), 'FM000000')`.
- **Constraint:** `COUNT(*) + 1` is strictly forbidden to prevent race-condition duplicates.

---

## 4. Multi-Step Onboarding Flow

New users must complete onboarding before gaining access to general actions. Existing users bypass onboarding directly to the home screen.

### Onboarding Steps
1. **Profile Info:** Full name, email (optional), city, referral code (optional).
2. **Household Details:** Living arrangement (Apartment / Independent House / Villa), family size, water purifier type, appliances owned. Persisted in `customers.household_details` (`jsonb`).
3. **Preferences / Priorities:** Notification preferences, service interests.
4. **Review & Welcome Bonus:** Crediting of first-time welcome coins (100 coins) via the `coin_transactions` ledger.

Both Web (`src/app/onboarding/page.tsx`) and Mobile (`lib/features/auth/onboarding_screen.dart`) use identical 4-step wizard schemas and persist to `/api/customer/onboarding`.

---

## 5. Bidirectional Server-Side Cart Synchronization

Both platforms synchronize their cart with the backend database so users can add items on Web and see them in the Android App (and vice versa).

### Database Schema (`customer_carts`)
```sql
CREATE TABLE IF NOT EXISTS customer_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customer_carts_customer UNIQUE (customer_id)
);
```

### API Endpoint (`/api/cart`)
- `GET /api/cart` — Fetches current cart items from `customer_carts`.
- `POST /api/cart` — Saves `items: CartItem[]` to `customer_carts` (upsert).
- `DELETE /api/cart` — Clears the saved cart upon successful checkout.

### Minimal Cart UI
The cart indicator in both Web (`src/components/app-header.tsx`) and Mobile (`lib/features/main_shell/main_navigation_shell.dart`) displays a minimal count indicator (`Cart 3` or `[Cart Icon] 3`) without colored badges, circular pills, or banners.

---

## 6. Store & Product Management

### Supabase Storage Image Upload
Admin Store (`src/app/admin/store/page.tsx`) and Survey Admin (`src/app/admin/surveys/page.tsx`) upload images directly via `/api/admin/upload`:
- Bucket: `products` for Store products, `surveys` for Survey covers.
- File size limit: 5MB.
- Supported types: PNG, JPEG, WebP, SVG.
- Fallback: Local filesystem `/public/uploads/` when direct storage credentials are unavailable.

### Authoritative Pricing & Archival
- Strike-off / archive status (`STRUCK_OFF`) preserves historical orders while preventing new purchases.
- Checkout validates current DB prices and inventory server-side (`/api/checkout/validate` and `/api/checkout/order`).

---

## 7. Google Forms-Style Survey Analytics

Survey analytics in the Admin Portal (`src/app/admin/surveys/page.tsx`) provides:
1. **Summary Metrics:** Total starts, completions, incomplete responses, completion rate %, unique respondents, average completion time (minutes), and survey start/end dates.
2. **Visualizations by Question Type:**
   - Single Choice / Dropdown / Yes-No: SVG Donut chart with percentages + color legend.
   - Multiple Choice: Horizontal bar chart with note explaining respondent share percentages.
   - Rating / Stars: Average score badge + star distribution tiers.
   - Text: Filterable list of real respondent submissions.
   - Numeric: Min, Max, Average, Median cards + value distribution.
3. **Filter Support:** Real-time filtering by status (`ALL`, `COMPLETED`, `IN_PROGRESS`, `DISQUALIFIED`) and date range (`startDate`, `endDate`).
4. **Individual Responses:** Paged viewer to step through each submission, inspect respondent info, and see exact submitted answers.
5. **CSV Export:** Streamed via `/api/admin/surveys/[id]/export`.

---

## 8. Mobile Launcher Branding

The exact official GharSure logo asset (`D:\Projects\GharSure\public\logo.jpeg`) has been deployed across:
- Flutter in-app asset: `assets/images/logo.jpeg`
- Android launcher mipmaps:
  - `mipmap-mdpi`: 48 x 48 px
  - `mipmap-hdpi`: 72 x 72 px
  - `mipmap-xhdpi`: 96 x 96 px
  - `mipmap-xxhdpi`: 144 x 144 px
  - `mipmap-xxxhdpi`: 192 x 192 px

---

## 9. Verification & Test Commands

### Web Test Suite (Vitest)
```powershell
Set-Location "D:\Projects\GharSure"
npm test
```
Runs 14 test suites covering auth, sequential ID generation, session handling, coin ledger, surveys, and cart synchronization.

### Flutter Test Suite
```powershell
& "D:\flutter\bin\flutter.bat" test
```
Runs Flutter widget and unit tests including `cart_sync_test.dart` and `quick_poll_test.dart`.
