import { describe, it, expect, mock } from "bun:test";
import { a } from "./a";

describe("a2", () => {
  it("should return b()", () => {
    mock.module("./b", () => {
      return {
        b: () => "dummy",
      };
    });

    expect(a()).toBe("dummy");
  });
});
