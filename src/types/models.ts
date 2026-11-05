export type ApplicationStatus = 'YANGI' | 'JARAYONDA' | 'HAL_QILINDI' | 'RAD_ETILDI';

export type CrimeGravity = 'UNCHA_OGIR_BOLMAGAN' | 'ORTA_OGIR' | 'OGIR' | 'JUDA_OGIR';

export type TransferStatus = 'KUTILMOQDA' | 'MUVAFFAQIYATLI' | 'BEKOR_QILINDI';

export type CustomFieldType =
  | 'TEXT'
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'IMAGES'
  | 'FILES'
  | 'SELECT'
  | 'CITIZEN'
  | 'DISTRICT'
  | 'CRIME'
  | 'CARD'
  | 'TRANSFER';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface Bank {
  id: string;
  name: string | null;
  code: string | null;
  mfo: string | null;
  is_active: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentProvider {
  id: string;
  name: string | null;
  code: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface District {
  id: string;
  name: string | null;
  code: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Crime {
  id: string;
  article: string | null;
  title: string | null;
  part: string | null;
  category: string | null;
  gravity: CrimeGravity | null;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Citizen {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  passport: string | null;
  pinfl: string | null;
  phone_number: string | null;
  address: string | null;
  cards?: Card[];
  created_at?: string;
  updated_at?: string;
}

export interface Card {
  id: string;
  card_number: string | null;
  masked_number: string | null;
  expire_date: string | null;
  citizen_id: string | null;
  citizen?: Citizen | null;
  bank_id: string | null;
  bank?: Bank | null;
  created_at?: string;
  updated_at?: string;
}

export type TransferCustomFieldType =
  | 'TEXT'
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'IMAGES'
  | 'FILES'
  | 'SELECT'
  | 'CARD'
  | 'CITIZEN'
  | 'BANK'
  | 'PAYMENT_PROVIDER';

export interface TransferCustomField {
  id?: string;
  transfer_id?: string | null;
  label: string | null;
  key: string | null;
  type: TransferCustomFieldType | null;
  value: unknown;
  card_id?: string | null;
  card?: Card | null;
  citizen_id?: string | null;
  citizen?: Citizen | null;
  bank_id?: string | null;
  bank?: Bank | null;
  payment_provider_id?: string | null;
  payment_provider?: PaymentProvider | null;
  order?: number | null;
}

export interface Transfer {
  id: string;
  transaction_id: string | null;
  amount: number | null;
  currency: string | null;
  status: TransferStatus | null;
  application_id: string | null;
  payment_provider_id: string | null;
  payment_provider?: PaymentProvider | null;
  sender_card_id: string | null;
  sender_card?: Card | null;
  receiver_card_id: string | null;
  receiver_card?: Card | null;
  card_id: string | null;
  card?: Card | null;
  custom_fields?: TransferCustomField[];
  created_at?: string;
  updated_at?: string;
}

export interface ApplicationCustomField {
  id?: string;
  application_id?: string | null;
  label: string | null;
  key: string | null;
  type: CustomFieldType | null;
  value: unknown;
  citizen_id?: string | null;
  citizen?: Citizen | null;
  card_id?: string | null;
  card?: Card | null;
  crime_id?: string | null;
  crime?: Crime | null;
  district_id?: string | null;
  district?: District | null;
  transfer_id?: string | null;
  transfer?: Transfer | null;
  inline_citizen?: Record<string, unknown>;
  inline_card?: Record<string, unknown>;
  inline_crime?: Record<string, unknown>;
  inline_district?: Record<string, unknown>;
  inline_transfer?: Record<string, unknown>;
  order?: number | null;
}

export interface Application {
  id: string;
  application_number: string | null;
  description: string | null;
  officer_notes?: string | null;
  status: ApplicationStatus | null;
  date: string | null;
  citizen_id?: string | null;
  citizen?: Citizen | null;
  district_id?: string | null;
  district?: District | null;
  crime_id?: string | null;
  crime?: Crime | null;
  card_id?: string | null;
  card?: Card | null;
  transfer_id?: string | null;
  transfer?: Transfer | null;
  custom_fields?: ApplicationCustomField[];
  created_at?: string;
  updated_at?: string;
}
