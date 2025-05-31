import { GoogleAuthAdapter } from "../../src/lib/google-auth-adapter";
import { TokenRepository } from "../../src/lib/token-repository";

// Mock Config
jest.mock("../../src/lib/config", () => ({
  Config: {
    getInstance: jest.fn(() => ({
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      GOOGLE_REDIRECT_URI: "test-redirect-uri",
    })),
  },
}));

// Mock @googleapis/calendar
let tokensCallback: ((tokens: any) => void) | null = null;
const mockOAuth2ClientOn = jest.fn((event, callback) => {
  if (event === 'tokens') {
    tokensCallback = callback;
  }
});
const mockOAuth2Client = {
  generateAuthUrl: jest.fn(),
  getToken: jest.fn(),
  setCredentials: jest.fn(),
  on: mockOAuth2ClientOn,
};
jest.mock('@googleapis/calendar', () => ({
  auth: {
    OAuth2: jest.fn(() => mockOAuth2Client),
  },
}));

// Mock TokenRepository
jest.mock("../../src/lib/token-repository");

describe("GoogleAuthAdapter", () => {
  let mockTokenRepositoryInstance: jest.Mocked<TokenRepository>;

  beforeEach(() => {
    // Reset mocks for each test
    jest.clearAllMocks();
    tokensCallback = null; // Reset callback capturer

    // Create a new mock instance for TokenRepository before each test
    mockTokenRepositoryInstance = new TokenRepository() as jest.Mocked<TokenRepository>;
    // Specifically mock updateToken if it's not automatically mocked by jest.mock above
    // (depends on how TokenRepository is defined and mocked)
    if (!mockTokenRepositoryInstance.updateToken) {
        mockTokenRepositoryInstance.updateToken = jest.fn();
    }
  });

  describe("Token Refresh Event Listener", () => {
    const mockUserId = "test-user-123";

    test("should update token with refresh_token when 'tokens' event is emitted", async () => {
      // Instantiate adapter with mockUserId and mockTokenRepositoryInstance
      new GoogleAuthAdapter(mockUserId, mockTokenRepositoryInstance);

      const eventPayload = {
        access_token: "new_access_token",
        refresh_token: "new_refresh_token",
      };

      expect(tokensCallback).not.toBeNull(); // Ensure the listener was registered
      if (tokensCallback) {
        // Simulate event emission by invoking the captured callback
        await tokensCallback(eventPayload);
      }

      expect(mockTokenRepositoryInstance.updateToken).toHaveBeenCalledTimes(1);
      expect(mockTokenRepositoryInstance.updateToken).toHaveBeenCalledWith({
        userId: mockUserId, // Use the id passed to constructor
        accessToken: "new_access_token",
        refreshToken: "new_refresh_token",
      });
    });

    test("should update token without refresh_token when 'tokens' event is emitted with access_token only", async () => {
      // Instantiate adapter with mockUserId and mockTokenRepositoryInstance
      new GoogleAuthAdapter(mockUserId, mockTokenRepositoryInstance);

      const eventPayload = {
        access_token: "new_access_token_only",
      };

      expect(tokensCallback).not.toBeNull(); // Ensure the listener was registered
      if (tokensCallback) {
        // Simulate event emission
        await tokensCallback(eventPayload);
      }

      expect(mockTokenRepositoryInstance.updateToken).toHaveBeenCalledTimes(1);
      expect(mockTokenRepositoryInstance.updateToken).toHaveBeenCalledWith({
        userId: mockUserId, // Use the id passed to constructor
        accessToken: "new_access_token_only",
      });
    });

    // Test Case 3 (Event listener not initialized) is removed as it's no longer applicable.
    // The listener is now initialized in the constructor.

    // Test Case 4 (Edge case - missing repository/userId in event handler) is removed.
    // With readonly members set via constructor, they cannot become null post-instantiation.
    // The internal check `if (!this.tokenRepository || !this.userId)` is a safeguard
    // against impossible states if TypeScript is respected and constructor is used correctly.
    // Testing this specific internal check's console.error would require
    // bypassing TypeScript's readonly and non-nullable types, which is overly complex for this scenario.
  });
});
