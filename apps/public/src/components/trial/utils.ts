import React from "react";

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure =
    typeof window !== "undefined" && window.location?.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 11 && digits.startsWith("1")) {
    const areaCode = digits.slice(1, 4);
    const middle = digits.slice(4, 7);
    const last = digits.slice(7, 11);
    return `+1 (${areaCode}) ${middle}-${last}`;
  }

  const limited = digits.slice(0, 10);
  if (limited.length <= 3) {
    return `(${limited}`;
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  } else {
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6, 10)}`;
  }
}

export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith("1")) return true;
  return false;
}

export function isValidEmail(email: string): boolean {
  if (!email.trim()) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function scrollToFirstErrorOrTop(
  formTopRef: React.RefObject<HTMLDivElement | null>,
): void {
  setTimeout(() => {
    const firstErrorEl = document.querySelector(
      ".form-error, #submission-error-banner, #submission-error-bottom",
    );
    if (firstErrorEl) {
      firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 60);
}
