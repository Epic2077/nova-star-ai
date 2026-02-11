export type SupabaseAppMetadata = {
  provider: string;
  providers: string[];
};

export type SupabaseUserMetadata = {
  email: string;
  email_verified: boolean;
  full_name: string;
  phone_verified: boolean;
  role: "user" | "admin" | string;
  sub: string;
  avatar?: string;
};

export type SupabaseIdentityData = {
  email: string;
  email_verified: boolean;
  full_name: string;
  phone_verified: boolean;
  role: "user" | "admin" | string;
  sub: string;
};

export type SupabaseIdentity = {
  identity_id: string;
  id: string;
  user_id: string;
  identity_data: SupabaseIdentityData;
  provider: string;
  last_sign_in_at: string;
  created_at: string;
  updated_at: string;
  email: string;
};

export type SupabaseUser = {
  id: string;
  aud: string;
  role: string;
  email: string;
  email_confirmed_at: string;
  phone: string;
  confirmed_at: string;
  last_sign_in_at: string;
  app_metadata: SupabaseAppMetadata;
  user_metadata: SupabaseUserMetadata;
  identities: SupabaseIdentity[];
  created_at: string;
  updated_at: string;
  is_anonymous: boolean;
};
