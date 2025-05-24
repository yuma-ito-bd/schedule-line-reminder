export type Token = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
};

export type Schema$TokenRepository = {
  saveToken(token: Token): Promise<void>;
  getToken(userId: string): Promise<Token | null>;
  updateToken(token: Token): Promise<void>;
  deleteToken(userId: string): Promise<void>;
};
