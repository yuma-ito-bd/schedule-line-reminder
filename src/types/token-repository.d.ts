export type Token = {
  userId: string;
  accessToken: string;
  refreshToken: string;
};

export type UpdateToken = {
  userId: string;
  accessToken: string;
  refreshToken?: string;
};

export type Schema$TokenRepository = {
  saveToken(token: Token): Promise<void>;
  getToken(userId: string): Promise<Token | null>;
  updateToken(token: UpdateToken): Promise<void>;
  deleteToken(userId: string): Promise<void>;
};
