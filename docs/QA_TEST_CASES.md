# GharSure Comprehensive QA Test Cases Inventory

## 1. Authentication & Onboarding (AUTH)

| Test ID | Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **AUTH-001** | Standard 10-digit OTP Login | User has mobile phone | 1. Enter `9876543210`<br>2. Receive OTP<br>3. Verify OTP | Session cookie established, redirected to `/home` or onboarding | **PASS** |
| **AUTH-002** | OTP with +91 country prefix & spaces | Phone formatted `+91 98765-43210` | Enter phone with prefix | Cleaned to 10 digits (`9876543210`), OTP delivered | **PASS** |
| **AUTH-003** | Invalid OTP code | Phone entered | Enter incorrect 6-digit OTP | Error displayed: "Invalid verification code", attempts restricted | **PASS** |
| **AUTH-004** | Rate Limiting on OTP Requests | Repeated OTP clicks | Click "Send OTP" 6 times rapidly | 429 Too Many Requests response, countdown timer enforced | **PASS** |
| **AUTH-005** | Identity Uniqueness | Existing verified phone | Re-login with same phone | Existing `customerId` & `reward_coins` loaded; no duplicate rows | **PASS** |

---

## 2. Coin Ledger & Financial Invariants (COIN)

| Test ID | Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **COIN-001** | Survey Completion Reward Credit | Survey with 50 coins reward | Complete all required questions & submit | +50 coins credited with unique transaction ID; balance updated | **PASS** |
| **COIN-002** | Duplicate Survey Reward Prevention | Completed survey | Attempt resubmission of same survey | 400 Bad Request: "Survey already completed"; zero additional coins | **PASS** |
| **COIN-003** | Quick Poll Explicit Vote Credit | Open poll with 15 coins reward | Select option & click "Submit Answer" | +15 coins credited; poll marked completed; no double vote | **PASS** |
| **COIN-004** | Voucher Unlock Debit | User has 100 coins, voucher costs 60 | Click "Unlock Voucher" | -60 coins deducted, voucher code revealed, balance becomes 40 | **PASS** |
| **COIN-005** | Insufficient Balance Debit Block | User has 20 coins, voucher costs 50 | Attempt to unlock voucher | Error: "Insufficient coins", zero deduction, balance unchanged | **PASS** |
| **COIN-006** | Negative Balance Prevention | Concurrent debit requests | Send 2 simultaneous unlock requests | Database constraint prevents negative balance; atomic transaction | **PASS** |

---

## 3. Store, Cart & Checkout (COMM)

| Test ID | Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **COMM-001** | Two-Column Desktop Product Drawer | Desktop browser (`>= 1024px`) | Click on store product card | Wide 2-column drawer slides in from left; specs & image aligned | **PASS** |
| **COMM-002** | Product Detail Quantity Stepper | Product selected | Increase quantity from 1 to 3, click Add to Cart | 3 units added to cart with correct price multiplication | **PASS** |
| **COMM-003** | Cart Line Item Stepper & Subtotal | Items in cart | Adjust quantity in `CartDrawer` | Subtotal updates dynamically; server-authoritative calculations | **PASS** |
| **COMM-004** | Escape Key Dismiss on Overlays | Drawer / Modal open | Press `Escape` key | Overlay closes cleanly, background scroll unlocked | **PASS** |
| **COMM-005** | Checkout Address Validation | Empty required fields in checkout | Click "Place Order" without name/phone | Inline validation messages displayed; submission prevented | **PASS** |

---

## 4. File & Document Uploads (UPLD)

| Test ID | Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **UPLD-001** | Valid PDF Document Submission | Open upload activity | Drag & drop PDF `<= 5MB` | Filename & size shown, submitted to admin review queue | **PASS** |
| **UPLD-002** | Photo Upload with Live Thumbnail | Image file (`.jpg`, `.png`) | Select image file | Live image preview displayed before submission; replace button works | **PASS** |
| **UPLD-003** | Oversized File Rejection | File `> 10MB` | Attempt upload | Error displayed: "File exceeds maximum size"; upload blocked | **PASS** |
| **UPLD-004** | Admin Review & Approval Credit | Pending file submission | Admin approves submission in `/admin/rewards` | User awarded configured coins; status updated to APPROVED | **PASS** |
