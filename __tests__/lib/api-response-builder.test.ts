import { describe, it, expect, beforeEach } from 'bun:test';
import { ApiResponseBuilder } from '../../src/lib/api-response-builder';

describe('ApiResponseBuilder', () => {
  let builder: ApiResponseBuilder;

  beforeEach(() => {
    builder = new ApiResponseBuilder();
  });

  describe('success', () => {
    it('デフォルトのステータスコード200でレスポンスを生成する', () => {
      const response = builder.success('テストメッセージ');

      expect(response.statusCode).toBe(200);
      expect(response.headers).toEqual({
        'Content-Type': 'application/json; charset=utf-8',
      });
      expect(JSON.parse(response.body)).toEqual({
        message: 'テストメッセージ',
      });
    });

    it('カスタムステータスコードでレスポンスを生成する', () => {
      const response = builder.success('テストメッセージ', {
        statusCode: 201,
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual({
        message: 'テストメッセージ',
      });
    });

    it('データを含むレスポンスを生成する', () => {
      const testData = { id: 1, name: 'テスト' };
      const response = builder.success('テストメッセージ', {
        data: testData,
      });

      expect(JSON.parse(response.body)).toEqual({
        message: 'テストメッセージ',
        data: testData,
      });
    });

    it('カスタムヘッダーを含むレスポンスを生成する', () => {
      const response = builder.success('テストメッセージ', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(response.headers).toEqual({
        'Content-Type': 'application/json; charset=utf-8',
        'X-Custom-Header': 'custom-value',
      });
    });
  });

  describe('clientError', () => {
    it('デフォルトのステータスコード400でレスポンスを生成する', () => {
      const response = builder.clientError('クライアントエラー');

      expect(response.statusCode).toBe(400);
      expect(response.headers).toEqual({
        'Content-Type': 'application/json; charset=utf-8',
      });
      expect(JSON.parse(response.body)).toEqual({
        message: 'クライアントエラー',
      });
    });

    it('カスタムステータスコードでレスポンスを生成する', () => {
      const response = builder.clientError('クライアントエラー', {
        statusCode: 404,
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({
        message: 'クライアントエラー',
      });
    });

    it('データを含むエラーレスポンスを生成する', () => {
      const errorData = {
        code: 'VALIDATION_ERROR',
        details: '詳細なエラー情報',
      };
      const response = builder.clientError('クライアントエラー', {
        data: errorData,
      });

      expect(JSON.parse(response.body)).toEqual({
        message: 'クライアントエラー',
        data: errorData,
      });
    });

    it('カスタムヘッダーを含むエラーレスポンスを生成する', () => {
      const response = builder.clientError('クライアントエラー', {
        headers: {
          'X-Error-Code': 'E001',
        },
      });

      expect(response.headers).toEqual({
        'Content-Type': 'application/json; charset=utf-8',
        'X-Error-Code': 'E001',
      });
    });
  });

  describe('serverError', () => {
    it('デフォルトのステータスコード500でレスポンスを生成する', () => {
      const response = builder.serverError('サーバーエラー');

      expect(response.statusCode).toBe(500);
      expect(response.headers).toEqual({
        'Content-Type': 'application/json; charset=utf-8',
      });
      expect(JSON.parse(response.body)).toEqual({
        message: 'サーバーエラー',
      });
    });

    it('カスタムステータスコードでレスポンスを生成する', () => {
      const response = builder.serverError('サーバーエラー', {
        statusCode: 503,
      });

      expect(response.statusCode).toBe(503);
      expect(JSON.parse(response.body)).toEqual({
        message: 'サーバーエラー',
      });
    });

    it('データを含むエラーレスポンスを生成する', () => {
      const errorData = {
        code: 'INTERNAL_ERROR',
        details: '詳細なエラー情報',
      };
      const response = builder.serverError('サーバーエラー', {
        data: errorData,
      });

      expect(JSON.parse(response.body)).toEqual({
        message: 'サーバーエラー',
        data: errorData,
      });
    });

    it('カスタムヘッダーを含むエラーレスポンスを生成する', () => {
      const response = builder.serverError('サーバーエラー', {
        headers: {
          'X-Error-Code': 'E002',
        },
      });

      expect(response.headers).toEqual({
        'Content-Type': 'application/json; charset=utf-8',
        'X-Error-Code': 'E002',
      });
    });
  });
});
