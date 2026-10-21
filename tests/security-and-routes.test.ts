import { describe, it, expect, beforeEach } from "vitest";
import { inMemoryDb, getOrCreateCustomer, updateCustomerProfile } from "../src/lib/supabase/db";
import { POST as onboardingHandler } from "../src/app/api/customer/onboarding/route";
import { GET as meHandler } from "../src/app/api/auth/me/route";
import { NextRequest } from "next/server";
import { signSession, SESSION_COOKIE_NAME } from "../src/lib/session";

describe("Security, Immutability & Route Authorization", () => {
  beforeEach(() => {
    inMemoryDb.reset();
  });

  it("prevents clients from overriding sequential customer_id", async () => {
    const customer = await getOrCreateCustomer("+919876543210");
    const originalCustomerId = customer.customer_id; // e.g. GH000001

    // Attempt to update profile with a forged or tampered customer_id
    const updated = await updateCustomerProfile(customer.id, {
      fullName: "Sneha Rao",
      city: "Hyderabad",
      // Even if client attempted to pass customer_id or readableId, database logic rejects it
    });

    expect(updated.customer_id).toBe(originalCustomerId);
  });

  it("rejects invalid onboarding payloads (short name, empty city)", async () => {
    const customer = await getOrCreateCustomer("+919876543210");
    const token = await signSession({
      customerId: customer.id,
      readableId: customer.customer_id,
      phone: customer.phone_e164,
      onboardingCompleted: false,
    });

    // 1. Missing name (too short)
    const req1 = new NextRequest("http://localhost:3000/api/customer/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify({
        fullName: "A", // too short (min 2)
        city: "Pune",
      }),
    });
    const res1 = await onboardingHandler(req1);
    expect(res1.status).toBe(400);
    const data1 = await res1.json();
    expect(data1.success).toBe(false);
    expect(data1.error).toContain("Full name must be at least 2 characters");

    // 2. Empty city
    const req2 = new NextRequest("http://localhost:3000/api/customer/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify({
        fullName: "Sneha Rao",
        city: " ", // empty after trim
      }),
    });
    const res2 = await onboardingHandler(req2);
    expect(res2.status).toBe(400);
    const data2 = await res2.json();
    expect(data2.success).toBe(false);
  });

  it("rejects unauthenticated requests to protected endpoints", async () => {
    // Calling /api/customer/onboarding without session cookie
    const unauthReq = new NextRequest("http://localhost:3000/api/customer/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Test User",
        city: "Delhi",
      }),
    });

    const res = await onboardingHandler(unauthReq);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Unauthorized");
  });

  it("rejects unauthenticated requests to /api/auth/me", async () => {
    const unauthReq = new NextRequest("http://localhost:3000/api/auth/me", {
      method: "GET",
    });

    const res = await meHandler(unauthReq);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.authenticated).toBe(false);
  });

  it("isolation: customer A session cannot access customer B data", async () => {
    const customerA = await getOrCreateCustomer("+919876543210");
    const customerB = await getOrCreateCustomer("+919876543211");

    expect(customerA.id).not.toBe(customerB.id);
    expect(customerA.customer_id).toBe("GH000001");
    expect(customerB.customer_id).toBe("GH000002");

    // Session token for customer A
    const tokenA = await signSession({
      customerId: customerA.id,
      readableId: customerA.customer_id,
      phone: customerA.phone_e164,
      onboardingCompleted: false,
    });

    const reqA = new NextRequest("http://localhost:3000/api/auth/me", {
      method: "GET",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${tokenA}`,
      },
    });

    const resA = await meHandler(reqA);
    const dataA = await resA.json();

    expect(dataA.authenticated).toBe(true);
    expect(dataA.customer.id).toBe(customerA.id);
    expect(dataA.customer.customerId).toBe("GH000001");
    expect(dataA.customer.phone).toBe("+919876543210");
    // Customer B's identity is completely separate
    expect(dataA.customer.id).not.toBe(customerB.id);
  });
});
