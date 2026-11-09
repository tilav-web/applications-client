export type ApplicationStatus = 'YANGI' | 'JARAYONDA' | 'HAL_QILINDI' | 'RAD_ETILDI' | string;

export interface ApplicationStatusItem {
  id: string;
  name: string;
  code?: string | null;
  color?: string | null;
  description?: string | null;
  is_default?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

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
  mahallas?: Mahalla[];
  created_at?: string;
  updated_at?: string;
}

export interface Mahalla {
  id: string;
  name: string | null;
  district_id: string;
  district?: District | null;
  created_at?: string;
  updated_at?: string;
}

export interface Crime {
  id: string;
  article: string | null;
  title: string | null;
  category: string | null;
  gravity: CrimeGravity | null;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CrimeMethod {
  id: string;
  name: string;
  group_name: string;
  code?: string | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
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
  birth_date?: string | null;
  gender?: 'male' | 'female' | null;
  address: string | null;
  district_id?: string | null;
  district?: District | null;
  mahalla_id?: string | null;
  mahalla?: Mahalla | null;
  cards?: Card[];
  created_at?: string;
  updated_at?: string;
}

export interface Card {
  id: string;
  card_number: string | null;
  masked_number: string | null;
  expire_date: string | null;
  full_name?: string | null;
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
  transfer_date?: string | null;
  transfer_time?: string | null;
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

export interface SuspectFieldItem {
  id: string;
  field_key: string;
  field_label?: string;
  value: string;
  note?: string;
}

export interface SuspectFieldConfig {
  id: string;
  key: string;
  label: string;
  category?: string | null;
  icon?: string | null;
  description?: string | null;
  sample_value?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SuspectTreeNode {
  id: string;
  label: string;
  value?: string;
  children?: SuspectTreeNode[];
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
  crime_method_id?: string | null;
  crime_method?: CrimeMethod | null;
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
  status_id?: string | null;
  application_status?: ApplicationStatusItem | null;
  date: string | null;
  citizen_id?: string | null;
  citizen?: Citizen | null;
  district_id?: string | null;
  district?: District | null;
  crime_id?: string | null;
  crime?: Crime | null;
  crime_method_id?: string | null;
  crime_method?: CrimeMethod | null;
  card_id?: string | null;
  card?: Card | null;
  transfer_id?: string | null;
  transfer?: Transfer | null;
  suspect_tree?: SuspectTreeNode[] | null;
  custom_fields?: ApplicationCustomField[];
  documents?: {
    id: string;
    title: string;
    file_name: string;
    file_key: string;
    file_url: string;
    file_type?: string;
    size?: number;
    version?: number;
    doc_key?: string | null;
    created_at?: string;
    updated_at?: string;
  }[];
  created_at?: string;
  updated_at?: string;
  relations_summary?: {
    total: number;
    cards: number;
    citizens: number;
    suspects?: number;
    has_fraud_card_link: boolean;
  };
}

export interface ApplicationRelationsSummary {
  total: number;
  cards: number;
  citizens: number;
  has_fraud_card_link: boolean;
}

export interface LinkedApplicationInfo {
  id: string;
  application_number: string;
  status: string | null;
  status_label: string;
  status_color: string;
  date: string | null;
  citizen_name: string;
  citizen_phone?: string | null;
  role_in_that_app?: 'RECEIVER' | 'SENDER' | 'RELATED';
  transfer_amount?: number | null;
  currency?: string;
  payment_provider?: string | null;
  description?: string | null;
}

export interface CardRelationItem {
  card: {
    id: string;
    card_number: string | null;
    masked_number: string | null;
    full_name?: string | null;
    bank_name?: string | null;
  };
  role_in_current_app: 'RECEIVER' | 'SENDER' | 'RELATED';
  linked_applications: LinkedApplicationInfo[];
}

export interface CitizenRelationItem {
  citizen: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    middle_name?: string | null;
    phone_number?: string | null;
    passport?: string | null;
    pinfl?: string | null;
  };
  match_reasons: string[];
  linked_applications: LinkedApplicationInfo[];
}

export interface ApplicationRelationsData {
  application: {
    id: string;
    application_number: string;
    description: string | null;
    status: string | null;
    application_status?: ApplicationStatusItem | null;
    date: string | null;
    citizen?: Citizen | null;
    transfer?: Transfer | null;
  };
  stats: {
    total_linked_applications: number;
    total_linked_loss: number;
    current_app_loss: number;
    grand_total_loss: number;
    total_cards_count: number;
    total_citizens_count: number;
    has_fraud_card_link: boolean;
  };
  card_relations: CardRelationItem[];
  citizen_relations: CitizenRelationItem[];
  graph?: IGraphData;
}

export type GraphCardRole =
  | 'MULE_DROPPER'
  | 'TRANSIT'
  | 'VICTIM_SOURCE'
  | 'COMPROMISED_VICTIM'
  | 'ATM_TERMINAL'
  | 'CRYPTO_CASHOUT';

export interface IGraphNode {
  id: string;
  cardNumber: string;
  maskedCard: string;
  bankName: string;
  totalIn: number;
  totalOut: number;
  netFlow: number;
  inDegree: number;
  outDegree: number;
  reportsCount: number;
  reportIds: string[];
  riskScore: number;
  role: GraphCardRole;
  isBlacklisted: boolean;
  isUnknownDestination?: boolean;
  isCluster?: boolean;
  clusterCount?: number;
  clusterVictimIds?: string[];
  ownerName?: string;
  pinfl?: string;
  passport?: string;
  phone?: string;
  linkedApplications?: LinkedApplicationInfo[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  radius?: number;
}

export interface IGraphEdge {
  id: string;
  from: string;
  to: string;
  amount: number;
  paymentProvider?: string;
  transactionsCount: number;
  lastDate: string;
  applicationNumber?: string;
  applicationId?: string;
  isUnknownDestination?: boolean;
}

export interface IGraphSummary {
  totalCards: number;
  totalFlowAmount: number;
  droppersCount: number;
  transitCount: number;
  blacklistedCount: number;
}

export interface IGraphData {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
  summary: IGraphSummary;
}
