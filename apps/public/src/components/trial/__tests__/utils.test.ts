import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatPhoneNumber,
  isValidPhoneNumber,
  isValidEmail,
  getCookie,
  setCookie,
} from "../utils.ts";

describe("Trial Form Utilities (apps/public)", () => {
  describe("formatPhoneNumber", () => {
    it("should format a standard 10-digit number", () => {
      assert.strictEqual(formatPhoneNumber("4165551234"), "(416) 555-1234");
      assert.strictEqual(formatPhoneNumber("9057639339"), "(905) 763-9339");
    });

    it("should format an 11-digit number starting with 1 (+1 country code)", () => {
      assert.strictEqual(formatPhoneNumber("14165551234"), "+1 (416) 555-1234");
    });

    it("should clean non-numeric characters before formatting", () => {
      assert.strictEqual(formatPhoneNumber("(416) 555-1234"), "(416) 555-1234");
      assert.strictEqual(formatPhoneNumber("416-555-1234 ext 9"), "(416) 555-1234");
    });

    it("should handle partial progress while typing", () => {
      assert.strictEqual(formatPhoneNumber(""), "");
      assert.strictEqual(formatPhoneNumber("4"), "(4");
      assert.strictEqual(formatPhoneNumber("416"), "(416");
      assert.strictEqual(formatPhoneNumber("4165"), "(416) 5");
      assert.strictEqual(formatPhoneNumber("416555"), "(416) 555");
      assert.strictEqual(formatPhoneNumber("4165551"), "(416) 555-1");
    });
  });

  describe("isValidPhoneNumber", () => {
    it("should validate 10-digit phone numbers", () => {
      assert.strictEqual(isValidPhoneNumber("4165551234"), true);
      assert.strictEqual(isValidPhoneNumber("(416) 555-1234"), true);
      assert.strictEqual(isValidPhoneNumber("905-763-9339"), true);
    });

    it("should validate 11-digit numbers starting with 1", () => {
      assert.strictEqual(isValidPhoneNumber("14165551234"), true);
      assert.strictEqual(isValidPhoneNumber("+1 (416) 555-1234"), true);
    });

    it("should reject invalid phone numbers", () => {
      assert.strictEqual(isValidPhoneNumber(""), false);
      assert.strictEqual(isValidPhoneNumber("123"), false);
      assert.strictEqual(isValidPhoneNumber("416555123"), false); // 9 digits
      assert.strictEqual(isValidPhoneNumber("41655512345"), false); // 11 digits not starting with 1
      assert.strictEqual(isValidPhoneNumber("abcdefghij"), false);
    });
  });

  describe("isValidEmail", () => {
    it("should accept empty or whitespace strings as email is optional", () => {
      assert.strictEqual(isValidEmail(""), true);
      assert.strictEqual(isValidEmail("   "), true);
    });

    it("should accept valid email addresses", () => {
      assert.strictEqual(isValidEmail("test@example.com"), true);
      assert.strictEqual(isValidEmail("parent.name+tag@sub.domain.org"), true);
      assert.strictEqual(isValidEmail("  parent@swanswimschool.com  "), true);
    });

    it("should reject invalid email formats", () => {
      assert.strictEqual(isValidEmail("invalid-email"), false);
      assert.strictEqual(isValidEmail("user@"), false);
      assert.strictEqual(isValidEmail("@domain.com"), false);
      assert.strictEqual(isValidEmail("user@domain"), false);
      assert.strictEqual(isValidEmail("user name@domain.com"), false);
    });
  });

  describe("Cookie Helpers", () => {
    it("should safely handle getCookie when document is undefined (SSR)", () => {
      assert.strictEqual(getCookie("test_cookie"), null);
    });

    it("should read and set cookies when document is mocked", () => {
      const mockStorage: Record<string, string> = {};
      const fakeDocument = {
        get cookie() {
          return Object.entries(mockStorage)
            .map(([k, v]) => `${k}=${v}`)
            .join("; ");
        },
        set cookie(val: string) {
          const parts = val.split(";")[0].split("=");
          mockStorage[parts[0].trim()] = parts[1]?.trim() || "";
        },
      };

      // Temporarily mock global document
      (globalThis as unknown as { document: typeof fakeDocument }).document = fakeDocument;

      setCookie("__swan_trial", "trk_test_session_123", 30);
      assert.strictEqual(getCookie("__swan_trial"), "trk_test_session_123");

      // Non-existent cookie
      assert.strictEqual(getCookie("__non_existent"), null);

      // Clean up global mock
      delete (globalThis as unknown as { document?: typeof fakeDocument }).document;
    });
  });
});
