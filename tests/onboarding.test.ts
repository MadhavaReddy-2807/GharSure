import { describe, it, expect, beforeEach } from "vitest";
import { inMemoryDb, getOrCreateCustomer, updateCustomerProfile, getCustomerById } from "../src/lib/supabase/db";

describe("Onboarding Profile Completion", () => {
  beforeEach(() => {
    inMemoryDb.reset();
  });

  it("updates customer profile and sets onboarding_completed to true", async () => {
    const testPhone = `+9198${Date.now().toString().slice(-8)}`;
    const customer = await getOrCreateCustomer(testPhone);
    expect(customer.onboarding_completed).toBe(false);
    expect(customer.full_name).toBeNull();

    const updated = await updateCustomerProfile(customer.id, {
      fullName: "Anindya Roy",
      city: "Bangalore",
      displayName: "Anindya",
    });

    expect(updated.onboarding_completed).toBe(true);
    expect(updated.full_name).toBe("Anindya Roy");
    expect(updated.city).toBe("Bangalore");
    expect(updated.display_name).toBe("Anindya");
    expect(updated.customer_id).toBe(customer.customer_id); // customer_id preserved!
  });

  it("allows retrieving the updated profile by customer id", async () => {
    const testPhone = `+9197${Date.now().toString().slice(-8)}`;
    const customer = await getOrCreateCustomer(testPhone);
    await updateCustomerProfile(customer.id, {
      fullName: "Priya Sharma",
      city: "Mumbai",
    });

    const fetched = await getCustomerById(customer.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.full_name).toBe("Priya Sharma");
    expect(fetched?.city).toBe("Mumbai");
    expect(fetched?.onboarding_completed).toBe(true);
  });
});
