import { describe, it, expect } from "vitest";
import {
  hashAdminPassword,
  verifyAdminPassword,
  signAdminSession,
  verifyAdminSession,
  hasAdminPermission,
  ROLE_PERMISSIONS,
  AdminRole,
} from "../src/lib/admin-auth";

describe("Admin Authentication & PBKDF2 Security", () => {
  it("generates a valid PBKDF2 salt and hash, and verifies correctly", () => {
    const rawPassword = "GharSureAdmin@2026!";
    const storedHash = hashAdminPassword(rawPassword);

    expect(storedHash).toContain(":");
    const [salt, hash] = storedHash.split(":");
    expect(salt).toHaveLength(32); // 16 bytes in hex
    expect(hash).toHaveLength(128); // 64 bytes in hex

    // Correct password verifies
    expect(verifyAdminPassword(rawPassword, storedHash)).toBe(true);

    // Incorrect passwords fail
    expect(verifyAdminPassword("WrongPassword123!", storedHash)).toBe(false);
    expect(verifyAdminPassword("gharsureadmin@2026!", storedHash)).toBe(false);
    expect(verifyAdminPassword("", storedHash)).toBe(false);
  });

  it("fails gracefully on malformed hash strings", () => {
    expect(verifyAdminPassword("test", "malformed_string_without_colon")).toBe(false);
    expect(verifyAdminPassword("test", "")).toBe(false);
  });
});

describe("Admin JWT Sessions & Lifecycle", () => {
  it("signs and verifies an active administrator session token", async () => {
    const payload = {
      adminId: "11111111-2222-3333-4444-555555555555",
      email: "admin@gharsure.com",
      fullName: "GharSure Super Admin",
      role: "SUPER_ADMIN" as AdminRole,
      status: "ACTIVE" as const,
    };

    const token = await signAdminSession(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const verified = await verifyAdminSession(token);
    expect(verified).not.toBeNull();
    expect(verified?.adminId).toBe(payload.adminId);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.role).toBe("SUPER_ADMIN");
    expect(verified?.status).toBe("ACTIVE");
  });

  it("rejects suspended or deactivated administrators", async () => {
    const suspendedPayload = {
      adminId: "11111111-2222-3333-4444-555555555555",
      email: "suspended@gharsure.com",
      fullName: "Suspended Admin",
      role: "OPERATIONS_ADMIN" as AdminRole,
      status: "SUSPENDED" as const,
    };

    const token = await signAdminSession(suspendedPayload);
    const verified = await verifyAdminSession(token);
    // Suspended admin token should be rejected
    expect(verified).toBeNull();
  });

  it("rejects malformed or forged tokens", async () => {
    expect(await verifyAdminSession("invalid.jwt.token")).toBeNull();
    expect(await verifyAdminSession("")).toBeNull();
  });
});

describe("Role-Based Access Control (RBAC) Permissions Matrix", () => {
  it("grants Super Admin full platform capabilities", () => {
    expect(hasAdminPermission("SUPER_ADMIN", "access:manage")).toBe(true);
    expect(hasAdminPermission("SUPER_ADMIN", "users:write")).toBe(true);
    expect(hasAdminPermission("SUPER_ADMIN", "surveys:publish")).toBe(true);
    expect(hasAdminPermission("SUPER_ADMIN", "rewards:write")).toBe(true);
    expect(hasAdminPermission("SUPER_ADMIN", "settings:write")).toBe(true);
    expect(hasAdminPermission("SUPER_ADMIN", "analytics:export")).toBe(true);
  });

  it("restricts Operations Admin from administrative user management", () => {
    // Operations admin can manage users, surveys, rewards, but NOT manage admin access/roles
    expect(hasAdminPermission("OPERATIONS_ADMIN", "users:write")).toBe(true);
    expect(hasAdminPermission("OPERATIONS_ADMIN", "surveys:write")).toBe(true);
    expect(hasAdminPermission("OPERATIONS_ADMIN", "rewards:write")).toBe(true);
    expect(hasAdminPermission("OPERATIONS_ADMIN", "access:manage")).toBe(false);
    expect(hasAdminPermission("OPERATIONS_ADMIN", "settings:write")).toBe(false);
  });

  it("restricts Content Manager to content, products, and survey drafting", () => {
    expect(hasAdminPermission("CONTENT_MANAGER", "content:write")).toBe(true);
    expect(hasAdminPermission("CONTENT_MANAGER", "content:publish")).toBe(true);
    expect(hasAdminPermission("CONTENT_MANAGER", "surveys:write")).toBe(true);
    // Cannot alter user records or coin balances
    expect(hasAdminPermission("CONTENT_MANAGER", "users:write")).toBe(false);
    expect(hasAdminPermission("CONTENT_MANAGER", "rewards:write")).toBe(false);
    expect(hasAdminPermission("CONTENT_MANAGER", "access:manage")).toBe(false);
  });

  it("restricts Support Admin to read-only customer lookup and tickets", () => {
    expect(hasAdminPermission("SUPPORT_ADMIN", "users:read")).toBe(true);
    expect(hasAdminPermission("SUPPORT_ADMIN", "support:read")).toBe(true);
    expect(hasAdminPermission("SUPPORT_ADMIN", "support:write")).toBe(true);
    // Forbidden from mutating customer identity, creating surveys, or editing products
    expect(hasAdminPermission("SUPPORT_ADMIN", "users:write")).toBe(false);
    expect(hasAdminPermission("SUPPORT_ADMIN", "surveys:write")).toBe(false);
    expect(hasAdminPermission("SUPPORT_ADMIN", "content:write")).toBe(false);
    expect(hasAdminPermission("SUPPORT_ADMIN", "access:manage")).toBe(false);
  });

  it("restricts Analyst strictly to read-only reporting and audit review", () => {
    expect(hasAdminPermission("ANALYST", "analytics:read")).toBe(true);
    expect(hasAdminPermission("ANALYST", "analytics:export")).toBe(true);
    expect(hasAdminPermission("ANALYST", "audit:read")).toBe(true);
    expect(hasAdminPermission("ANALYST", "users:read")).toBe(true);
    // No mutation permissions
    expect(hasAdminPermission("ANALYST", "users:write")).toBe(false);
    expect(hasAdminPermission("ANALYST", "surveys:write")).toBe(false);
    expect(hasAdminPermission("ANALYST", "rewards:write")).toBe(false);
    expect(hasAdminPermission("ANALYST", "content:write")).toBe(false);
    expect(hasAdminPermission("ANALYST", "access:manage")).toBe(false);
  });
});
