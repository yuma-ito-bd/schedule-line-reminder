import { describe, it, expect } from "bun:test";
import { DateFormatter } from "../../src/lib/date-formatter";

describe("DateFormatter", () => {
  describe("jstYmd", () => {
    it("日本時間でフォーマットされること", () => {
      const date = new Date("2021-01-01T00:00:00Z");
      const formatted = DateFormatter.jstYmd(date);
      expect(formatted).toBe("2021/01/01");
    });

    it("日付を跨いでいても日本時間でフォーマットされること", () => {
      const date = new Date("2021-01-01T15:00:00Z");
      const formatted = DateFormatter.jstYmd(date);
      expect(formatted).toBe("2021/01/02");
    });
  });

  describe("jstHm", () => {
    it("日本時間でフォーマットされること", () => {
      const date = new Date("2021-01-01T00:00:00Z");
      const formatted = DateFormatter.jstHm(date);
      expect(formatted).toBe("09:00");
    });
  });
});
