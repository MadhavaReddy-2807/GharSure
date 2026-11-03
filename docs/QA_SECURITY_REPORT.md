# GharSure Security & Authorization Audit Report

**Audit Target:** `D:\Projects\GharSure` Web & API Endpoints  
**Classification:** Internal Security Assessment  

---

## 1. Access Control & Authorization (RBAC)

1. **Admin Route Protection:**
   - Middleware: `src/middleware.ts` enforces authentication checks for `/admin/*` routes.
   - Server Actions / APIs: `/api/admin/*` endpoints explicitly verify the session claims against the `admin_users` table before executing CRUD operations or ledger adjustments.
   - Result: Non-admin users receiving a session token cannot invoke admin endpoints.

2. **Row-Level Security (RLS) & Customer Boundary:**
   - Private storage bucket `submissions` (for uploaded TDS reports / power bills) restricts public read access.
   - Signed URLs with expiration are required to preview or inspect submitted documents.
   - Customer data access: Customer queries filter strictly by `session.customerId`.

3. **Input Sanitization & Injection Prevention:**
   - Parameterized queries via Postgres tagged template literals (`sql`...) in `direct-db.ts` protect against SQL injection.
   - File uploads: Strict MIME type validation (`.pdf`, `.png`, `.jpg`, `.webp`) and server-side file size restrictions prevent arbitrary file uploads.

---

## 2. Secrets & Client-Side Leakage Prevention

- Client bundles inspected: Zero database connection strings, service role keys, or Razorpay secret keys leaked to the browser.
- Only public variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are bundled into client assets.
