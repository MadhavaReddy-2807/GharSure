import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { getCustomerById } from "@/lib/supabase/db";

export interface VoucherRecord {
  id: string;
  code: string;
  title: string;
  description: string;
  partner: string;
  discountType: "PERCENTAGE" | "FLAT_INR" | "FREE_PASS";
  discountValue: number;
  minOrderInr: number;
  coinCost: number;
  validityDays: number;
  status: string;
  isUnlocked?: boolean;
  unlockedAt?: string;
  expiresAt?: string;
  isRedeemed?: boolean;
}

// In-memory fallback state
const inMemoryVouchers: VoucherRecord[] = [
  {
    id: "vouch-01",
    code: "PURE50OFF",
    title: "50% Off Annual Maintenance & Filter Care",
    description: "Applicable on comprehensive home maintenance services across certified technicians.",
    partner: "PureCare Network",
    discountType: "PERCENTAGE",
    discountValue: 50,
    minOrderInr: 500,
    coinCost: 50,
    validityDays: 30,
    status: "ACTIVE",
  },
  {
    id: "vouch-02",
    code: "FREEHOMEPASS",
    title: "Complimentary Doorstep Home Diagnostic Pass",
    description: "Includes complete household inspection by a certified technician at zero charge.",
    partner: "GharSure Home Services",
    discountType: "FREE_PASS",
    discountValue: 100,
    minOrderInr: 0,
    coinCost: 25,
    validityDays: 60,
    status: "ACTIVE",
  },
  {
    id: "vouch-03",
    code: "GHARCARE300",
    title: "₹300 Off Whole-House Care Kit",
    description: "Redeemable against any home appliance or kitchen care installation package.",
    partner: "GharSure Essentials",
    discountType: "FLAT_INR",
    discountValue: 300,
    minOrderInr: 1000,
    coinCost: 75,
    validityDays: 45,
    status: "ACTIVE",
  },
];

const inMemoryCustomerVouchers = new Map<string, Array<{
  voucherId: string;
  code: string;
  unlockedAt: string;
  expiresAt: string;
  isRedeemed: boolean;
}>>();

export async function listAvailableVouchers(customerId?: string): Promise<VoucherRecord[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        SELECT 
          v.id, v.code, v.title, v.description, v.partner,
          v.discount_type, v.discount_value, v.min_order_inr,
          v.coin_cost, v.validity_days, v.status,
          cv.id AS customer_voucher_id,
          cv.unlocked_at,
          cv.expires_at,
          cv.status AS customer_voucher_status
        FROM vouchers v
        LEFT JOIN customer_vouchers cv 
          ON cv.voucher_id = v.id 
          AND cv.customer_id::text = ${customerId || ""}
          AND cv.status = 'UNLOCKED'
          AND cv.expires_at > NOW()
        WHERE v.status = 'ACTIVE'
        ORDER BY v.coin_cost ASC;
      `;

      return rows.map((r: any) => ({
        id: r.id,
        code: r.code,
        title: r.title,
        description: r.description,
        partner: r.partner,
        discountType: r.discount_type,
        discountValue: Number(r.discount_value),
        minOrderInr: Number(r.min_order_inr),
        coinCost: Number(r.coin_cost),
        validityDays: Number(r.validity_days),
        status: r.status,
        isUnlocked: Boolean(r.customer_voucher_id),
        unlockedAt: r.unlocked_at ? new Date(r.unlocked_at).toISOString() : undefined,
        expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : undefined,
        isRedeemed: r.customer_voucher_status === "REDEEMED",
      }));
    } catch (err: any) {
      console.warn("[VoucherDB] Error listing vouchers from DB:", err.message);
    }
  }

  // Fallback
  const userUnlocked = customerId ? inMemoryCustomerVouchers.get(customerId) || [] : [];
  return inMemoryVouchers.map((v) => {
    const un = userUnlocked.find((u) => u.voucherId === v.id);
    return {
      ...v,
      isUnlocked: Boolean(un),
      unlockedAt: un?.unlockedAt,
      expiresAt: un?.expiresAt,
      isRedeemed: Boolean(un?.isRedeemed),
    };
  });
}

export async function unlockVoucherWithCoins(
  customerId: string,
  voucherId: string
): Promise<{ success: boolean; error?: string; voucher?: VoucherRecord; newBalance?: number }> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      return await sql.begin(async (tx: any) => {
        // 1. Lock customer row to check and deduct coins atomically
        const customers = await tx`
          SELECT id, reward_coins, full_name, phone_e164
          FROM customers
          WHERE id::text = ${customerId} OR customer_id = ${customerId}
          FOR UPDATE;
        `;

        if (!customers || customers.length === 0) {
          return { success: false, error: "Customer not found." };
        }

        const customer = customers[0];
        const currentBalance = Number(customer.reward_coins) || 0;

        // 2. Lock voucher row
        const vouchers = await tx`
          SELECT id, code, title, description, partner, discount_type, discount_value, min_order_inr, coin_cost, validity_days, status
          FROM vouchers
          WHERE id::text = ${voucherId} OR code = ${voucherId}
          FOR UPDATE;
        `;

        if (!vouchers || vouchers.length === 0) {
          return { success: false, error: "Voucher not found." };
        }

        const voucher = vouchers[0];
        if (voucher.status !== "ACTIVE") {
          return { success: false, error: "This voucher is no longer active." };
        }

        const coinCost = Number(voucher.coin_cost) || 0;

        // 3. Check if already unlocked and not expired
        const existing = await tx`
          SELECT id, status, expires_at
          FROM customer_vouchers
          WHERE customer_id = ${customer.id} 
            AND voucher_id = ${voucher.id}
            AND status = 'UNLOCKED'
            AND expires_at > NOW();
        `;

        if (existing && existing.length > 0) {
          return {
            success: false,
            error: `You have already unlocked the "${voucher.title}" voucher. It is active and ready to use in your cart!`,
          };
        }

        // 4. Validate sufficient balance
        if (currentBalance < coinCost) {
          return {
            success: false,
            error: `Insufficient coins. Unlocking requires ${coinCost} coins, but your balance is ${currentBalance} coins. Complete surveys to earn more coins!`,
          };
        }

        const newBalance = currentBalance - coinCost;

        // 5. Calculate expiration date
        const validityDays = Number(voucher.validity_days) || 30;
        const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

        // 6. Record coin deduction in coin_transactions
        const idempotencyKey = `voucher_unlock_${customer.id}_${voucher.id}_${Date.now()}`;
        await tx`
          INSERT INTO coin_transactions (
            customer_id, amount, type, description, idempotency_key, metadata
          )
          VALUES (
            ${customer.id},
            ${-coinCost},
            'VOUCHER_UNLOCK',
            ${`Unlocked voucher: ${voucher.title} (${voucher.code})`},
            ${idempotencyKey},
            ${JSON.stringify({
              voucherId: voucher.id,
              voucherCode: voucher.code,
              coinCost,
              validityDays,
            })}::jsonb
          );
        `;

        // 7. Update customer balance
        await tx`
          UPDATE customers
          SET reward_coins = ${newBalance}, updated_at = NOW()
          WHERE id = ${customer.id};
        `;

        // 8. Insert into customer_vouchers entitlement
        await tx`
          INSERT INTO customer_vouchers (
            customer_id, voucher_id, code, status, unlocked_at, expires_at, idempotency_key
          )
          VALUES (
            ${customer.id},
            ${voucher.id},
            ${voucher.code},
            'UNLOCKED',
            NOW(),
            ${expiresAt},
            ${idempotencyKey}
          );
        `;

        return {
          success: true,
          newBalance,
          voucher: {
            id: voucher.id,
            code: voucher.code,
            title: voucher.title,
            description: voucher.description,
            partner: voucher.partner,
            discountType: voucher.discount_type,
            discountValue: Number(voucher.discount_value),
            minOrderInr: Number(voucher.min_order_inr),
            coinCost,
            validityDays,
            status: voucher.status,
            isUnlocked: true,
            expiresAt: expiresAt.toISOString(),
          },
        };
      });
    } catch (err: any) {
      console.error("[VoucherDB] Error unlocking voucher:", err);
      return { success: false, error: err.message || "Failed to unlock voucher" };
    }
  }

  // Fallback
  const v = inMemoryVouchers.find((item) => item.id === voucherId || item.code === voucherId);
  if (!v) return { success: false, error: "Voucher not found" };

  const customer = await getCustomerById(customerId);
  if (!customer) return { success: false, error: "Customer not found" };

  const currentBalance = customer.reward_coins || 0;
  if (currentBalance < v.coinCost) {
    return {
      success: false,
      error: `Insufficient coins. Requires ${v.coinCost} coins, but your balance is ${currentBalance} coins.`,
    };
  }

  customer.reward_coins = currentBalance - v.coinCost;
  const expiresAt = new Date(Date.now() + v.validityDays * 24 * 60 * 60 * 1000).toISOString();
  const userList = inMemoryCustomerVouchers.get(customerId) || [];
  userList.push({
    voucherId: v.id,
    code: v.code,
    unlockedAt: new Date().toISOString(),
    expiresAt,
    isRedeemed: false,
  });
  inMemoryCustomerVouchers.set(customerId, userList);

  return {
    success: true,
    newBalance: customer.reward_coins,
    voucher: { ...v, isUnlocked: true, expiresAt },
  };
}

export async function validateVoucherForOrder(
  customerId: string,
  voucherCode: string,
  subtotalInr: number
): Promise<{
  valid: boolean;
  error?: string;
  discountInr: number;
  voucherId?: string;
  voucherCode?: string;
}> {
  if (!voucherCode.trim()) {
    return { valid: false, error: "Voucher code required", discountInr: 0 };
  }

  const code = voucherCode.trim().toUpperCase();

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        SELECT 
          cv.id AS customer_voucher_id,
          cv.status,
          cv.expires_at,
          v.id AS voucher_id,
          v.code,
          v.title,
          v.discount_type,
          v.discount_value,
          v.min_order_inr
        FROM customer_vouchers cv
        JOIN vouchers v ON v.id = cv.voucher_id
        WHERE cv.customer_id::text = ${customerId}
          AND UPPER(v.code) = ${code}
          AND cv.status = 'UNLOCKED'
        ORDER BY cv.unlocked_at DESC
        LIMIT 1;
      `;

      if (!rows || rows.length === 0) {
        return {
          valid: false,
          error: "Voucher not unlocked or not found. Please unlock this voucher with coins in the Store first.",
          discountInr: 0,
        };
      }

      const row = rows[0];
      if (new Date(row.expires_at) < new Date()) {
        return { valid: false, error: "This voucher has expired.", discountInr: 0 };
      }

      const minOrder = Number(row.min_order_inr) || 0;
      if (subtotalInr < minOrder) {
        return {
          valid: false,
          error: `Minimum order amount of ₹${minOrder} required to apply this voucher. Current cart subtotal is ₹${subtotalInr}.`,
          discountInr: 0,
        };
      }

      let discountInr = 0;
      if (row.discount_type === "PERCENTAGE") {
        discountInr = (subtotalInr * Number(row.discount_value)) / 100;
      } else if (row.discount_type === "FLAT_INR") {
        discountInr = Math.min(subtotalInr, Number(row.discount_value));
      } else if (row.discount_type === "FREE_PASS") {
        discountInr = subtotalInr;
      }

      return {
        valid: true,
        discountInr: Math.round(discountInr * 100) / 100,
        voucherId: row.voucher_id,
        voucherCode: row.code,
      };
    } catch (err: any) {
      console.warn("[VoucherDB] Error validating voucher:", err.message);
    }
  }

  // Fallback
  const v = inMemoryVouchers.find((i) => i.code.toUpperCase() === code);
  if (!v) return { valid: false, error: "Invalid voucher code", discountInr: 0 };

  const userUnlocked = inMemoryCustomerVouchers.get(customerId) || [];
  const found = userUnlocked.find((u) => u.code.toUpperCase() === code && !u.isRedeemed);
  if (!found) {
    return { valid: false, error: "Voucher has not been unlocked with coins yet.", discountInr: 0 };
  }

  let discount = 0;
  if (v.discountType === "PERCENTAGE") {
    discount = (subtotalInr * v.discountValue) / 100;
  } else if (v.discountType === "FLAT_INR") {
    discount = Math.min(subtotalInr, v.discountValue);
  }

  return { valid: true, discountInr: discount, voucherId: v.id, voucherCode: v.code };
}
