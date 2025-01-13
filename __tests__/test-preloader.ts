import { afterEach, mock } from "bun:test";
import { ConfigMock } from "./mocks/config-mock";

console.info("test-preloader loaded");
// mock.module("../src/lib/config", () => ({
//   Config: ConfigMock,
// }));

afterEach(() => {
  mock.restore();
  console.log("mock restored");
});
