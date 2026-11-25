import type {
  ApplicationDamageType,
  CrimeGravity,
  CustomFieldType,
  TransferCustomField,
} from '@/types/models';

export interface AppCustomFieldState {
  clientId: string;
  type: CustomFieldType;
  label: string;
  key: string;
  value: unknown;
  order: number;
  citizen_id?: string | null;
  card_id?: string | null;
  crime_id?: string | null;
  district_id?: string | null;
  transfer_id?: string | null;
  inline_citizen?: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    passport: string;
    phone_number: string;
    pinfl?: string;
    birth_date?: string;
    gender?: 'male' | 'female' | '';
    address?: string;
    district_id?: string | null;
    district_name?: string;
    neighborhood_id?: string | null;
    neighborhood_name?: string;
  };
  inline_card?: {
    card_number: string;
    expire_date?: string;
    full_name?: string;
    bank_name?: string;
    bank_mfo?: string;
  };
  inline_crime?: {
    article: string;
    title?: string;
    clause?: string;
    gravity?: CrimeGravity;
  };
  inline_district?: {
    name: string;
    code?: string;
  };
  inline_transfer?: {
    amount: string | number;
    currency: string;
    payment_provider_id?: string;
    payment_provider_name?: string;
    receiver_card_id?: string;
    receiver_card_number?: string;
    receiver_card_full_name?: string;
    receiver_bank_name?: string;
    transfer_date?: string;
    transfer_time?: string;
    transfer_custom_fields?: TransferCustomField[];
  };
  isUploading?: boolean;
}

export interface FinancialTransferEntry {
  clientId: string;
  victimCardId: string | null;
  victimCardNumber: string;
  victimCardFullName: string;
  victimBankName: string;
  transferId: string | null;
  amount: string;
  currency: string;
  providerId: string | null;
  providerName: string;
  transferDate: string; // YYYY-MM-DD
  transferTime: string; // HH:MM
  receiverCardId: string | null;
  receiverCardNumber: string;
  receiverCardFullName: string;
  receiverBankName: string;
}

export interface NonCardDamageEntry {
  clientId: string;
  damageType: ApplicationDamageType;
  organizationName: string;
  amount: string;
  currency: string;
  contractNumber: string;
  damageDate: string;
  description: string;
}
