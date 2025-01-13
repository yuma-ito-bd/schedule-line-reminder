import type { Schema$ParameterFetcher } from "../../src/types/lib/parameter-fetcher";

export class ParameterFetcherMock implements Schema$ParameterFetcher {
  call = async (name: string): Promise<string> => {
    switch (name) {
      case "google-client-id":
        return "mock-google-client-id";
      case "google-client-secret":
        return "mock-google-client-secret";
      case "google-redirect-uri":
        return "mock-google-redirect-uri";
      case "google-access-token":
        return "mock-google-access-token";
      case "google-refresh-token":
        return "mock-google-refresh-token";
      default:
        throw new Error(`Unknown parameter name: ${name}`);
    }
  };
}
