import type { Schema$ParameterFetcher } from "../types/lib/parameter-fetcher";

export class ParameterFetcherMock implements Schema$ParameterFetcher {
  call = async (name: string): Promise<string> => {
    switch (name) {
      case "google-client-id":
        return "mock-google-client-id";
      case "google-client-secret":
        return "mock-google-client-secret";
      case "google-redirect-uri":
        return "mock-google-redirect-uri";
      case "line-channel-access-token":
        return "mock-line-channel-access-token";
      case "line-channel-secret":
        return "mock-line-channel-secret";
      default:
        throw new Error(`Unknown parameter name: ${name}`);
    }
  };
}
