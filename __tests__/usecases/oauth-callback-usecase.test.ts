import { OAuthCallbackUseCase } from "../../src/usecases/oauth-callback-usecase";
import type { Schema$GoogleAuthToken } from "../../src/types/google-auth";
import { MockOAuthStateRepository } from "../mocks/mock-oauth-state-repository";
import { MockGoogleAuth } from "../mocks/mock-google-auth";
import { MockTokenRepository } from "../mocks/mock-token-repository";
import { describe, expect, it, beforeEach, spyOn } from "bun:test";

describe("OAuthCallbackUseCase", () => {
  let useCase: OAuthCallbackUseCase;
  let mockStateRepository: MockOAuthStateRepository;
  let mockAuth: MockGoogleAuth;
  let mockTokenRepository: MockTokenRepository;

  beforeEach(() => {
    mockStateRepository = new MockOAuthStateRepository();
    mockAuth = new MockGoogleAuth();
    mockTokenRepository = new MockTokenRepository();
    useCase = new OAuthCallbackUseCase(
      mockStateRepository,
      mockAuth,
      mockTokenRepository
    );
  });

  describe("execute", () => {
    const validCode = "valid-code";
    const validState = "valid-state";
    const userId = "test-user-id";

    it("正常系: 認証が成功する", async () => {
      // Arrange
      spyOn(mockStateRepository, "validateState").mockResolvedValue({
        isValid: true,
        userId,
      });
      const mockTokens: Schema$GoogleAuthToken = {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
      };
      spyOn(mockAuth, "getTokensFromCode").mockResolvedValue(mockTokens);
      spyOn(mockTokenRepository, "saveToken").mockResolvedValue();

      // Act
      const result = await useCase.execute(validCode, validState);

      // Assert
      expect(mockStateRepository.validateState).toHaveBeenCalledWith(
        validState
      );
      expect(mockAuth.getTokensFromCode).toHaveBeenCalledWith(validCode);
      expect(mockTokenRepository.saveToken).toHaveBeenCalledWith({
        userId,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
      expect(result).toEqual({
        message: "認証が完了しました。このウィンドウを閉じてください。",
      });
    });

    it("異常系: 認可コードが未指定の場合、エラーをスローする", async () => {
      // Act & Assert
      expect(useCase.execute("", validState)).rejects.toThrow(
        "Authorization code is missing"
      );
    });

    it("異常系: stateパラメータが未指定の場合、エラーをスローする", async () => {
      // Act & Assert
      expect(useCase.execute(validCode, "")).rejects.toThrow(
        "State parameter is missing"
      );
    });

    it("異常系: stateパラメータが無効な場合、エラーをスローする", async () => {
      // Arrange
      spyOn(mockStateRepository, "validateState").mockResolvedValue({
        isValid: false,
        userId: undefined,
      });

      // Act & Assert
      expect(useCase.execute(validCode, validState)).rejects.toThrow(
        "Invalid state parameter"
      );
    });
  });
});
