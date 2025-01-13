import { afterEach, mock, jest } from "bun:test";
import { ConfigMock } from "./mocks/config-mock";

console.info("test-preloader loaded");
// mock.module("../src/lib/config", () => ({
//   Config: ConfigMock,
// }));

afterEach(() => {
  mock.restore();
  jest.restoreAllMocks();
  console.log("mock restored");
});
