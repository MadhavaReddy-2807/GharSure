import { describe, it, expect, beforeAll } from "vitest";
import { listAvailableVouchers, unlockVoucherWithCoins, validateVoucherForOrder } from "@/lib/voucher-db";
import { createOrder, getOrderById, listCustomerOrders } from "@/lib/order-db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";

describe("Vouchers, Cart and Checkout System", () => {
  let testCustomerId: string;
  let testProduct1: any;
  let testProduct2: any;
  let testTrialKit: any;

  beforeAll(async () => {
    if (isDirectDatabaseConfigured()) {
      const sql = getDirectSql();
      // Fetch or create a test customer
      const existing = await sql`SELECT id, reward_coins FROM customers LIMIT 1;`;
      if (existing && existing.length > 0) {
        testCustomerId = existing[0].id;
        // Ensure customer has some coins for testing
        await sql`UPDATE customers SET reward_coins = 200 WHERE id = ${testCustomerId};`;
      }

      // Fetch sample products
      const prods = await sql`SELECT id, title, price_inr, coin_price, product_type, inventory_stock FROM products LIMIT 5;`;
      testProduct1 = prods.find((p: any) => p.product_type !== "TRIAL") || prods[0];
      testProduct2 = prods.find((p: any) => p.id !== testProduct1.id && p.product_type !== "TRIAL") || prods[1];
      testTrialKit = prods.find((p: any) => p.product_type === "TRIAL") || prods[0];
    } else {
      testCustomerId = "test-cust-123";
    }
  });

  describe("1. Vouchers System", () => {
    it("lists available active vouchers from the database", async () => {
      const vouchers = await listAvailableVouchers(testCustomerId);
      expect(vouchers.length).toBeGreaterThanOrEqual(1);

      const pure50 = vouchers.find((v) => v.code === "PURE50OFF");
      expect(pure50).toBeDefined();
      expect(pure50?.coinCost).toBe(50);
      expect(pure50?.discountType).toBe("PERCENTAGE");
    });

    it("prevents unlocking when coins are insufficient", async () => {
      if (!isDirectDatabaseConfigured()) return;
      const sql = getDirectSql();

      // Temporarily set customer coins to 5
      await sql`UPDATE customers SET reward_coins = 5 WHERE id = ${testCustomerId};`;

      const result = await unlockVoucherWithCoins(testCustomerId, "PURE50OFF");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient");

      // Verify no coins were deducted
      const [cust] = await sql`SELECT reward_coins FROM customers WHERE id = ${testCustomerId};`;
      expect(cust.reward_coins).toBe(5);

      // Restore coins
      await sql`UPDATE customers SET reward_coins = 200 WHERE id = ${testCustomerId};`;
    });

    it("successfully unlocks voucher when coins are sufficient and records in ledger", async () => {
      if (!isDirectDatabaseConfigured()) return;
      const sql = getDirectSql();

      const [custBefore] = await sql`SELECT reward_coins FROM customers WHERE id = ${testCustomerId};`;
      const initialCoins = custBefore.reward_coins;

      // Clean any existing unlocked PURE50OFF for this test customer
      await sql`
        DELETE FROM customer_vouchers 
        WHERE customer_id = ${testCustomerId} AND code = 'PURE50OFF';
      `;

      const result = await unlockVoucherWithCoins(testCustomerId, "PURE50OFF");
      expect(result.success).toBe(true);
      expect(result.voucher?.code).toBe("PURE50OFF");
      expect(result.voucher?.isUnlocked).toBe(true);

      // Check updated customer balance
      const [custAfter] = await sql`SELECT reward_coins FROM customers WHERE id = ${testCustomerId};`;
      expect(custAfter.reward_coins).toBe(initialCoins - 50);

      // Verify transaction ledger entry exists
      const txRows = await sql`
        SELECT * FROM coin_transactions 
        WHERE customer_id = ${testCustomerId} AND type = 'VOUCHER_UNLOCK'
        ORDER BY created_at DESC LIMIT 1;
      `;
      expect(txRows.length).toBe(1);
      expect(txRows[0].amount).toBe(-50);
    });

    it("prevents double-unlock of an active unlocked voucher", async () => {
      if (!isDirectDatabaseConfigured()) return;
      const result = await unlockVoucherWithCoins(testCustomerId, "PURE50OFF");
      expect(result.success).toBe(false);
      expect(result.error).toContain("already unlocked");
    });

    it("validates unlocked voucher and calculates discount correctly", async () => {
      if (!isDirectDatabaseConfigured()) return;
      const subtotal = 1000;
      const check = await validateVoucherForOrder(testCustomerId, "PURE50OFF", subtotal);
      expect(check.valid).toBe(true);
      expect(check.discountInr).toBe(500); // 50% of 1000
    });
  });

  describe("2. Order Creation & Authoritative Calculations", () => {
    it("creates pure coin order (0 INR) and confirms immediately", async () => {
      if (!isDirectDatabaseConfigured() || !testTrialKit) return;
      const sql = getDirectSql();

      // Ensure stock is available
      await sql`UPDATE products SET inventory_stock = 25 WHERE id = ${testTrialKit.id};`;

      const orderResult = await createOrder({
        customerId: testCustomerId,
        items: [{ productId: testTrialKit.id, quantity: 1 }],
        shippingName: "Madhava Reddy",
        shippingPhone: "+919876543210",
        shippingAddress: "Flat 301, Brigade Gateway",
        shippingCity: "Bengaluru",
        shippingPincode: "560055",
      });

      expect(orderResult.success).toBe(true);
      expect(orderResult.order).toBeDefined();
      expect(orderResult.order?.orderNumber).toMatch(/^GS-ORD-/);

      // Stock was decremented
      const [updatedProduct] = await sql`SELECT inventory_stock FROM products WHERE id = ${testTrialKit.id};`;
      expect(updatedProduct.inventory_stock).toBe(24);
    });

    it("creates INR order with voucher discount and enforces payment boundary", async () => {
      if (!isDirectDatabaseConfigured() || !testProduct1) return;

      const orderResult = await createOrder({
        customerId: testCustomerId,
        items: [{ productId: testProduct1.id, quantity: 2 }],
        shippingName: "Test Homeowner",
        shippingPhone: "+919876543210",
        shippingAddress: "Villa 14, Prestige Silver Crest",
        shippingCity: "Bengaluru",
        shippingPincode: "560103",
        voucherCode: "PURE50OFF",
      });

      expect(orderResult.success).toBe(true);
      expect(orderResult.order).toBeDefined();
      expect(orderResult.order?.discountInr).toBeGreaterThan(0);
      expect(orderResult.paymentRequired).toBe(true);

      // Payment gateway boundary verified: provider configured matches process.env
      expect(orderResult.paymentProvider).toBeDefined();
      expect(orderResult.paymentProvider?.provider).toBe("Razorpay");
      if (!process.env.RAZORPAY_KEY_ID) {
        expect(orderResult.paymentProvider?.configured).toBe(false);
        expect(orderResult.paymentProvider?.missingKeys).toContain("RAZORPAY_KEY_ID");
      }
    });

    it("retrieves order details and order history by customer ID", async () => {
      if (!isDirectDatabaseConfigured()) return;
      const customerOrders = await listCustomerOrders(testCustomerId);
      expect(customerOrders.length).toBeGreaterThanOrEqual(1);

      const firstOrder = customerOrders[0];
      expect(firstOrder.orderNumber).toBeDefined();
      expect(firstOrder.items).toBeDefined();

      const fetchedById = await getOrderById(firstOrder.id, testCustomerId);
      expect(fetchedById).not.toBeNull();
      expect(fetchedById?.orderNumber).toBe(firstOrder.orderNumber);
    });

    it("rejects order creation when stock is insufficient", async () => {
      if (!isDirectDatabaseConfigured() || !testProduct1) return;
      const sql = getDirectSql();

      // Temporarily set stock to 1
      await sql`UPDATE products SET inventory_stock = 1 WHERE id = ${testProduct1.id};`;

      const result = await createOrder({
        customerId: testCustomerId,
        items: [{ productId: testProduct1.id, quantity: 5 }],
        shippingName: "Test User",
        shippingPhone: "+919876543210",
        shippingAddress: "Road 12",
        shippingCity: "Bengaluru",
        shippingPincode: "560001",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient stock");

      // Restore stock
      await sql`UPDATE products SET inventory_stock = 50 WHERE id = ${testProduct1.id};`;
    });
  });
});
