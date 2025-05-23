import { OAuth2Client } from "google-auth-library";

export type Schema$GoogleAuth = {
  generateAuthUrl(): string;
  getAuthClient(): OAuth2Client;
};
