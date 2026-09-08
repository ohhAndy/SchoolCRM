import {
  BUSINESS_TIMEZONE,
  getTorontoDateString,
  getTorontoStartOfDay,
  formatCalendarDate,
} from "./date.utils";

describe("date.utils (apps/api)", () => {
  it("should export BUSINESS_TIMEZONE as America/Toronto", () => {
    expect(BUSINESS_TIMEZONE).toBe("America/Toronto");
  });

  describe("getTorontoDateString", () => {
    it("should return the correct Toronto date string at UTC rollover", () => {
      // 8:30 PM EDT on Sept 7 = 00:30 UTC on Sept 8
      const lateEvening = new Date("2026-09-08T00:30:00Z");
      expect(getTorontoDateString(lateEvening)).toBe("2026-09-07");
    });

    it("should format standard morning time in Toronto", () => {
      const morning = new Date("2026-09-07T14:00:00Z"); // 10:00 AM EDT
      expect(getTorontoDateString(morning)).toBe("2026-09-07");
    });
  });

  describe("getTorontoStartOfDay", () => {
    it("should compute midnight Toronto time in summer (EDT, UTC-4)", () => {
      const summer = new Date("2026-07-15T12:00:00Z");
      const start = getTorontoStartOfDay(summer);
      expect(start.toISOString()).toBe("2026-07-15T04:00:00.000Z");
      expect(
        start.toLocaleTimeString("en-US", { timeZone: BUSINESS_TIMEZONE, hour: "numeric", minute: "numeric" }),
      ).toBe("12:00 AM");
    });

    it("should compute midnight Toronto time in winter (EST, UTC-5)", () => {
      const winter = new Date("2026-01-15T12:00:00Z");
      const start = getTorontoStartOfDay(winter);
      expect(start.toISOString()).toBe("2026-01-15T05:00:00.000Z");
      expect(
        start.toLocaleTimeString("en-US", { timeZone: BUSINESS_TIMEZONE, hour: "numeric", minute: "numeric" }),
      ).toBe("12:00 AM");
    });
  });

  describe("formatCalendarDate", () => {
    it("should format calendar date strings identically regardless of time", () => {
      expect(formatCalendarDate("2026-09-15")).toBe("Sep 15, 2026");
      expect(formatCalendarDate("2026-09-15T00:00:00.000Z")).toBe("Sep 15, 2026");
    });
  });
});
