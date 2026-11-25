import type { UploadedFile } from '@/lib/api';
import type {
  AppealType,
  ApplicantType,
  ApplicationRepeatType,
  ApplicationStatus,
  SubmissionForm,
  Workplace,
} from '@/types/models';

import type {
  AppCustomFieldState,
  FinancialTransferEntry,
  NonCardDamageEntry,
} from './application-form.types';

export interface ApplicationCreateDraft {
  v: 1;
  savedAt: string;
  applicationNumber: string;
  description: string;
  officerNotes: string;
  suspectTree: unknown[];
  status: ApplicationStatus;
  statusId: string | null;
  sourceId: string | null;
  awarenessStatusId?: string | null;
  awarenessNote?: string;
  date: string;
  appealType: AppealType;
  submissionForm: SubmissionForm;
  applicantType: ApplicantType;
  repeatType: ApplicationRepeatType;
  parentApplicationId: string | null;
  repeatReason: string;
  isReviewTerminated: boolean;
  terminationNote: string;
  selectedCitizenId: string | null;
  citizenForm: {
    first_name: string;
    last_name: string;
    middle_name: string;
    passport: string;
    phone_number: string;
    pinfl: string;
    address: string;
    birth_date: string;
    gender: 'male' | 'female' | '';
  };
  occupationCategoryId: string | null;
  occupationId: string | null;
  selectedWorkplace: Workplace | null;
  workPosition: string;
  citizenDistrictId: string | null;
  citizenMahallaId: string | null;
  selectedDistrictId: string | null;
  districtForm: { name: string };
  selectedCrimeId: string | null;
  selectedCrimeMethodId: string | null;
  crimeForm: { article: string };
  methodFieldValues: Record<string, string>;
  departmentServiceId: string | null;
  decisionTypeId: string | null;
  rejectionReasonId: string | null;
  slaDays: string;
  decisionNumber: string;
  decisionDate: string;
  decisionNote: string;
  hasFinancialLoss: boolean;
  financialTransfers: FinancialTransferEntry[];
  hasNonCardDamage?: boolean;
  nonCardDamages?: NonCardDamageEntry[];
  evidenceFiles: UploadedFile[];
  customFields: AppCustomFieldState[];
}

function getDraftKey(userId?: string | null): string {
  return `uvd_application_create_draft_v1_${userId || 'default'}`;
}

export function loadApplicationDraft(userId?: string | null): ApplicationCreateDraft | null {
  try {
    const raw = window.localStorage.getItem(getDraftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ApplicationCreateDraft>;
    if (!parsed || parsed.v !== 1) return null;
    return parsed as ApplicationCreateDraft;
  } catch {
    return null;
  }
}

export function saveApplicationDraft(
  userId: string | null | undefined,
  draft: ApplicationCreateDraft,
): void {
  try {
    window.localStorage.setItem(getDraftKey(userId), JSON.stringify(draft));
  } catch {
    // localStorage cheklangan yoki to'lgan bo'lsa xatolik chiqarmaymiz
  }
}

export function clearApplicationDraft(userId?: string | null): void {
  try {
    window.localStorage.removeItem(getDraftKey(userId));
  } catch {
    // ignore
  }
}
