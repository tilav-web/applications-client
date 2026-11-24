export type ApplicationStatus = 'YANGI' | 'JARAYONDA' | 'HAL_QILINDI' | 'RAD_ETILDI' | string;

export type ApplicationStatusCategory = 'OPEN' | 'IN_PROGRESS' | 'EXTENDED' | 'PAUSED' | 'CLOSED';

export interface ApplicationStatusItem {
  id: string;
  name: string;
  code?: string | null;
  color?: string | null;
  description?: string | null;
  category?: ApplicationStatusCategory;
  tracks_sla?: boolean;
  default_sla_days?: number | null;
  legal_article?: string | null;
  requires_decision?: boolean;
  requires_rejection_reason?: boolean;
  is_default?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApplicationStatusHistoryItem {
  id: string;
  application_id: string;
  action: 'CREATED' | 'STATUS_CHANGED' | 'DEADLINE_EXTENDED' | 'DEADLINE_CHANGED' | 'CLOSED';
  from_status_id?: string | null;
  from_status_name?: string | null;
  to_status_id?: string | null;
  to_status_name?: string | null;
  old_deadline_at?: string | null;
  new_deadline_at?: string | null;
  prosecutor_approval_number?: string | null;
  prosecutor_approval_date?: string | null;
  decision_type_name?: string | null;
  decision_number?: string | null;
  decision_date?: string | null;
  note?: string | null;
  changed_by_id?: string | null;
  changed_by?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  created_at: string;
}

export interface SlaUrgentItem {
  id: string;
  application_number: string | null;
  deadline_at: string;
  sla_days: number | null;
  extended_until: string | null;
  district_name: string | null;
  citizen_name: string | null;
  status_name: string | null;
  status_color: string | null;
  hours_remaining: number;
}

export interface SlaOverviewResponse {
  totalActive: number;
  overdueCount: number;
  due24hCount: number;
  due72hCount: number;
  extendedCount: number;
  onTrackCount: number;
  urgentItems: SlaUrgentItem[];
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

export interface Region {
  id: string;
  name: string;
  code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface District {
  id: string;
  name: string | null;
  code?: string | null;
  region_id?: string | null;
  region?: Region | null;
  latitude?: number | null;
  longitude?: number | null;
  neighborhoods?: Neighborhood[];
  created_at?: string;
  updated_at?: string;
}

export interface Neighborhood {
  id: string;
  name: string | null;
  district_id: string;
  district?: District | null;
  latitude?: number | null;
  longitude?: number | null;
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

export type CrimeMethodFieldType =
  'STRING' | 'NUMBER' | 'URL' | 'DATE' | 'PHONE' | 'TEXT' | 'SELECT';

export interface CrimeMethodField {
  id?: string;
  key?: string;
  label: string;
  field_type: CrimeMethodFieldType;
  options?: string[] | null;
  placeholder?: string | null;
  is_required?: boolean;
  show_in_excel?: boolean;
  excel_header?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface CrimeMethod {
  id: string;
  name: string;
  group_name: string;
  code?: string | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
  crimes?: Crime[];
  fields?: CrimeMethodField[];
  created_at?: string;
  updated_at?: string;
}

export interface OccupationCategory {
  id: string;
  name: string;
  code?: string | null;
  sort_order?: number;
  is_active?: boolean;
  occupations?: Occupation[];
  created_at?: string;
  updated_at?: string;
}

export interface Occupation {
  id: string;
  category_id: string;
  name: string;
  code?: string | null;
  sort_order?: number;
  is_active?: boolean;
  category?: OccupationCategory | null;
  created_at?: string;
  updated_at?: string;
}

export interface Workplace {
  id: string;
  name: string;
  district_id?: string | null;
  district?: District | null;
  neighborhood_id?: string | null;
  neighborhood?: Neighborhood | null;
  occupation_category_id?: string | null;
  occupation_category?: OccupationCategory | null;
  occupations?: Occupation[];
  address?: string | null;
  inn?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DetectionSource {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type DetectedCrimeQualification = 'PRE_INVESTIGATION' | 'CRIMINAL' | 'ADMINISTRATIVE';

export type SuspectCrimeRole =
  'TASHKILOTCHI' | 'ADMIN' | 'IJROCHI' | 'VOSITACHI' | 'KARTA_EGASI' | 'BOSHQA';

export type DetentionStatus = 'USHLANGAN' | 'QIDIRUVDA' | 'TILXATDA' | 'OZODLIKDA' | 'ANIQLANMOQDA';

export type EvidenceType =
  | 'PHONE'
  | 'LAPTOP_PC'
  | 'SIM_CARD'
  | 'STORAGE_MEDIA'
  | 'CRYPTO_WALLET'
  | 'BANK_CARD'
  | 'SCREENSHOT_VIDEO'
  | 'DOCUMENT'
  | 'CASH'
  | 'OTHER';

export interface DetectedCrimeSuspect {
  id?: string;
  detected_crime_id?: string;
  citizen_id: string;
  citizen?: Citizen | null;
  role_in_crime: SuspectCrimeRole;
  detention_status: DetentionStatus;
  is_repeat_offender?: boolean;
  notes?: string | null;
}

export interface DetectedCrimeEvidence {
  id?: string;
  detected_crime_id?: string;
  evidence_type: EvidenceType;
  title: string;
  identifier_value?: string | null;
  seized_at?: string | null;
  seized_from_citizen_id?: string | null;
  seized_from_citizen?: Citizen | null;
  file_key?: string | null;
  file_name?: string | null;
  notes?: string | null;
}

export interface DetectedCrimeStatusItem {
  id: string;
  name: string;
  code: string;
  color: string;
  is_default: boolean;
  is_final: boolean;
  sort_order: number;
  is_active: boolean;
}

export type DetectedCrimeMeasureType =
  | 'CARD_BLOCKED'
  | 'CHANNEL_BLOCKED'
  | 'DEVICE_SEIZED'
  | 'EXPERTISE_ORDERED'
  | 'SUSPECT_DETAINED'
  | 'SENT_TO_INVESTIGATION'
  | 'SENT_TO_COURT'
  | 'DAMAGE_RECOVERED'
  | 'TRANSFERRED_AGENCY'
  | 'OTHER';

export interface DetectedCrimeMeasure {
  id: string;
  measure_type: DetectedCrimeMeasureType;
  title: string;
  date?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface DetectedCrime {
  id: string;
  case_number: string | null;
  title: string;
  description?: string | null;
  report_number?: string | null;
  report_date?: string | null;
  kusp_number?: string | null;
  detected_at: string;
  qualification_type: DetectedCrimeQualification;
  crime_id?: string | null;
  crime?: Crime | null;
  crime_method_id?: string | null;
  crime_method?: CrimeMethod | null;
  mjtk_article?: string | null;
  detection_source_id?: string | null;
  detection_source?: DetectionSource | null;
  district_id?: string | null;
  district?: District | null;
  department_service_id?: string | null;
  department_service?: DepartmentService | null;
  platform?: string | null;
  channel_or_source_url?: string | null;
  suspect_tree?: SuspectTreeNode[] | null;
  estimated_damage?: number | null;
  officer_notes?: string | null;
  crime_status_id?: string | null;
  crime_status?: DetectedCrimeStatusItem | null;
  measures?: DetectedCrimeMeasure[] | null;
  status_id?: string | null;
  application_status?: ApplicationStatusItem | null;
  decision_type_id?: string | null;
  decision_type?: DecisionType | null;
  decision_number?: string | null;
  decision_date?: string | null;
  decision_note?: string | null;
  deadline_at?: string | null;
  sla_days?: number | null;
  extended_until?: string | null;
  extension_reason?: string | null;
  prosecutor_approval_number?: string | null;
  closed_at?: string | null;
  detected_by?: UserViewItem | null;
  created_by?: UserViewItem | null;
  suspects?: DetectedCrimeSuspect[];
  evidences?: DetectedCrimeEvidence[];
  created_at?: string;
  updated_at?: string;
}

export interface ApplicationSource {
  id: string;
  name: string;
  code?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DepartmentService {
  id: string;
  name: string;
  short_name?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RejectionReason {
  id: string;
  name: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DecisionType {
  id: string;
  name: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserViewItem {
  id: string;
  username: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  assigned_districts?: { id: string; name: string | null }[];
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
  neighborhood_id?: string | null;
  neighborhood?: Neighborhood | null;
  occupation_category_id?: string | null;
  occupation_category?: OccupationCategory | null;
  occupation_id?: string | null;
  occupation?: Occupation | null;
  workplace_id?: string | null;
  workplace?: Workplace | null;
  work_position?: string | null;
  cards?: Card[];
  phones?: PhoneRecord[];
  digital_identifiers?: DigitalIdentifierRecord[];
  applications?: Application[];
  created_at?: string;
  updated_at?: string;
}

export interface PhoneRecord {
  id: string;
  phone_number: string;
  formatted_number?: string | null;
  operator?: string | null;
  citizen_id?: string | null;
  citizen?: Citizen | null;
  is_primary?: boolean;
  label?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface DigitalIdentifierRecord {
  id: string;
  type: string;
  type_label?: string | null;
  raw_value: string;
  normalized_value: string;
  citizen_id?: string | null;
  citizen?: Citizen | null;
  notes?: string | null;
  created_at?: string;
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

export type TransferDestinationType =
  'CARD' | 'CRYPTO' | 'CASH' | 'PLATFORM' | 'BANK_ACCOUNT' | 'OTHER';

export interface TransferChannel {
  id: string;
  name: string;
  code: string;
  category: TransferDestinationType;
  color: string;
  icon: string;
  presets: string[];
  platform_label: string | null;
  platform_placeholder: string | null;
  value_label: string | null;
  value_placeholder: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
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
  destination_type?: TransferDestinationType;
  receiver_identifier_id?: string | null;
  receiver_identifier?: {
    id: string;
    type: string;
    type_label?: string | null;
    raw_value: string;
  } | null;
  destination_label?: string | null;
  destination_details?: Record<string, unknown> | null;
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
  deadline_at?: string | null;
  sla_days?: number | null;
  extended_until?: string | null;
  extension_reason?: string | null;
  prosecutor_approval_number?: string | null;
  prosecutor_approval_date?: string | null;
  decision_number?: string | null;
  decision_date?: string | null;
  decision_note?: string | null;
  closed_at?: string | null;
  status_history?: ApplicationStatusHistoryItem[];
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
  source_id?: string | null;
  source?: ApplicationSource | null;
  department_service_id?: string | null;
  department_service?: DepartmentService | null;
  rejection_reason_id?: string | null;
  rejection_reason?: RejectionReason | null;
  decision_type_id?: string | null;
  decision_type?: DecisionType | null;
  workplace_id?: string | null;
  workplace?: Workplace | null;
  work_position?: string | null;
  created_by_id?: string | null;
  created_by?: UserViewItem | null;
  is_deleted?: boolean;
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
    total_suspects_count?: number;
    total_multi_hop_count?: number;
    has_fraud_card_link: boolean;
  };
  card_relations: CardRelationItem[];
  citizen_relations: CitizenRelationItem[];
  suspect_relations?: {
    field_path: string;
    value: string;
    matched_with: string;
    linked_applications: LinkedApplicationInfo[];
  }[];
  clue_relations?: {
    id: string;
    entity_type: 'phone' | 'identifier';
    label: string;
    value: string;
    operator?: string | null;
    role_in_current_app: string;
    owner_citizen?: {
      id: string;
      full_name: string;
    } | null;
    target_route: string;
    linked_applications: DossierApplicationItem[];
  }[];
  multi_hop_chains?: MultiHopChainItem[];
  network_graph?: INetworkGraph;
  graph?: IGraphData;
}

export type EntityLinkRole = 'VICTIM' | 'SUSPECT' | 'DROPPER' | 'TRANSIT' | 'WITNESS' | 'RELATED';

export interface INetworkNode {
  id: string;
  entityId: string;
  nodeType: 'CITIZEN' | 'CARD' | 'PHONE' | 'IDENTIFIER' | 'APPLICATION';
  label: string;
  sublabel?: string;
  role: 'VICTIM' | 'SUSPECT' | 'DROPPER' | 'TRANSIT' | 'MIXED' | 'APPLICATION' | 'NEUTRAL';
  riskScore: number;
  appsCount: number;
  amount?: number;
  isCenter?: boolean;
  targetRoute: string;
}

export interface INetworkEdge {
  id: string;
  from: string;
  to: string;
  relationType: 'OWNERSHIP' | 'TRANSFER' | 'SUSPECT_CLUE' | 'VICTIM_LINK' | 'PROBABLE_MATCH';
  label: string;
  amount?: number;
  isDashed?: boolean;
}

export interface INetworkGraph {
  nodes: INetworkNode[];
  edges: INetworkEdge[];
}

export interface DossierApplicationItem {
  id: string;
  application_number: string;
  description: string | null;
  officer_notes?: string | null;
  status: string | null;
  status_label: string;
  status_color: string;
  date: string | null;
  district_id?: string | null;
  district_name?: string | null;
  crime_article?: string | null;
  crime_method?: string | null;
  victim_name?: string | null;
  victim_phone?: string | null;
  role_in_app: EntityLinkRole;
  link_source: string;
  match_reasons: string[];
  transfer_amount: number | null;
  currency: string;
  payment_provider?: string | null;
  can_edit: boolean;
}

export interface MultiHopChainItem {
  target_application: DossierApplicationItem;
  hops_count: number;
  chain_steps: string[];
  intermediate_entities: {
    type: string;
    label: string;
    route: string;
  }[];
}

export interface ProbableMatchItem {
  id: string;
  match_type: 'CARD_OWNER_NAME' | 'MASKED_CARD_DIGITS' | 'SIMILAR_CITIZEN_NAME';
  confidence: number;
  title: string;
  subtitle: string;
  reason: string;
  target_entity_type: 'card' | 'citizen';
  target_entity_id: string;
  target_route: string;
  linked_apps_count: number;
  total_amount: number;
  confirm_action: {
    action_type: 'BIND_CARD_TO_CITIZEN' | 'LINK_CITIZEN_TO_CARD';
    citizen_id: string;
    card_id: string;
  };
}

export interface CoOccurringClueItem {
  id: string;
  entity_type: 'card' | 'phone' | 'identifier' | 'citizen';
  type_label: string;
  value: string;
  owner_name?: string | null;
  shared_apps_count: number;
  role: string;
  target_route: string;
}

export interface DossierMicroStats {
  totalApplications: number;
  victimAppsCount: number;
  suspectOrDropperAppsCount: number;
  witnessAppsCount: number;
  isCrossRoleCollision: boolean;
  totalLossInLinkedApps: number;
  totalIncomingAmount: number;
  totalOutgoingAmount: number;
  netFlowAmount: number;
  transactionsCount: number;
  avgTransactionAmount: number;
  maxTransactionAmount: number;
  firstSeenDate: string | null;
  lastSeenDate: string | null;
  activeSpanDays: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskLabel: string;
  hourlyDistribution: { slot: string; count: number; amount: number }[];
  byDistrict: { name: string; count: number; loss: number }[];
  byPaymentProvider: { name: string; count: number; amount: number }[];
  byCrime: { article: string; title: string | null; count: number }[];
}

export interface DossierTransferItem {
  id: string;
  transaction_id: string | null;
  direction: 'INCOMING' | 'OUTGOING' | 'INTERNAL';
  amount: number;
  currency: string;
  transfer_date: string | null;
  transfer_time: string | null;
  payment_provider: string | null;
  sender_card_id: string | null;
  sender_card_number: string | null;
  sender_owner_name: string | null;
  receiver_card_id: string | null;
  receiver_card_number: string | null;
  receiver_owner_name: string | null;
  application_id: string | null;
  application_number: string | null;
  images: string[];
}

export interface GlobalSearchResultItem {
  id: string;
  category: 'citizens' | 'cards' | 'phones' | 'identifiers' | 'applications' | 'transfers';
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeVariant: 'danger' | 'warning' | 'info' | 'success' | 'neutral';
  appsCount: number;
  totalAmount: number;
  riskScore: number;
  targetRoute: string;
}

export interface GlobalSearchResponse {
  query: string;
  totalCount: number;
  items: GlobalSearchResultItem[];
  countsByCategory: Record<string, number>;
}

export interface LiveRadarResponse {
  found: boolean;
  entityType?: 'card' | 'phone' | 'identifier' | 'citizen';
  entityId?: string;
  title?: string;
  subtitle?: string;
  targetRoute?: string;
  ownerCitizen?: {
    id: string;
    fullName: string;
    phone?: string | null;
  } | null;
  appsCount: number;
  suspectCount: number;
  victimCount: number;
  totalLoss: number;
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recentApplications: {
    id: string;
    application_number: string;
    role: string;
    date: string | null;
    amount: number | null;
  }[];
}

export interface FullDossierResponse {
  entityType: 'citizen' | 'card' | 'phone' | 'identifier';
  canMutate: boolean;
  citizen?: Citizen | null;
  card?: (Card & { inferred_bank_name?: string }) | null;
  phone?: PhoneRecord | null;
  identifier?: DigitalIdentifierRecord | null;
  ownedCards: Card[];
  ownedPhones: PhoneRecord[];
  ownedIdentifiers: DigitalIdentifierRecord[];
  stats: DossierMicroStats;
  directApplications: DossierApplicationItem[];
  multiHopChains: MultiHopChainItem[];
  probableMatches: ProbableMatchItem[];
  transfers: DossierTransferItem[];
  coOccurringClues: CoOccurringClueItem[];
  evidenceFiles: {
    url: string;
    title: string;
    application_id: string;
    application_number: string;
    is_image: boolean;
  }[];
  networkGraph: INetworkGraph;
  financialGraph: IGraphData;
}

export type GraphCardRole =
  | 'MULE_DROPPER'
  | 'TRANSIT'
  | 'VICTIM_SOURCE'
  | 'COMPROMISED_VICTIM'
  | 'ATM_TERMINAL'
  | 'CRYPTO_CASHOUT'
  | 'PLATFORM_CASHOUT'
  | 'BANK_ACCOUNT_OUT';

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
  destinationType?: string;
  identifierId?: string;
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
