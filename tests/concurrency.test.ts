import { describe, it, expect, beforeEach } from "vitest";
import { inMemoryDb, getOrCreateCustomer } from "../src/lib/supabase/db";

describe("Customer ID Allocation & Concurrency Safety", () => {
  beforeEach(() => {
    inMemoryDb.reset();
  });

  it("assigns sequential, padded customer IDs (e.g. GH000001, GH000002)", async () => {
    const c1 = await getOrCreateCustomer("+919876500001");
    const c2 = await getOrCreateCustomer("+919876500002");
    const c3 = await getOrCreateCustomer("+919876500003");

    expect(c1.customer_id).toBe("GH000001");
    expect(c2.customer_id).toBe("GH000002");
    expect(c3.customer_id).toBe("GH000003");
  });

  it("handles simultaneous concurrent signups without collisions or duplicate IDs", async () => {
    const totalConcurrent = 25;
    const promises = Array.from({ length: totalConcurrent }, (_, i) => {
      const phone = `+9198000000${String(i).padStart(2, "0")}`;
      return getOrCreateCustomer(phone);
    });

    const customers = await Promise.all(promises);

    expect(customers).toHaveLength(totalConcurrent);

    // Verify all IDs are unique
    const idSet = new Set(customers.map((c) => c.customer_id));
    expect(idSet.size).toBe(totalConcurrent);

    // Verify format for every ID
    customers.forEach((c) => {
      expect(c.customer_id).toMatch(/^GH\d{6}$/);
    });
  });

  it("duplicate phone numbers do not create duplicate accounts or consume new sequence IDs", async () => {
    const phone = "+919999988888";

    // First signup
    const first = await getOrCreateCustomer(phone);
    expect(first.customer_id).toBe("GH000001");

    // Second call for same phone
    const second = await getOrCreateCustomer(phone);
    expect(second.customer_id).toBe("GH000001");
    expect(second.id).toBe(first.id);

    // Next new customer gets GH000002
    const third = await getOrCreateCustomer("+919999977777");
    expect(third.customer_id).toBe("GH000002");
  });
});
