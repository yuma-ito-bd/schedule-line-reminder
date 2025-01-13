import { describe, it, expect } from "bun:test";
import { a } from "./a_new";

describe("a", () => {
  it("should return func()", () => {
    const dummyFunction = () => "dummy";

    const result = a(dummyFunction);
    expect(result).toBe("dummy");
  });
});
