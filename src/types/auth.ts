export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'INSPECTOR' | 'OPERATOR' | 'USER' | string;

export interface UserProfile {
  id?: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  profile: UserProfile | null;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface UpdateProfileDto {
  username?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  current_password?: string;
  new_password?: string;
  password?: string;
}
