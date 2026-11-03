# GharSure Master QA & Test Automation Plan

**Target Application:** GharSure Web (`D:\Projects\GharSure`) & Native Flutter App (`D:\Projects\GharSure App`)  
**Production URL:** https://ghar-sure-sand.vercel.app/  
**QA Lead:** Principal QA Automation & Security Architect  
**Version:** 2.0.0-PROD  

---

## 1. Scope & System Architecture

GharSure is an integrated residential commerce, survey research, and rewards ecosystem. The application components under test:
- **Customer Web Application (`src/app/(main)`)**: Home, Store, Rewards, Refer & Win, Profile, Cart, Checkout.
- **Admin Management Portal (`src/app/admin`)**: Analytics, Users, Store Catalog, Surveys, Rewards & Activities Review, Communications, Buildings, Audit Logs.
- **Native Android Application (`lib/`)**: Cross-platform feature parity with shared Supabase PostgreSQL backend.
- **Backend & Database Infrastructure**: Direct Postgres queries, Supabase RLS, Ledger triggers, and Signed Storage.

---

## 2. Test Execution Matrix

| Test Suite ID | Domain / Module | Target Routes / APIs | Execution Type | Priority |
|---|---|---|---|---|
| **AUTH-01** | OTP Authentication & Identity | `/api/auth/send-otp`, `/api/auth/verify-otp`, `/auth` | Automated API & E2E | P0 |
| **COIN-01** | Coin Ledger & Wallet Invariants | `/api/admin/rewards`, `/api/rewards/activities/*` | Database & Invariant | P0 |
| **STOR-01** | Store, Products & Merchandising | `/store`, `/api/admin/store`, `/api/store/redeem` | E2E & Functional | P1 |
| **CART-01** | Cart Synchronization & Quantities | `/api/cart`, `CartDrawer` | E2E & Unit | P1 |
| **CHCK-01** | Checkout, Orders & Idempotency | `/checkout`, `/api/checkout/*` | E2E & Integration | P0 |
| **SURV-01** | Survey Engine & Branching Logic | `/surveys/[id]`, `/api/surveys/*` | Form & Logic | P1 |
| **POLL-01** | Quick Polls (Explicit Submission) | `/api/rewards/activities/polls/*` | Functional & Concurrency | P2 |
| **UPLD-01** | File & Image Uploads (Storage) | `/api/rewards/activities/files/*`, `/api/admin/upload` | Security & Mime Check | P1 |
| **VOCH-01** | Voucher Unlocking & Checkout Apply | `/api/vouchers/*` | Business Invariant | P1 |
| **REFR-01** | Referral Codes & Attribution | `/refer`, `/api/referral/*` | Attribution & E2E | P1 |
| **SECR-01** | RLS, Authorization & Security | All `/api/admin/*` & User Tables | Penetration & RLS | P0 |
| **SYNC-01** | Cross-Platform Sync (Web <-> Android)| Supabase DB & Storage | Cross-Device Sync | P0 |

---

## 3. Financial & Ledger Invariant Formulas

For any given customer $i$, let:
- Initial Balance: $B_0$
- Sum of Valid Credits: $\sum C$ (Surveys, Polls, Approved Uploads, Referrals, Admin Credits)
- Sum of Valid Debits: $\sum D$ (Voucher Unlocks, Admin Debits)

$$\text{Current Balance } B_t = B_0 + \sum C - \sum D$$

**Mandatory Invariants:**
1. $B_t \ge 0$ (Balance can never be negative).
2. $\forall C_k, \text{idempotency\_key is unique}$.
3. Voucher unlocking and voucher application at checkout are separate operations; coins are never deducted twice.
4. An unpaid order never triggers cart clearing or order confirmation.
