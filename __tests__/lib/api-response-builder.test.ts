import { ApiResponseBuilder } from "../../src/lib/api-response-builder";

describe("ApiResponseBuilder", () => {
  let builder: ApiResponseBuilder;

  beforeEach(() => {
    builder = new ApiResponseBuilder();
  });

  describe("success", () => {
    it("デフォルトのステータスコード200でレスポンスを生成する", () => {
      const response = builder.success("テストメッセージ");

      expect(response.statusCode).toBe(200);
      expect(response.headers).toEqual({
        "Content-Type": "application/json; charset=utf-8",
      });
      expect(JSON.parse(response.body)).toEqual({
        message: "テストメッセージ",
      });
    });

    it("カスタムステータスコードでレスポンスを生成する", () => {
      const response = builder.success("テストメッセージ", {
        statusCode: 201,
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual({
        message: "テストメッセージ",
      });
    });

    it("データを含むレスポンスを生成する", () => {
      const testData = { id: 1, name: "テスト" };
      const response = builder.success("テストメッセージ", {
        data: testData,
      });

      expect(JSON.parse(response.body)).toEqual({
        message: "テストメッセージ",
        data: testData,
      });
    });

    it("カスタムヘッダーを含むレスポンスを生成する", () => {
      const response = builder.success("テストメッセージ", {
        headers: {
          "X-Custom-Header": "custom-value",
        },
      });

      expect(response.headers).toEqual({
        "Content-Type": "application/json; charset=utf-8",
        "X-Custom-Header": "custom-value",
      });
    });
  });

  describe("error", () => {
    it("デフォルトのステータスコード500でレスポンスを生成する", () => {
      const response = builder.error("エラーメッセージ");

      expect(response.statusCode).toBe(500);
      expect(response.headers).toEqual({
        "Content-Type": "application/json; charset=utf-8",
      });
      expect(JSON.parse(response.body)).toEqual({
        message: "エラーメッセージ",
      });
    });

    it("カスタムステータスコードでレスポンスを生成する", () => {
      const response = builder.error("エラーメッセージ", {
        statusCode: 400,
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        message: "エラーメッセージ",
      });
    });

    it("データを含むエラーレスポンスを生成する", () => {
      const errorData = {
        code: "VALIDATION_ERROR",
        details: "詳細なエラー情報",
      };
      const response = builder.error("エラーメッセージ", {
        data: errorData,
      });

      expect(JSON.parse(response.body)).toEqual({
        message: "エラーメッセージ",
        data: errorData,
      });
    });

    it("カスタムヘッダーを含むエラーレスポンスを生成する", () => {
      const response = builder.error("エラーメッセージ", {
        headers: {
          "X-Error-Code": "E001",
        },
      });

      expect(response.headers).toEqual({
        "Content-Type": "application/json; charset=utf-8",
        "X-Error-Code": "E001",
      });
    });
  });
});
