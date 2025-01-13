import { describe, it, expect } from "bun:test";
import { a } from "./a";

// 他のテスト(a2.test.ts)での mock.module が影響してしまうため、一度に実行するとテストが失敗する
// see: https://zenn.dev/link/comments/150ea1296b5de1
describe.skip("a1", () => {
  it("should return b()", () => {
    expect(a()).toBe("b");
  });
});
