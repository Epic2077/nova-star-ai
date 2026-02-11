export type SupabaseCookie = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
  };
};

export type SupabaseCookieMethods = {
  getAll: () => SupabaseCookie[];
  setAll: (cookies: SupabaseCookie[]) => void;
};
