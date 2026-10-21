import { describe, it, expect } from "vitest";
import { normalizeIndianPhone, isValidIndianPhone, maskPhone, formatPhoneDisplay } from "../src/lib/phone";

describe("Phone Number Validation & Normalization", () => {
  it("normalizes valid 10-digit Indian numbers starting with 6, 7, 8, 9", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("8123456789")).toBe("+918123456789");
    expect(normalizeIndianPhone("7012345678")).toBe("+917012345678");
    expect(normalizeIndianPhone("6912345678")).toBe("+916912345678");
  });

  it("handles numbers with +91, 91, leading 0, spaces and hyphens", () => {
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("+91-98765-43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("919876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("09876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("  9876543210  ")).toBe("+919876543210");
  });

  it("rejects invalid phone numbers", () => {
    // Starts with invalid digit (< 6)
    expect(normalizeIndianPhone("5123456789")).toBeNull();
    expect(normalizeIndianPhone("1234567890")).toBeNull();

    // Wrong length
    expect(normalizeIndianPhone("987654321")).toBeNull(); // 9 digits
    expect(normalizeIndianPhone("98765432100")).toBeNull(); // 11 digits
    expect(normalizeIndianPhone("")).toBeNull();
    expect(normalizeIndianPhone("abcdefghij")).toBeNull();
  });

  it("validates using isValidIndianPhone helper", () => {
    expect(isValidIndianPhone("9876543210")).toBe(true);
    expect(isValidIndianPhone("5123456789")).toBe(false);
  });

  it("masks phone numbers properly for display", () => {
    expect(maskPhone("+919876543210")).toBe("+91 98*** ***10");
  });

  it("formats phone numbers cleanly for display", () => {
    expect(formatPhoneDisplay("+919876543210")).toBe("+91 98765 43210");
  });
});
