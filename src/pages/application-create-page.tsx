import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertOctagon,
  BookmarkCheck,
  Building2,
  CheckCircle2,
  FileText,
  Layers,
  Loader2,
  MapPin,
  Megaphone,
  Plus,
  Radio,
  RotateCcw,
  Save,
  Scale,
  Server,
  Shield,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { AppealClassificationCard } from '@/components/applications/appeal-classification-card';
import {
  type ApplicationCreateDraft,
  clearApplicationDraft,
  loadApplicationDraft,
  saveApplicationDraft,
} from '@/components/applications/application-draft.storage';
import type {
  AppCustomFieldState,
  FinancialTransferEntry,
  NonCardDamageEntry,
} from '@/components/applications/application-form.types';
import { EmploymentSectionCard } from '@/components/applications/employment-section-card';
import { EvidenceAndCitizensSection } from '@/components/applications/evidence-and-citizens-section';
import { FinancialTransfersSection } from '@/components/applications/financial-transfers-section';
import { NonCardDamagesSection } from '@/components/applications/non-card-damages-section';
import { SuspectTreeBuilder } from '@/components/applications/suspect-tree-builder';
import { CreateWordDialog } from '@/components/documents/create-word-dialog';
import { DocumentEditorModal } from '@/components/documents/document-editor-modal';
import { TemplateGeneratorModal } from '@/components/documents/template-generator-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DistrictSearchSelect } from '@/components/ui/district-search-select';
import { FemaleIcon, MaleIcon } from '@/components/ui/gender-icons';
import { Input } from '@/components/ui/input';
import { MahallaSearchSelect } from '@/components/ui/mahalla-search-select';
import { PhoneInput } from '@/components/ui/phone-input';
import { QuickLocationDialog } from '@/components/ui/quick-location-dialog';
import { toast } from '@/components/ui/sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermissions } from '@/hooks/use-permissions';
import {
  applicationsApi,
  applicationSourcesApi,
  applicationStatusesApi,
  awarenessStatusesApi,
  banksApi,
  cardsApi,
  citizensApi,
  crimeMethodsApi,
  crimesApi,
  decisionTypesApi,
  departmentServicesApi,
  districtsApi,
  documentsApi,
  externalSystemsApi,
  filesApi,
  neighborhoodsApi,
  occupationCategoriesApi,
  occupationsApi,
  paymentProvidersApi,
  rejectionReasonsApi,
  type UploadedFile,
} from '@/lib/api';
import { formatLocalDateISO, toLocalDateInputValue } from '@/lib/date';
import { getErrorMessage } from '@/lib/error';
import { formatAmountInput, formatTitleCase, formatUzbekName } from '@/lib/formatters';
import { useAuthStore } from '@/store';
import type {
  AppealType,
  ApplicantType,
  ApplicationRepeatType,
  ApplicationStatus,
  Citizen,
  CrimeMethod,
  CustomFieldType,
  SubmissionForm,
} from '@/types/models';

export type {
  AppCustomFieldState,
  FinancialTransferEntry,
  NonCardDamageEntry,
} from '@/components/applications/application-form.types';

let transferClientIdCounter = 0;
const createDefaultTransferEntry = (): FinancialTransferEntry => ({
  clientId: `ft_${++transferClientIdCounter}`,
  victimCardId: null,
  victimCardNumber: '',
  victimCardFullName: '',
  victimBankName: '',
  transferId: null,
  transactionId: '',
  amount: '',
  currency: 'UZS',
  providerId: null,
  providerName: '',
  transferDate: '',
  transferTime: '',
  destinationType: 'CARD',
  destinationPlatform: '',
  destinationValue: '',
  destinationLabel: '',
  receiverCardId: null,
  receiverCardNumber: '',
  receiverCardFullName: '',
  receiverBankName: '',
});

let damageClientIdCounter = 0;
const createDefaultNonCardDamageEntry = (): NonCardDamageEntry => ({
  clientId: `ncd_${++damageClientIdCounter}`,
  damageType: 'ONLINE_CREDIT',
  organizationName: '',
  amount: '',
  currency: 'UZS',
  contractNumber: '',
  damageDate: '',
  description: '',
  recipientInfo: '',
});

export function ApplicationCreatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { canWrite } = usePermissions();
  const currentUserId = useAuthStore((s) => s.user?.id || null);

  // URL ?parentId=... orqali ochilgan bo'lsa eski qoralama ustiga yozmasin
  const initialSearchParams = new URLSearchParams(location.search);
  const initialParentParam = !id ? initialSearchParams.get('parentId') : null;
  const initialRepeatParam = !id
    ? (initialSearchParams.get('repeatType') as ApplicationRepeatType | null)
    : null;
  const validInitialRepeat: ApplicationRepeatType =
    initialRepeatParam === 'REPEAT' ||
    initialRepeatParam === 'DUPLICATE' ||
    initialRepeatParam === 'SUPPLEMENTAL'
      ? initialRepeatParam
      : 'PRIMARY';

  // Faqat yangi ariza yaratishda (!id va parentId siz) localStorage dan qoralamani tiklash
  const [restoredDraft] = useState<ApplicationCreateDraft | null>(() =>
    !id && !initialParentParam ? loadApplicationDraft(currentUserId) : null,
  );
  const [wasDraftRestored, setWasDraftRestored] = useState<boolean>(() => Boolean(restoredDraft));
  const draftClearedRef = useRef(false);

  const [quickLocationState, setQuickLocationState] = useState<{
    open: boolean;
    initialRegionId?: string | null;
    initialDistrictId?: string | null;
    initialDistrictQuery?: string;
    initialNeighborhoodQuery?: string;
  }>({ open: false });

  const [canLeave, setCanLeave] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // ==========================================================================
  // 1. ASOSIY ARIZA QAYD REKVIZITLARI
  // ==========================================================================
  const [applicationNumber, setApplicationNumber] = useState(
    () => restoredDraft?.applicationNumber || '',
  );
  const [applicationNumberTouched, setApplicationNumberTouched] = useState(false);
  const showAppNumberWarning = applicationNumberTouched && !applicationNumber.trim();
  const [description, setDescription] = useState(() => restoredDraft?.description || '');
  const [officerNotes, setOfficerNotes] = useState(() => restoredDraft?.officerNotes || '');
  const [suspectTree, setSuspectTree] = useState<unknown[]>(() =>
    Array.isArray(restoredDraft?.suspectTree) ? restoredDraft.suspectTree : [],
  );
  const [status, setStatus] = useState<ApplicationStatus>(() => restoredDraft?.status || 'YANGI');
  const [statusId, setStatusId] = useState<string | null>(() => restoredDraft?.statusId ?? null);
  const [sourceId, setSourceId] = useState<string | null>(() => restoredDraft?.sourceId ?? null);
  const [awarenessStatusId, setAwarenessStatusId] = useState<string | null>(
    () => restoredDraft?.awarenessStatusId ?? null,
  );
  const [awarenessNote, setAwarenessNote] = useState(() => restoredDraft?.awarenessNote || '');
  const [awarenessInformedExpanded, setAwarenessInformedExpanded] = useState(false);
  const [externalSystemIds, setExternalSystemIds] = useState<string[]>(() =>
    Array.isArray(restoredDraft?.externalSystemIds) ? restoredDraft.externalSystemIds : [],
  );
  const [date, setDate] = useState(() => restoredDraft?.date || formatLocalDateISO());

  // 1.1. Murojaat tasnifi va takroriy/dublikat zanjiri (O'RQ-445)
  const [appealType, setAppealType] = useState<AppealType>(
    () => restoredDraft?.appealType || 'APPEAL',
  );
  const [submissionForm, setSubmissionForm] = useState<SubmissionForm>(
    () => restoredDraft?.submissionForm || 'WRITTEN',
  );
  const [applicantType, setApplicantType] = useState<ApplicantType>(
    () => restoredDraft?.applicantType || 'INDIVIDUAL',
  );
  const [repeatType, setRepeatType] = useState<ApplicationRepeatType>(() =>
    initialParentParam ? validInitialRepeat : restoredDraft?.repeatType || validInitialRepeat,
  );
  const [parentApplicationId, setParentApplicationId] = useState<string | null>(
    () => initialParentParam || restoredDraft?.parentApplicationId || null,
  );
  const [repeatReason, setRepeatReason] = useState(() => restoredDraft?.repeatReason || '');
  const [isReviewTerminated, setIsReviewTerminated] = useState(() =>
    Boolean(restoredDraft?.isReviewTerminated),
  );
  const [terminationNote, setTerminationNote] = useState(
    () => restoredDraft?.terminationNote || '',
  );
  const copiedParentRef = useRef<string | null>(null);

  // ==========================================================================
  // 2. ARIZACHI FUQARO ANKETASI
  // ==========================================================================
  const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(
    () => restoredDraft?.selectedCitizenId ?? null,
  );
  const [citizenForm, setCitizenForm] = useState(() => {
    const saved = restoredDraft?.citizenForm;
    if (saved) {
      const legacyFullName = [saved.last_name, saved.first_name, saved.middle_name]
        .filter((p): p is string => Boolean(p && p.trim()))
        .join(' ');
      return {
        full_name: saved.full_name ?? legacyFullName,
        passport: saved.passport || '',
        phone_number: saved.phone_number || '',
        pinfl: saved.pinfl || '',
        address: saved.address || '',
        birth_date: saved.birth_date || '',
        gender: (saved.gender || '') as 'male' | 'female' | '',
      };
    }
    return {
      full_name: '',
      passport: '',
      phone_number: '',
      pinfl: '',
      address: '',
      birth_date: '',
      gender: '' as 'male' | 'female' | '',
    };
  });
  const [showCitizenPopover, setShowCitizenPopover] = useState(false);
  const citizenPopoverRef = useRef<HTMLDivElement>(null);

  // Fuqaroning kasbi va ish joyi
  const [occupationCategoryId, setOccupationCategoryId] = useState<string | null>(
    () => restoredDraft?.occupationCategoryId ?? null,
  );
  const [occupationId, setOccupationId] = useState<string | null>(
    () => restoredDraft?.occupationId ?? null,
  );
  const [selectedWorkplace, setSelectedWorkplace] = useState<
    import('@/types/models').Workplace | null
  >(() => restoredDraft?.selectedWorkplace ?? null);
  const [workPosition, setWorkPosition] = useState<string>(() => restoredDraft?.workPosition || '');

  // Fuqaroning yashash tumani va mahallasi
  const [citizenDistrictId, setCitizenDistrictId] = useState<string | null>(
    () => restoredDraft?.citizenDistrictId ?? null,
  );
  const [citizenMahallaId, setCitizenMahallaId] = useState<string | null>(
    () => restoredDraft?.citizenMahallaId ?? null,
  );
  const [showUnlinkCitizenConfirm, setShowUnlinkCitizenConfirm] = useState(false);

  // ==========================================================================
  // 3. HODISA HUDUDI VA JINOYAT MODDASI
  // ==========================================================================
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    () => restoredDraft?.selectedDistrictId ?? null,
  );
  const [districtForm, setDistrictForm] = useState(
    () => restoredDraft?.districtForm || { name: '' },
  );

  const [selectedCrimeId, setSelectedCrimeId] = useState<string | null>(
    () => restoredDraft?.selectedCrimeId ?? null,
  );
  const [selectedCrimeMethodId, setSelectedCrimeMethodId] = useState<string | null>(
    () => restoredDraft?.selectedCrimeMethodId ?? null,
  );
  const [crimeForm, setCrimeForm] = useState<{
    article: string;
  }>(() => restoredDraft?.crimeForm || { article: '' });

  // Sohaviy xizmat, SLA va yakuniy qaror
  const [departmentServiceId, setDepartmentServiceId] = useState<string | null>(
    () => restoredDraft?.departmentServiceId ?? null,
  );
  const [decisionTypeId, setDecisionTypeId] = useState<string | null>(
    () => restoredDraft?.decisionTypeId ?? null,
  );
  const [rejectionReasonId, setRejectionReasonId] = useState<string | null>(
    () => restoredDraft?.rejectionReasonId ?? null,
  );
  const [slaDays, setSlaDays] = useState<string>(() => restoredDraft?.slaDays || '');
  const [decisionNumber, setDecisionNumber] = useState<string>(
    () => restoredDraft?.decisionNumber || '',
  );
  const [decisionDate, setDecisionDate] = useState<string>(() => restoredDraft?.decisionDate || '');
  const [decisionNote, setDecisionNote] = useState<string>(() => restoredDraft?.decisionNote || '');

  // ==========================================================================
  // 4. MOLIYAVIY ZARAR VA TRANZAKSIYA SHAKLLARI
  // ==========================================================================
  const [hasFinancialLoss, setHasFinancialLoss] = useState(() =>
    Boolean(restoredDraft?.hasFinancialLoss),
  );

  const [financialTransfers, setFinancialTransfers] = useState<FinancialTransferEntry[]>(() =>
    Array.isArray(restoredDraft?.financialTransfers) && restoredDraft.financialTransfers.length > 0
      ? restoredDraft.financialTransfers
      : [createDefaultTransferEntry()],
  );

  const [activeTransferPopover, setActiveTransferPopover] = useState<{
    index: number;
    type: 'victimCard' | 'receiverCard';
  } | null>(null);
  const transferContainerRef = useRef<HTMLDivElement>(null);

  const handleUpdateTransferEntry = (index: number, patch: Partial<FinancialTransferEntry>) => {
    setFinancialTransfers((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    );
  };

  const handleAddTransferEntry = () => {
    setFinancialTransfers((prev) => [...prev, createDefaultTransferEntry()]);
  };

  const handleRemoveTransferEntry = (index: number) => {
    setFinancialTransfers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleFillApplicantName = (index: number) => {
    const fullName = citizenForm.full_name.trim();
    if (!fullName) {
      toast.info('Avval 1-bo‘limda arizachining F.I.SH. ma‘lumotlarini kiriting');
      return;
    }
    handleUpdateTransferEntry(index, { victimCardFullName: fullName.toUpperCase() });
    toast.success('Arizachining F.I.SH. ma‘lumoti kartaga nusxalandi');
  };

  // ==========================================================================
  // 4.5. KARTASIZ MODDIY ZARARLAR (ONLAYN KREDIT, NASIYA, MULK / XIZMAT)
  // ==========================================================================
  const [hasNonCardDamage, setHasNonCardDamage] = useState(() =>
    Boolean(restoredDraft?.hasNonCardDamage),
  );

  const [nonCardDamages, setNonCardDamages] = useState<NonCardDamageEntry[]>(() =>
    Array.isArray(restoredDraft?.nonCardDamages) && restoredDraft.nonCardDamages.length > 0
      ? restoredDraft.nonCardDamages
      : [createDefaultNonCardDamageEntry()],
  );

  const handleUpdateDamageEntry = (index: number, patch: Partial<NonCardDamageEntry>) => {
    setNonCardDamages((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    );
  };

  const handleAddDamageEntry = () => {
    setNonCardDamages((prev) => [...prev, createDefaultNonCardDamageEntry()]);
  };

  const handleRemoveDamageEntry = (index: number) => {
    setNonCardDamages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddSuspectClueFromDamage = (rawValue: string, note: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    const digits = trimmed.replace(/\D/g, '');
    let fieldKey = 'other_info';
    let fieldLabel = 'Boshqa maʼlumot (Izoh)';
    if (digits.length === 16 && /^(8600|9860|5614|4|5|62)/.test(digits)) {
      fieldKey = 'card_number';
      fieldLabel = 'Bank plastik karta';
    } else if (digits.length === 20) {
      fieldKey = 'bank_account';
      fieldLabel = 'Bank hisob raqami';
    } else if (/^\+?998\d{9}$/.test(trimmed.replace(/[\s\-()]/g, '')) || /^9\d{8}$/.test(digits)) {
      fieldKey = 'phone_number';
      fieldLabel = 'Telefon raqami';
    } else if (trimmed.startsWith('@') || /t\.me\//i.test(trimmed)) {
      fieldKey = 'telegram_username';
      fieldLabel = 'Telegram Username';
    } else if (/^(T[1-9A-HJ-NP-Za-km-z]{33}|0x[a-fA-F0-9]{40})$/.test(trimmed)) {
      fieldKey = 'crypto_wallet';
      fieldLabel = 'Kripto-hamyon';
    } else if (/^(https?:\/\/|www\.)/i.test(trimmed)) {
      fieldKey = 'website_domain';
      fieldLabel = 'Phishing sayt / Havola';
    }

    setSuspectTree((prev) => [
      ...prev,
      {
        id: `damage-clue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        field_key: fieldKey,
        field_label: fieldLabel,
        value: trimmed,
        note,
      },
    ]);
    toast.success('Gumonlanuvchi belgilariga (2.1-bo‘lim) qo‘shildi', {
      description: `${fieldLabel}: ${trimmed}`,
    });
  };

  // ==========================================================================
  // 5. YAGONA ISBOTLAR VA DALILLAR (MinIO)
  // ==========================================================================
  const [evidenceFiles, setEvidenceFiles] = useState<UploadedFile[]>(() =>
    Array.isArray(restoredDraft?.evidenceFiles) ? restoredDraft.evidenceFiles : [],
  );
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [isDraggingEvidence, setIsDraggingEvidence] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // ==========================================================================
  // 6. QO'SHIMCHA SUBYEKTLAR (APPLICATION CUSTOM FIELDS)
  // ==========================================================================
  const [customFields, setCustomFields] = useState<AppCustomFieldState[]>(() =>
    Array.isArray(restoredDraft?.customFields) ? restoredDraft.customFields : [],
  );

  // ==========================================================================
  // WORD HUJJATLARI (.DOCX / ONLYOFFICE)
  // ==========================================================================
  const [activeEditingDocId, setActiveEditingDocId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ id: string; title: string } | null>(null);
  const wordFileInputRef = useRef<HTMLInputElement>(null);

  const [wordDialogState, setWordDialogState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'upload';
    file: File | null;
  }>({
    isOpen: false,
    mode: 'create',
    file: null,
  });

  const [templateModalState, setTemplateModalState] = useState<{
    isOpen: boolean;
    initialTemplateId?: string;
  }>({
    isOpen: false,
    initialTemplateId: 'tushuntirish-telegram',
  });

  const { data: appDocuments = [], refetch: refetchDocuments } = useQuery({
    queryKey: ['application-documents', id],
    queryFn: () => (id ? documentsApi.getByApplication(id) : []),
    enabled: !!id,
  });

  const createBlankDocMutation = useMutation({
    mutationFn: (title?: string) => documentsApi.createBlank(id as string, title),
    onSuccess: (newDoc) => {
      toast.success('Yangi Word rasmiy hujjati yaratildi');
      queryClient.invalidateQueries({ queryKey: ['application-documents', id] });
      setActiveEditingDocId(newDoc.id);
    },
    onError: (err) => {
      toast.error(`Hujjat yaratishda xatolik: ${getErrorMessage(err)}`);
    },
  });

  const uploadWordMutation = useMutation({
    mutationFn: async ({ file, title }: { file: File; title?: string }) => {
      if (!id) return;
      return documentsApi.upload(id, file, title);
    },
    onSuccess: (newDoc) => {
      toast.success('Word hujjati muvaffaqiyatli yuklandi');
      queryClient.invalidateQueries({ queryKey: ['application-documents', id] });
      if (newDoc?.id) {
        setActiveEditingDocId(newDoc.id);
      }
    },
    onError: (err) => {
      toast.error(`Word faylini yuklashda xatolik: ${getErrorMessage(err)}`);
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(docId),
    onSuccess: () => {
      toast.success('Hujjat o‘chirildi');
      queryClient.invalidateQueries({ queryKey: ['application-documents', id] });
    },
    onError: (err) => {
      toast.error(`Hujjatni o‘chirishda xatolik: ${getErrorMessage(err)}`);
    },
  });

  // ==========================================================================
  // QUERY & DATA FETCHING
  // ==========================================================================
  const hydratedAppIdRef = useRef<string | null>(null);
  const { data: initialApp, isLoading } = useQuery({
    queryKey: ['application-draft', id],
    queryFn: () => applicationsApi.getOne(id as string),
    enabled: !!id,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const isExplicitEditRoute = location.pathname.includes('/applications/edit/');
  const isEditMode =
    isExplicitEditRoute ||
    Boolean(
      initialApp &&
      ((initialApp.application_number && initialApp.application_number.trim() !== '') ||
        initialApp.citizen_id ||
        initialApp.citizen ||
        (initialApp.status && initialApp.status !== 'YANGI')),
    );

  // 500ms (0.5 soniya) kechiktirish (debounce) - yozish to'xtagandan keyin so'rov ketadi
  const debouncedCitizenForm = useDebounce(citizenForm, 500);

  const isCitizenSearchActive = Boolean(
    debouncedCitizenForm.full_name.trim() ||
    debouncedCitizenForm.phone_number.trim() ||
    debouncedCitizenForm.passport.trim() ||
    debouncedCitizenForm.pinfl.trim(),
  );

  const { data: searchedCitizensData, isFetching: isSearchingCitizens } = useQuery({
    queryKey: [
      'citizens-live-search',
      debouncedCitizenForm.full_name.trim(),
      debouncedCitizenForm.phone_number.trim(),
      debouncedCitizenForm.passport.trim(),
      debouncedCitizenForm.pinfl.trim(),
    ],
    queryFn: () =>
      citizensApi.getAll({
        full_name: debouncedCitizenForm.full_name.trim() || undefined,
        phone_number: debouncedCitizenForm.phone_number.trim() || undefined,
        passport: debouncedCitizenForm.passport.trim() || undefined,
        pinfl: debouncedCitizenForm.pinfl.trim() || undefined,
        limit: 8,
      }),
    enabled: isCitizenSearchActive && !selectedCitizenId,
    placeholderData: (prev) => prev,
  });

  const matchedCitizens =
    isCitizenSearchActive && !selectedCitizenId ? searchedCitizensData?.items || [] : [];

  const { data: districtsData } = useQuery({
    queryKey: ['districts-autocomplete'],
    queryFn: () => districtsApi.getAll({ limit: 500 }),
  });
  const allDistricts = districtsData?.items || [];

  const { data: citizenMahallasData, isLoading: isLoadingCitizenMahallas } = useQuery({
    queryKey: ['citizen-neighborhoods', citizenDistrictId],
    queryFn: () => neighborhoodsApi.getAll({ district_id: citizenDistrictId!, limit: 200 }),
    enabled: Boolean(citizenDistrictId),
  });
  const allCitizenMahallas = citizenMahallasData?.items || [];

  const { data: crimesData } = useQuery({
    queryKey: ['crimes-autocomplete'],
    queryFn: () => crimesApi.getAll({ limit: 100 }),
  });
  const allCrimes = crimesData?.items || [];

  const sortedCrimes = useMemo(() => {
    const priorityList = [
      'фирибгарлик',
      'ўғрилик',
      'ҳақорат қилиш',
      'расм тарқатиш',
      'бошқа',
      'адашиб ташлаган',
    ];
    return [...allCrimes].sort((a, b) => {
      const aText = (a.article || a.title || '').trim().toLowerCase();
      const bText = (b.article || b.title || '').trim().toLowerCase();
      const aIdx = priorityList.indexOf(aText);
      const bIdx = priorityList.indexOf(bText);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return aText.localeCompare(bText);
    });
  }, [allCrimes]);

  const { data: crimeMethodsData } = useQuery({
    queryKey: ['crime-methods-active', selectedCrimeId],
    queryFn: () => crimeMethodsApi.getAllActive(selectedCrimeId || undefined),
  });
  const allCrimeMethods = crimeMethodsData || [];

  const [methodFieldValues, setMethodFieldValues] = useState<Record<string, string>>(
    () => restoredDraft?.methodFieldValues || {},
  );

  const selectedCrimeMethod = useMemo(
    () => allCrimeMethods.find((m) => m.id === selectedCrimeMethodId) || null,
    [allCrimeMethods, selectedCrimeMethodId],
  );

  const activeMethodFields = useMemo(
    () => (selectedCrimeMethod?.fields || []).filter((f) => f.is_active !== false),
    [selectedCrimeMethod],
  );

  const groupedCrimeMethods = useMemo(() => {
    const groups: Record<string, CrimeMethod[]> = {};
    for (const method of allCrimeMethods) {
      const g = method.group_name || 'Boshqa holatlar';
      if (!groups[g]) groups[g] = [];
      groups[g].push(method);
    }
    return groups;
  }, [allCrimeMethods]);

  const currentActiveTransfer =
    activeTransferPopover !== null ? financialTransfers[activeTransferPopover.index] : null;

  const activeVictimCardDigits = (currentActiveTransfer?.victimCardNumber || '').replace(/\D/g, '');
  const activeReceiverCardDigits = (currentActiveTransfer?.receiverCardNumber || '').replace(
    /\D/g,
    '',
  );
  const debouncedVictimCardQuery = useDebounce(activeVictimCardDigits, 250);
  const debouncedReceiverCardQuery = useDebounce(activeReceiverCardDigits, 250);

  const { data: victimCardsSearchData } = useQuery({
    queryKey: ['cards-search-victim', debouncedVictimCardQuery],
    queryFn: () => cardsApi.getAll({ search: debouncedVictimCardQuery, limit: 15 }),
    enabled: activeTransferPopover?.type === 'victimCard' && debouncedVictimCardQuery.length >= 4,
    placeholderData: (prev) => prev,
  });

  const { data: receiverCardsSearchData } = useQuery({
    queryKey: ['cards-search-receiver', debouncedReceiverCardQuery],
    queryFn: () => cardsApi.getAll({ search: debouncedReceiverCardQuery, limit: 15 }),
    enabled:
      activeTransferPopover?.type === 'receiverCard' && debouncedReceiverCardQuery.length >= 4,
    placeholderData: (prev) => prev,
  });

  const { data: banksData } = useQuery({
    queryKey: ['banks-autocomplete'],
    queryFn: () => banksApi.getAll({ limit: 100 }),
  });
  const allBanks = banksData?.items || [];

  const { data: providersData } = useQuery({
    queryKey: ['providers-autocomplete'],
    queryFn: () => paymentProvidersApi.getAll({ limit: 100 }),
  });
  const allProviders = providersData?.items || [];

  const { data: statusesData } = useQuery({
    queryKey: ['application-statuses-autocomplete'],
    queryFn: () => applicationStatusesApi.getAll({ limit: 100 }),
  });
  const allApplicationStatuses = statusesData?.items || [];

  // Murojaat manbalari
  const { data: sourcesData } = useQuery({
    queryKey: ['application-sources-select'],
    queryFn: () => applicationSourcesApi.getAll(),
  });
  const allApplicationSources = sourcesData || [];

  // Targ'ibot holatlari (Fuqaro targ'ibot qilinganmi?)
  const { data: awarenessStatusesData } = useQuery({
    queryKey: ['awareness-statuses-active'],
    queryFn: () => awarenessStatusesApi.getAll(),
  });
  const allAwarenessStatuses = useMemo(() => awarenessStatusesData || [], [awarenessStatusesData]);
  const notInformedStatus = useMemo(
    () => allAwarenessStatuses.find((s) => !s.is_informed) || null,
    [allAwarenessStatuses],
  );
  const informedAwarenessStatuses = useMemo(
    () => allAwarenessStatuses.filter((s) => s.is_informed),
    [allAwarenessStatuses],
  );
  const selectedAwarenessStatus = useMemo(
    () => allAwarenessStatuses.find((s) => s.id === awarenessStatusId) || null,
    [allAwarenessStatuses, awarenessStatusId],
  );
  const isInformedModeActive =
    Boolean(selectedAwarenessStatus?.is_informed) || awarenessInformedExpanded;
  const isNotInformedSelected =
    Boolean(awarenessStatusId) &&
    Boolean(selectedAwarenessStatus && !selectedAwarenessStatus.is_informed);

  // Tashqi tizimlar (CardBlock, E-Elektron, E-Material, CyberControl...)
  const { data: externalSystemsData } = useQuery({
    queryKey: ['external-systems-active'],
    queryFn: () => externalSystemsApi.getAll(),
  });
  const allExternalSystems = useMemo(() => externalSystemsData || [], [externalSystemsData]);

  const toggleExternalSystemSelection = (systemId: string, entered: boolean) => {
    setExternalSystemIds((prev) => {
      if (entered) {
        return prev.includes(systemId) ? prev : [...prev, systemId];
      }
      return prev.filter((item) => item !== systemId);
    });
  };

  // Kasb toifalari
  const { data: occupationCategoriesData } = useQuery({
    queryKey: ['occupation-categories-select'],
    queryFn: () => occupationCategoriesApi.getAll(),
  });
  const allOccupationCategories = occupationCategoriesData || [];

  // Kasblar (Tanlangan toifa bo'yicha)
  const { data: occupationsData } = useQuery({
    queryKey: ['occupations-select', occupationCategoryId],
    queryFn: () => occupationsApi.getAll({ category_id: occupationCategoryId || undefined }),
    enabled: !!occupationCategoryId,
  });
  const availableOccupations = occupationsData || [];

  // Sohaviy xizmatlar
  const { data: departmentServicesData } = useQuery({
    queryKey: ['department-services-select'],
    queryFn: () => departmentServicesApi.getAll(),
  });
  const allDepartmentServices = departmentServicesData || [];

  // Qaror turlari
  const { data: decisionTypesData } = useQuery({
    queryKey: ['decision-types-select'],
    queryFn: () => decisionTypesApi.getAll(),
  });
  const allDecisionTypes = decisionTypesData || [];

  // Rad etish sabablari
  const { data: rejectionReasonsData } = useQuery({
    queryKey: ['rejection-reasons-select'],
    queryFn: () => rejectionReasonsApi.getAll(),
  });
  const allRejectionReasons = rejectionReasonsData || [];

  // ==========================================================================
  // POPULATE INITIAL DATA
  // ==========================================================================
  // URL ?parentId=... orqali ochilganda avvalgi arizaning asosiy ma'lumotlarini 1 marta nusxalash
  useEffect(() => {
    if (id || !initialParentParam || copiedParentRef.current === initialParentParam) return;
    copiedParentRef.current = initialParentParam;
    void applicationsApi
      .getOne(initialParentParam)
      .then((parentApp) => {
        if (parentApp.citizen) {
          setSelectedCitizenId(parentApp.citizen.id);
          setCitizenDistrictId(
            parentApp.citizen.district_id || parentApp.citizen.district?.id || null,
          );
          setCitizenMahallaId(
            parentApp.citizen.neighborhood_id || parentApp.citizen.neighborhood?.id || null,
          );
          setCitizenForm({
            full_name: parentApp.citizen.full_name || '',
            passport: parentApp.citizen.passport || '',
            phone_number: parentApp.citizen.phone_number || '',
            pinfl: parentApp.citizen.pinfl || '',
            address: parentApp.citizen.address || '',
            birth_date: parentApp.citizen.birth_date
              ? String(parentApp.citizen.birth_date).substring(0, 10)
              : '',
            gender: (parentApp.citizen.gender as 'male' | 'female') || '',
          });
        }
        if (parentApp.district) {
          setSelectedDistrictId(parentApp.district.id);
          setDistrictForm({ name: parentApp.district.name || '' });
        }
        if (parentApp.crime) {
          setSelectedCrimeId(parentApp.crime.id);
          setCrimeForm({ article: parentApp.crime.article || parentApp.crime.title || '' });
        }
        if (parentApp.crime_method_id || parentApp.crime_method?.id) {
          setSelectedCrimeMethodId(parentApp.crime_method_id || parentApp.crime_method?.id || null);
        }
      })
      .catch(() => {
        // foydalanuvchi qo'lda kiritishi mumkin
      });
  }, [id, initialParentParam]);

  useEffect(() => {
    if (!initialApp) return;
    // Bir marta yuklangandan keyin fon refetch'lari tahrirlanayotgan formani qayta yozmasin
    if (hydratedAppIdRef.current === initialApp.id) return;
    hydratedAppIdRef.current = initialApp.id;

    setApplicationNumber(initialApp.application_number || '');
    setDescription(initialApp.description || '');
    setOfficerNotes(initialApp.officer_notes || '');
    if (initialApp.suspect_tree && Array.isArray(initialApp.suspect_tree)) {
      setSuspectTree(initialApp.suspect_tree);
    }
    setStatus(initialApp.status || initialApp.application_status?.code || 'YANGI');
    setStatusId(initialApp.status_id || initialApp.application_status?.id || null);
    setSourceId(initialApp.source_id || initialApp.source?.id || null);
    setAwarenessStatusId(initialApp.awareness_status_id || initialApp.awareness_status?.id || null);
    setAwarenessNote(initialApp.awareness_note || '');
    setAwarenessInformedExpanded(Boolean(initialApp.awareness_status?.is_informed));
    setDepartmentServiceId(
      initialApp.department_service_id || initialApp.department_service?.id || null,
    );
    setDecisionTypeId(initialApp.decision_type_id || initialApp.decision_type?.id || null);
    setRejectionReasonId(initialApp.rejection_reason_id || initialApp.rejection_reason?.id || null);
    setSlaDays(initialApp.sla_days ? String(initialApp.sla_days) : '');
    setDecisionNumber(initialApp.decision_number || '');
    setDecisionDate(toLocalDateInputValue(initialApp.decision_date));
    setDecisionNote(initialApp.decision_note || '');
    setAppealType(initialApp.appeal_type || 'APPEAL');
    setSubmissionForm(initialApp.submission_form || 'WRITTEN');
    setApplicantType(initialApp.applicant_type || 'INDIVIDUAL');
    setRepeatType(initialApp.repeat_type || 'PRIMARY');
    setParentApplicationId(initialApp.parent_application_id || null);
    setRepeatReason(initialApp.repeat_reason || '');
    setIsReviewTerminated(Boolean(initialApp.is_review_terminated));
    setTerminationNote(initialApp.termination_note || '');
    setExternalSystemIds(
      Array.isArray(initialApp.external_systems)
        ? initialApp.external_systems.map((es) => es.external_system_id)
        : [],
    );
    if (initialApp.date) {
      setDate(toLocalDateInputValue(initialApp.date));
    }

    const initWp = initialApp.workplace || initialApp.citizen?.workplace || null;
    setSelectedWorkplace(initWp);
    setWorkPosition(initialApp.work_position || initialApp.citizen?.work_position || '');

    if (initialApp.citizen) {
      setSelectedCitizenId(initialApp.citizen.id);
      setCitizenDistrictId(
        initialApp.citizen.district_id || initialApp.citizen.district?.id || null,
      );
      setCitizenMahallaId(
        initialApp.citizen.neighborhood_id || initialApp.citizen.neighborhood?.id || null,
      );
      setOccupationCategoryId(
        initialApp.citizen.occupation_category_id ||
          initialApp.citizen.occupation_category?.id ||
          null,
      );
      setOccupationId(
        initialApp.citizen.occupation_id || initialApp.citizen.occupation?.id || null,
      );
      setCitizenForm({
        full_name: initialApp.citizen.full_name || '',
        passport: initialApp.citizen.passport || '',
        phone_number: initialApp.citizen.phone_number || '',
        pinfl: initialApp.citizen.pinfl || '',
        address: initialApp.citizen.address || '',
        birth_date: initialApp.citizen.birth_date
          ? String(initialApp.citizen.birth_date).substring(0, 10)
          : '',
        gender: (initialApp.citizen.gender as 'male' | 'female') || '',
      });
    }

    if (initialApp.district) {
      setSelectedDistrictId(initialApp.district.id);
      setDistrictForm({
        name: initialApp.district.name || '',
      });
    }

    if (initialApp.crime) {
      setSelectedCrimeId(initialApp.crime.id);
      setCrimeForm({
        article: initialApp.crime.article || initialApp.crime.title || '',
      });
    }

    if (initialApp.crime_method_id || initialApp.crime_method) {
      setSelectedCrimeMethodId(initialApp.crime_method_id || initialApp.crime_method?.id || null);
    }

    if (Array.isArray(initialApp.custom_fields) && initialApp.custom_fields.length > 0) {
      const prefilledMethodVals: Record<string, string> = {};
      for (const cf of initialApp.custom_fields) {
        if (cf.key && cf.value !== null && cf.value !== undefined) {
          prefilledMethodVals[cf.key] = String(cf.value);
        }
      }
      setMethodFieldValues(prefilledMethodVals);
    }

    const hasPrimaryFinancial = Boolean(
      initialApp.card || initialApp.card_id || initialApp.transfer || initialApp.transfer_id,
    );

    const loadedTransfers: FinancialTransferEntry[] = [];

    const formatLoadedAmount = (val: number | string | null | undefined): string => {
      if (val === null || val === undefined || val === '') return '';
      const num = Number(val);
      if (!Number.isFinite(num) || num <= 0) return '';
      return formatAmountInput(num);
    };

    const readDestDetails = (
      t?: {
        destination_details?: Record<string, unknown> | null;
        receiver_identifier?: { raw_value?: string | null } | null;
      } | null,
    ) => {
      const details = (t?.destination_details || {}) as Record<string, unknown>;
      return {
        platform: typeof details.platform === 'string' ? details.platform : '',
        value:
          typeof details.value === 'string' && details.value.trim()
            ? details.value
            : t?.receiver_identifier?.raw_value || '',
      };
    };

    if (hasPrimaryFinancial) {
      const primaryDest = readDestDetails(initialApp.transfer);
      loadedTransfers.push({
        clientId: 'primary_ft',
        victimCardId: initialApp.card?.id || initialApp.card_id || null,
        victimCardNumber: initialApp.card?.card_number || '',
        victimCardFullName: initialApp.card?.full_name || '',
        victimBankName: initialApp.card?.bank?.name || '',
        transferId: initialApp.transfer?.id || initialApp.transfer_id || null,
        transactionId: initialApp.transfer?.transaction_id || '',
        amount: formatLoadedAmount(initialApp.transfer?.amount),
        currency: initialApp.transfer?.currency || 'UZS',
        providerId: initialApp.transfer?.payment_provider?.id || null,
        providerName: initialApp.transfer?.payment_provider?.name || '',
        transferDate: initialApp.transfer?.transfer_date || '',
        transferTime: initialApp.transfer?.transfer_time || '',
        destinationType: initialApp.transfer?.destination_type || 'CARD',
        destinationPlatform: primaryDest.platform,
        destinationValue: primaryDest.value,
        destinationLabel: initialApp.transfer?.destination_label || '',
        receiverCardId: initialApp.transfer?.receiver_card?.id || null,
        receiverCardNumber: initialApp.transfer?.receiver_card?.card_number || '',
        receiverCardFullName: initialApp.transfer?.receiver_card?.full_name || '',
        receiverBankName: initialApp.transfer?.receiver_card?.bank?.name || '',
      });
    }

    if (initialApp.custom_fields) {
      const loadedEvidence: UploadedFile[] = [];
      const nonEvidenceFields: AppCustomFieldState[] = [];
      const sortedCustomFields = [...initialApp.custom_fields].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );

      sortedCustomFields.forEach((cf, idx) => {
        if (
          cf.key === 'evidence_attachments' ||
          cf.label?.toLowerCase().includes('isbot') ||
          cf.label?.toLowerCase().includes('hujjat')
        ) {
          if (Array.isArray(cf.value)) {
            cf.value.forEach((v) => {
              if (typeof v === 'string') {
                const fname = v.split('/').pop() || 'fayl';
                loadedEvidence.push({
                  url: v,
                  proxy_url: v,
                  key: fname,
                  filename: fname,
                  original_name: fname,
                  size: 0,
                  mimetype: 'application/octet-stream',
                });
              } else if (v && typeof v === 'object' && 'url' in v) {
                loadedEvidence.push(v as UploadedFile);
              }
            });
          }
        } else if (cf.type === 'TRANSFER' || cf.transfer) {
          const t = cf.transfer;
          const sc = cf.card || t?.sender_card;
          const rc = t?.receiver_card;
          const extraDest = readDestDetails(t);
          loadedTransfers.push({
            clientId: cf.id || `custom_ft_${idx}`,
            victimCardId: sc?.id || cf.card_id || null,
            victimCardNumber: sc?.card_number || '',
            victimCardFullName: sc?.full_name || '',
            victimBankName: sc?.bank?.name || '',
            transferId: t?.id || cf.transfer_id || null,
            transactionId: t?.transaction_id || '',
            amount: formatLoadedAmount(t?.amount),
            currency: t?.currency || 'UZS',
            providerId: t?.payment_provider?.id || null,
            providerName: t?.payment_provider?.name || '',
            transferDate: t?.transfer_date || '',
            transferTime: t?.transfer_time || '',
            destinationType: t?.destination_type || 'CARD',
            destinationPlatform: extraDest.platform,
            destinationValue: extraDest.value,
            destinationLabel: t?.destination_label || '',
            receiverCardId: rc?.id || null,
            receiverCardNumber: rc?.card_number || '',
            receiverCardFullName: rc?.full_name || '',
            receiverBankName: rc?.bank?.name || '',
          });
        } else {
          nonEvidenceFields.push({
            clientId: cf.id || `cf_loaded_${idx}`,
            type: cf.type || 'TEXT',
            label: cf.label || '',
            key: cf.key || '',
            entity_role: cf.entity_role || null,
            value: cf.value,
            order: cf.order ?? idx,
            citizen_id: cf.citizen_id,
            card_id: cf.card_id,
            crime_id: cf.crime_id,
            district_id: cf.district_id,
            transfer_id: cf.transfer_id,
            inline_citizen: cf.citizen
              ? {
                  full_name: cf.citizen.full_name || '',
                  passport: cf.citizen.passport || '',
                  phone_number: cf.citizen.phone_number || '',
                  pinfl: cf.citizen.pinfl || '',
                  birth_date: cf.citizen.birth_date
                    ? String(cf.citizen.birth_date).substring(0, 10)
                    : '',
                  gender: (cf.citizen.gender as 'male' | 'female') || '',
                  address: cf.citizen.address || '',
                  district_id: cf.citizen.district_id || cf.citizen.district?.id || null,
                  district_name: cf.citizen.district?.name || '',
                  neighborhood_id:
                    cf.citizen.neighborhood_id || cf.citizen.neighborhood?.id || null,
                  neighborhood_name: cf.citizen.neighborhood?.name || '',
                }
              : undefined,
            inline_card: cf.card
              ? {
                  card_number: cf.card.card_number || '',
                  expire_date: cf.card.expire_date || '',
                  full_name: cf.card.full_name || '',
                  bank_name: cf.card.bank?.name || '',
                }
              : undefined,
            inline_crime: cf.crime
              ? {
                  article: cf.crime.article || '',
                  title: cf.crime.title || '',
                  clause: '',
                }
              : undefined,
            inline_district: cf.district
              ? {
                  name: cf.district.name || '',
                }
              : undefined,
            inline_transfer: undefined,
          });
        }
      });

      if (loadedEvidence.length > 0) {
        setEvidenceFiles(loadedEvidence);
      }
      setCustomFields(nonEvidenceFields);
    }

    if (loadedTransfers.length > 0) {
      setHasFinancialLoss(true);
      setFinancialTransfers(loadedTransfers);
    }

    if (Array.isArray(initialApp.damages) && initialApp.damages.length > 0) {
      setHasNonCardDamage(true);
      setNonCardDamages(
        initialApp.damages.map((d, idx) => ({
          clientId: `ncd_${++damageClientIdCounter}_${idx}`,
          damageType: d.damage_type || 'ONLINE_CREDIT',
          organizationName: d.organization_name || d.bank?.name || d.payment_provider?.name || '',
          amount:
            d.amount !== undefined && d.amount !== null ? String(Math.round(Number(d.amount))) : '',
          currency: d.currency || 'UZS',
          contractNumber: d.contract_number || '',
          damageDate: d.damage_date ? String(d.damage_date).slice(0, 10) : '',
          description: d.description || '',
          recipientInfo: d.recipient_info || '',
        })),
      );
    } else {
      setHasNonCardDamage(false);
      setNonCardDamages([createDefaultNonCardDamageEntry()]);
    }
  }, [initialApp]);

  const hasUnsavedData = Boolean(
    applicationNumber.trim() ||
    description.trim() ||
    officerNotes.trim() ||
    suspectTree.length > 0 ||
    selectedCitizenId ||
    citizenForm.full_name.trim() ||
    citizenForm.phone_number.trim() ||
    citizenForm.passport.trim() ||
    citizenForm.pinfl.trim() ||
    selectedDistrictId ||
    selectedCrimeId ||
    selectedCrimeMethodId ||
    hasFinancialLoss ||
    hasNonCardDamage ||
    evidenceFiles.length > 0 ||
    customFields.length > 0 ||
    repeatType !== 'PRIMARY' ||
    Boolean(parentApplicationId) ||
    repeatReason.trim() ||
    Boolean(awarenessStatusId) ||
    awarenessNote.trim() ||
    externalSystemIds.length > 0,
  );

  // Yangi ariza yaratishda (!id) kiritilgan ma'lumotlarni avtomatik localStorage ga saqlash
  // Reload yoki boshqa sahifaga o'tib qaytganda saqlanib qoladi; faqat Saqlash yoki Bekor qilishda o'chadi
  useEffect(() => {
    if (id || draftClearedRef.current) return;
    if (!hasUnsavedData) {
      clearApplicationDraft(currentUserId);
      return;
    }
    const draftPayload: ApplicationCreateDraft = {
      v: 1,
      savedAt: new Date().toISOString(),
      applicationNumber,
      description,
      officerNotes,
      suspectTree,
      status,
      statusId,
      sourceId,
      awarenessStatusId,
      awarenessNote,
      externalSystemIds,
      date,
      appealType,
      submissionForm,
      applicantType,
      repeatType,
      parentApplicationId,
      repeatReason,
      isReviewTerminated,
      terminationNote,
      selectedCitizenId,
      citizenForm,
      occupationCategoryId,
      occupationId,
      selectedWorkplace,
      workPosition,
      citizenDistrictId,
      citizenMahallaId,
      selectedDistrictId,
      districtForm,
      selectedCrimeId,
      selectedCrimeMethodId,
      crimeForm,
      methodFieldValues,
      departmentServiceId,
      decisionTypeId,
      rejectionReasonId,
      slaDays,
      decisionNumber,
      decisionDate,
      decisionNote,
      hasFinancialLoss,
      financialTransfers,
      hasNonCardDamage,
      nonCardDamages,
      evidenceFiles,
      customFields,
    };
    saveApplicationDraft(currentUserId, draftPayload);
  }, [
    id,
    currentUserId,
    hasUnsavedData,
    applicationNumber,
    description,
    officerNotes,
    suspectTree,
    status,
    statusId,
    sourceId,
    awarenessStatusId,
    awarenessNote,
    externalSystemIds,
    date,
    appealType,
    submissionForm,
    applicantType,
    repeatType,
    parentApplicationId,
    repeatReason,
    isReviewTerminated,
    terminationNote,
    selectedCitizenId,
    citizenForm,
    occupationCategoryId,
    occupationId,
    selectedWorkplace,
    workPosition,
    citizenDistrictId,
    citizenMahallaId,
    selectedDistrictId,
    districtForm,
    selectedCrimeId,
    selectedCrimeMethodId,
    crimeForm,
    methodFieldValues,
    departmentServiceId,
    decisionTypeId,
    rejectionReasonId,
    slaDays,
    decisionNumber,
    decisionDate,
    decisionNote,
    hasFinancialLoss,
    financialTransfers,
    hasNonCardDamage,
    nonCardDamages,
    evidenceFiles,
    customFields,
  ]);

  // Tab yopilishidan himoya (faqat tahrirlash rejimida; yangi arizada localStorage ga avtomatik saqlanadi)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!canLeave && Boolean(id)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [canLeave, id]);

  // Popover tashqarisiga bosilganda yopish
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (citizenPopoverRef.current && !citizenPopoverRef.current.contains(target)) {
        setShowCitizenPopover(false);
      }
      if (transferContainerRef.current && !transferContainerRef.current.contains(target)) {
        setActiveTransferPopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==========================================================================
  // AUTOCOMPLETE FILTERLASH (Server-side debounced qidiruv natijalari)
  // ==========================================================================
  const filteredVictimCards = useMemo(() => {
    if (debouncedVictimCardQuery.length < 4) return [];
    return victimCardsSearchData?.items || [];
  }, [victimCardsSearchData, debouncedVictimCardQuery]);

  const filteredReceiverCards = useMemo(() => {
    if (debouncedReceiverCardQuery.length < 4) return [];
    return receiverCardsSearchData?.items || [];
  }, [receiverCardsSearchData, debouncedReceiverCardQuery]);

  // ==========================================================================
  // SELECTION HANDLERS
  // ==========================================================================
  const handleSelectCitizen = (c: Citizen) => {
    setSelectedCitizenId(c.id);
    setCitizenDistrictId(c.district_id || c.district?.id || null);
    setCitizenMahallaId(c.neighborhood_id || c.neighborhood?.id || null);
    setOccupationCategoryId(c.occupation_category_id || c.occupation_category?.id || null);
    setOccupationId(c.occupation_id || c.occupation?.id || null);
    setSelectedWorkplace(c.workplace || null);
    setWorkPosition(c.work_position || '');
    setCitizenForm({
      full_name: c.full_name || '',
      passport: c.passport || '',
      phone_number: c.phone_number || '',
      pinfl: c.pinfl || '',
      address: c.address || '',
      birth_date: c.birth_date ? String(c.birth_date).substring(0, 10) : '',
      gender: (c.gender as 'male' | 'female') || '',
    });
    setShowCitizenPopover(false);
  };

  const handleUnlinkCitizen = () => {
    setShowUnlinkCitizenConfirm(true);
  };

  const confirmUnlinkCitizen = () => {
    setSelectedCitizenId(null);
    setOccupationCategoryId(null);
    setOccupationId(null);
    setCitizenForm({
      full_name: '',
      passport: '',
      phone_number: '',
      pinfl: '',
      address: '',
      birth_date: '',
      gender: '',
    });
    setCitizenDistrictId(null);
    setCitizenMahallaId(null);
    setShowUnlinkCitizenConfirm(false);
  };

  // ==========================================================================
  // DALILLAR / ISBOTLAR YUKLASH (MinIO)
  // ==========================================================================
  const handleUploadEvidenceFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setIsUploadingEvidence(true);
      const res = await filesApi.uploadMultiple(Array.from(files), 'evidence');
      setEvidenceFiles((prev) => [...prev, ...res]);
      toast.success(`${res.length} ta fayl muvaffaqiyatli yuklandi`);
    } catch (err) {
      console.error('Fayllarni yuklashda xatolik:', err);
      toast.error('Fayllarni yuklashda xatolik yuz berdi', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsUploadingEvidence(false);
      if (evidenceInputRef.current) {
        evidenceInputRef.current.value = '';
      }
    }
  };

  const handleRemoveEvidenceFile = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ==========================================================================
  // ARIZA QO'SHIMCHA SUBYEKTLARI
  // ==========================================================================
  const handleAddCustomFieldItem = (type: CustomFieldType, defaultLabel = '') => {
    const clientId = `cf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const resolvedLabel = type === 'CITIZEN' && !defaultLabel ? 'Gumonlanuvchi' : defaultLabel;
    const newItem: AppCustomFieldState = {
      clientId,
      type,
      label: resolvedLabel,
      key: `${type.toLowerCase()}_${Date.now()}`,
      entity_role: type === 'CITIZEN' ? 'SUSPECT' : null,
      value: type === 'TEXT' ? '' : null,
      order: customFields.length,
      inline_citizen:
        type === 'CITIZEN'
          ? {
              full_name: '',
              passport: '',
              phone_number: '',
              pinfl: '',
              address: '',
              district_id: null,
              district_name: '',
              neighborhood_id: null,
              neighborhood_name: '',
            }
          : undefined,
      inline_card:
        type === 'CARD'
          ? { card_number: '', expire_date: '', bank_name: '', bank_mfo: '' }
          : undefined,
    };

    setCustomFields((prev) => [...prev, newItem]);
  };

  const handleUpdateCustomFieldItem = (
    clientId: string,
    updater: (prev: AppCustomFieldState) => AppCustomFieldState,
  ) => {
    setCustomFields((prev) =>
      prev.map((item) => (item.clientId === clientId ? updater(item) : item)),
    );
  };

  const handleRemoveCustomFieldItem = (clientId: string) => {
    setCustomFields((prev) => prev.filter((item) => item.clientId !== clientId));
  };

  // ==========================================================================
  // SAQLASH VA RO'YXATGA OLISH (MUTATION)
  // ==========================================================================
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        application_number: applicationNumber.trim() ? applicationNumber.trim() : null,
        description: description.trim() ? description : null,
        officer_notes: officerNotes.trim() ? officerNotes : null,
        suspect_tree: suspectTree,
        status,
        status_id: statusId || undefined,
        date: date ? new Date(date).toISOString() : undefined,
        source_id: sourceId || null,
        awareness_status_id: awarenessStatusId || null,
        awareness_note: awarenessNote.trim() || null,
        external_system_ids: externalSystemIds,
        department_service_id: departmentServiceId || null,
        decision_type_id: decisionTypeId || null,
        rejection_reason_id: rejectionReasonId || null,
        sla_days: slaDays ? Number(slaDays) : undefined,
        decision_number: decisionNumber.trim() || null,
        decision_date: decisionDate || null,
        decision_note: decisionNote.trim() || null,
        appeal_type: appealType,
        submission_form: submissionForm,
        applicant_type: applicantType,
        repeat_type: repeatType,
        parent_application_id: repeatType === 'PRIMARY' ? null : parentApplicationId || null,
        repeat_reason: repeatType === 'PRIMARY' ? null : repeatReason.trim() || null,
        is_review_terminated: repeatType === 'REPEAT' ? isReviewTerminated : false,
        termination_note:
          repeatType === 'REPEAT' && isReviewTerminated ? terminationNote.trim() || null : null,
      };

      // 1. Fuqaro (tahrirlashda maydon tozalansa null yuboriladi, ajratilsa eski fuqaro ustidan yozilmaydi)
      const emptyVal = selectedCitizenId ? null : undefined;
      const citizenDataObj: Record<string, unknown> = {
        full_name: citizenForm.full_name.trim() ? formatUzbekName(citizenForm.full_name) : emptyVal,
        passport:
          citizenForm.passport && citizenForm.passport.trim() !== ''
            ? citizenForm.passport.trim().toUpperCase()
            : emptyVal,
        phone_number: citizenForm.phone_number.trim() ? citizenForm.phone_number : emptyVal,
        pinfl:
          citizenForm.pinfl && citizenForm.pinfl.trim() !== ''
            ? citizenForm.pinfl.trim()
            : emptyVal,
        birth_date: citizenForm.birth_date || emptyVal,
        gender: citizenForm.gender || emptyVal,
        address: citizenForm.address.trim() ? citizenForm.address : emptyVal,
        district_id: citizenDistrictId || emptyVal,
        neighborhood_id: citizenMahallaId || emptyVal,
        occupation_category_id: occupationCategoryId || null,
        occupation_id: occupationId || null,
      };

      const hasAnyCitizenInput = Boolean(
        citizenForm.full_name.trim() ||
        citizenForm.phone_number.trim() ||
        citizenForm.passport.trim() ||
        citizenForm.pinfl.trim() ||
        citizenForm.birth_date ||
        citizenForm.gender ||
        citizenDistrictId ||
        citizenMahallaId ||
        citizenForm.address.trim() ||
        occupationCategoryId ||
        occupationId,
      );

      if (selectedCitizenId) {
        payload.citizen_id = selectedCitizenId;
        payload.citizen_data = citizenDataObj;
      } else {
        if (id) {
          payload.citizen_id = null;
        }
        if (hasAnyCitizenInput) {
          payload.citizen_data = citizenDataObj;
        }
      }

      // 1.5. Ish joyi / Tashkilot va lavozimi (Snapshot + Citizen profili)
      payload.workplace_id = selectedWorkplace ? selectedWorkplace.id : null;
      payload.work_position = workPosition.trim() || null;

      // 2. Tuman
      if (selectedDistrictId) {
        payload.district_id = selectedDistrictId;
      } else if (districtForm.name.trim()) {
        if (id) payload.district_id = null;
        payload.district_data = {
          name: districtForm.name.trim(),
        };
      } else if (id) {
        payload.district_id = null;
      }

      // 3. Jinoyat turi
      if (selectedCrimeId) {
        payload.crime_id = selectedCrimeId;
      } else if (crimeForm.article.trim()) {
        if (id) payload.crime_id = null;
        payload.crime_data = {
          article: crimeForm.article.trim(),
          title: crimeForm.article.trim(),
        };
      } else if (id) {
        payload.crime_id = null;
      }
      payload.crime_method_id = selectedCrimeMethodId || null;

      // 3.1. Jinoyat usuliga bog'langan dinamik maydonlarni tekshirish va saqlash
      for (const mf of activeMethodFields) {
        const fieldKey = mf.key || mf.label;
        const val = (methodFieldValues[fieldKey] || '').trim();
        if (mf.is_required && !val) {
          throw new Error(`"${mf.label}" maydonini to‘ldirish majburiy!`);
        }
      }

      // 4. Moliyaviy Zarar / Karta va O'tkazmalar
      const allKnownMethodFieldKeys = new Set<string>(
        activeMethodFields.map((mf) => mf.key || mf.label),
      );
      for (const m of allCrimeMethods) {
        for (const f of m.fields || []) {
          const fk = f.key || f.label;
          if (fk) allKnownMethodFieldKeys.add(fk);
        }
      }
      const allCustomFields = customFields.filter(
        (cf) => !cf.key || !allKnownMethodFieldKeys.has(cf.key),
      );

      for (const mf of activeMethodFields) {
        const fieldKey = mf.key || mf.label;
        const val = (methodFieldValues[fieldKey] || '').trim();
        if (val) {
          allCustomFields.push({
            clientId: `mf_${fieldKey}`,
            label: mf.label,
            key: fieldKey,
            type: mf.field_type === 'NUMBER' ? 'NUMBER' : 'STRING',
            value: mf.field_type === 'NUMBER' ? Number(val) : val,
            order: mf.sort_order ?? 0,
          });
        }
      }

      const parseTransferNumericAmount = (raw?: string | number | null): number | null => {
        if (raw === null || raw === undefined || raw === '') return null;
        const cleaned = String(raw)
          .replace(/[\s\u00A0\u202F,]/g, '')
          .replace(/[^\d.]/g, '');
        if (!cleaned) return null;
        const num = Number(cleaned);
        return Number.isFinite(num) && num > 0 ? num : null;
      };

      if (hasFinancialLoss && financialTransfers.length > 0) {
        const primary = financialTransfers[0];
        const primaryAmount = parseTransferNumericAmount(primary.amount);

        // Primary Karta
        if (primary.victimCardId) {
          payload.card_id = primary.victimCardId;
        }
        if (primary.victimCardNumber || primary.victimCardFullName || primary.victimBankName) {
          payload.card_data = {
            card_number: primary.victimCardNumber.replace(/\D/g, ''),
            full_name: primary.victimCardFullName
              ? formatUzbekName(primary.victimCardFullName)
              : undefined,
            bank_name: primary.victimBankName ? formatTitleCase(primary.victimBankName) : undefined,
          };
        }

        // Primary O'tkazma (yaratish va tahrirlashda ham to'liq yuboriladi)
        if (primary.transferId) {
          payload.transfer_id = primary.transferId;
        }
        const primaryDestType = primary.destinationType || 'CARD';
        const isPrimaryNonCardDest = primaryDestType !== 'CARD';
        if (
          primary.transferId ||
          primaryAmount !== null ||
          primary.transactionId?.trim() ||
          primary.receiverCardId ||
          primary.receiverCardNumber ||
          primary.receiverCardFullName ||
          primary.providerId ||
          primary.providerName ||
          primary.transferDate ||
          primary.destinationValue?.trim() ||
          primary.destinationPlatform?.trim() ||
          isPrimaryNonCardDest
        ) {
          payload.transfer_data = {
            transaction_id: primary.transactionId?.trim() || undefined,
            amount: primaryAmount,
            currency: primary.currency || 'UZS',
            payment_provider_id: primary.providerId || null,
            payment_provider_name: primary.providerId
              ? undefined
              : primary.providerName
                ? formatTitleCase(primary.providerName)
                : undefined,
            destination_type: primaryDestType,
            destination_platform: isPrimaryNonCardDest
              ? primary.destinationPlatform?.trim() || undefined
              : undefined,
            destination_value: isPrimaryNonCardDest
              ? primary.destinationValue?.trim() || undefined
              : undefined,
            destination_label: isPrimaryNonCardDest
              ? primary.destinationLabel?.trim() ||
                [primary.destinationPlatform?.trim(), primary.destinationValue?.trim()]
                  .filter(Boolean)
                  .join(' · ') ||
                undefined
              : undefined,
            receiver_card_id: isPrimaryNonCardDest ? null : primary.receiverCardId || null,
            receiver_card_number: isPrimaryNonCardDest
              ? undefined
              : primary.receiverCardId
                ? undefined
                : primary.receiverCardNumber.replace(/\D/g, ''),
            receiver_card_full_name: isPrimaryNonCardDest
              ? undefined
              : primary.receiverCardFullName
                ? formatUzbekName(primary.receiverCardFullName)
                : undefined,
            receiver_bank_name: isPrimaryNonCardDest
              ? undefined
              : primary.receiverBankName
                ? formatTitleCase(primary.receiverBankName)
                : undefined,
            transfer_date: primary.transferDate || null,
            transfer_time: primary.transferTime || null,
          };
        }

        // Qo'shimcha o'tkazmalar (2 dan boshlab — bo'sh qoldirilgan bloklarni tashlab ketamiz)
        let extraIndex = 0;
        financialTransfers.slice(1).forEach((entry) => {
          const entryAmount = parseTransferNumericAmount(entry.amount);
          const entryDestType = entry.destinationType || 'CARD';
          const isEntryNonCardDest = entryDestType !== 'CARD';
          const hasAnyTransferContent = Boolean(
            entry.transferId ||
            entryAmount !== null ||
            entry.transactionId?.trim() ||
            entry.victimCardId ||
            entry.victimCardNumber.replace(/\D/g, '') ||
            entry.receiverCardId ||
            entry.receiverCardNumber.replace(/\D/g, '') ||
            entry.providerId ||
            entry.providerName.trim() ||
            entry.transferDate ||
            entry.destinationValue?.trim() ||
            entry.destinationPlatform?.trim() ||
            isEntryNonCardDest,
          );
          if (!hasAnyTransferContent) return;

          extraIndex++;
          allCustomFields.push({
            clientId: entry.clientId,
            type: 'TRANSFER',
            label: `Qo‘shimcha o‘tkazma #${extraIndex + 1}`,
            key: `transfer_${entry.clientId}`,
            value:
              entryAmount !== null
                ? `${formatAmountInput(entryAmount)} ${entry.currency || 'UZS'}`
                : 'O‘tkazma',
            order: allCustomFields.length,
            card_id: entry.victimCardId || undefined,
            transfer_id: entry.transferId || undefined,
            inline_card: {
              card_number: entry.victimCardNumber ? entry.victimCardNumber.replace(/\D/g, '') : '',
              full_name: entry.victimCardFullName
                ? formatUzbekName(entry.victimCardFullName)
                : undefined,
              bank_name: entry.victimBankName ? formatTitleCase(entry.victimBankName) : undefined,
            },
            inline_transfer: {
              transaction_id: entry.transactionId?.trim() || undefined,
              amount: entryAmount ?? '',
              currency: entry.currency || 'UZS',
              payment_provider_id: entry.providerId || undefined,
              payment_provider_name: entry.providerId
                ? undefined
                : entry.providerName
                  ? formatTitleCase(entry.providerName)
                  : undefined,
              destination_type: entryDestType,
              destination_platform: isEntryNonCardDest
                ? entry.destinationPlatform?.trim() || undefined
                : undefined,
              destination_value: isEntryNonCardDest
                ? entry.destinationValue?.trim() || undefined
                : undefined,
              destination_label: isEntryNonCardDest
                ? entry.destinationLabel?.trim() ||
                  [entry.destinationPlatform?.trim(), entry.destinationValue?.trim()]
                    .filter(Boolean)
                    .join(' · ') ||
                  undefined
                : undefined,
              receiver_card_id: isEntryNonCardDest ? undefined : entry.receiverCardId || undefined,
              receiver_card_number: isEntryNonCardDest
                ? undefined
                : entry.receiverCardId
                  ? undefined
                  : entry.receiverCardNumber.replace(/\D/g, ''),
              receiver_card_full_name: isEntryNonCardDest
                ? undefined
                : entry.receiverCardFullName
                  ? formatUzbekName(entry.receiverCardFullName)
                  : undefined,
              receiver_bank_name: isEntryNonCardDest
                ? undefined
                : entry.receiverBankName
                  ? formatTitleCase(entry.receiverBankName)
                  : undefined,
              transfer_date: entry.transferDate || undefined,
              transfer_time: entry.transferTime || undefined,
            },
          });
        });
      } else {
        payload.card_id = null;
        payload.transfer_id = null;
      }

      // 4.5. Kartasiz moddiy zararlar (Onlayn kredit, nasiya, mulk/xizmat)
      if (hasNonCardDamage) {
        const validDamages: Array<{
          damage_type: string;
          organization_name?: string;
          amount: number;
          currency: string;
          contract_number?: string;
          damage_date?: string;
          description?: string;
          recipient_info?: string;
          order: number;
        }> = [];
        for (let idx = 0; idx < nonCardDamages.length; idx++) {
          const entry = nonCardDamages[idx];
          const numericAmount = Number(String(entry.amount || '').replace(/[^\d.]/g, ''));
          const hasAnyDetail = Boolean(
            entry.organizationName.trim() ||
            entry.contractNumber.trim() ||
            entry.damageDate ||
            entry.description.trim() ||
            entry.recipientInfo?.trim(),
          );
          if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            if (hasAnyDetail) {
              throw new Error(
                `Kartasiz moddiy zarar #${idx + 1} bandida zarar summasi kiritilmagan`,
              );
            }
            continue;
          }
          validDamages.push({
            damage_type: entry.damageType,
            organization_name: entry.organizationName.trim() || undefined,
            amount: numericAmount,
            currency: entry.currency || 'UZS',
            contract_number: entry.contractNumber.trim() || undefined,
            damage_date: entry.damageDate || undefined,
            description: entry.description.trim() || undefined,
            recipient_info: entry.recipientInfo?.trim() || undefined,
            order: validDamages.length,
          });
        }
        payload.damages = validDamages;
      } else {
        payload.damages = [];
      }

      // 5. Universal Custom Fields & MinIO Dalillar
      if (evidenceFiles.length > 0) {
        const evidenceField: AppCustomFieldState = {
          clientId: 'evidence_auto_files',
          type: 'FILES',
          label: 'Ilova qilingan isbot va hujjatlar',
          key: 'evidence_attachments',
          value: evidenceFiles,
          order: allCustomFields.length,
        };
        const existingIdx = allCustomFields.findIndex(
          (cf) => cf.key === 'evidence_attachments' || cf.clientId === 'evidence_auto_files',
        );
        if (existingIdx >= 0) {
          allCustomFields[existingIdx] = evidenceField;
        } else {
          allCustomFields.push(evidenceField);
        }
      }

      payload.custom_fields = allCustomFields.map((cf, idx) => ({
        label: cf.label.trim() || undefined,
        key: cf.key || `field_${idx}`,
        entity_role: cf.entity_role || undefined,
        type: cf.type,
        value: cf.value,
        order: idx,
        citizen_id: cf.citizen_id || undefined,
        card_id: cf.card_id || undefined,
        crime_id: cf.crime_id || undefined,
        district_id: cf.district_id || undefined,
        transfer_id: cf.transfer_id || undefined,
        inline_citizen: cf.inline_citizen,
        inline_card: cf.inline_card,
        inline_crime: cf.inline_crime,
        inline_district: cf.inline_district,
        inline_transfer: cf.inline_transfer,
      }));

      if (id) {
        return applicationsApi.update(id, payload);
      }
      return applicationsApi.create(payload);
    },
    onSuccess: async () => {
      setCanLeave(true);
      if (!id) {
        draftClearedRef.current = true;
        clearApplicationDraft(currentUserId);
      }
      const invalidations: Array<Promise<unknown>> = [
        queryClient.invalidateQueries({ queryKey: ['applications'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['citizens'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['cards'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['transfers'], refetchType: 'all' }),
      ];
      if (id) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: ['application-draft', id],
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: ['application', id],
            refetchType: 'all',
          }),
        );
      }
      await Promise.all(invalidations);
      toast.success(
        isEditMode
          ? 'O‘zgarishlar muvaffaqiyatli saqlandi!'
          : 'Ariza muvaffaqiyatli saqlandi va ro‘yxatga olindi!',
      );
      if (isEditMode && id) {
        navigate(`/applications/${id}`);
      } else {
        navigate('/applications');
      }
    },
    onError: (err: unknown) => {
      console.error('Arizani saqlashda xatolik:', err);
      toast.error('Arizani saqlashda xatolik yuz berdi', {
        description: getErrorMessage(err, 'Arizani saqlashda serverda xatolik yuz berdi'),
      });
    },
  });

  // O'chirish mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      return applicationsApi.delete(id);
    },
    onSuccess: async () => {
      setCanLeave(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['citizens'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['cards'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['transfers'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['application-draft', id], refetchType: 'all' }),
      ]);
      toast.success('Ariza loyihasi butunlay o‘chirildi');
      navigate('/applications');
    },
    onError: (err: unknown) => {
      toast.error('Arizani o‘chirishda xatolik yuz berdi', {
        description: getErrorMessage(err),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground font-mono">Ariza shakli yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-24">
      {/* ===================================================================== */}
      {/* YAGONA RASMIY ARIZA BAYONNOMASI (DOSSIER CONTAINER) */}
      {/* ===================================================================== */}
      <div
        className="bg-card border border-border shadow-xl rounded-2xl overflow-hidden divide-y divide-border/60"
        onFocusCapture={(e) => {
          const target = e.target as HTMLElement | null;
          if (
            target &&
            ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) &&
            target.id !== 'application-number-input' &&
            !applicationNumber.trim()
          ) {
            setApplicationNumberTouched(true);
          }
        }}
      >
        {/* ================================================================= */}
        {/* BOSHQARUV VA PROTOKOL REKVIZITLARI (TOP HEADER) */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  {isEditMode ? 'Arizani Tahrirlash' : 'Yangi Ariza & Murojaat'}
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono px-2 py-0 border-primary/40 text-primary font-bold"
                >
                  {allApplicationStatuses.find((s) => s.id === statusId || s.code === status)
                    ?.name || status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {isEditMode
                  ? `№ ${applicationNumber || initialApp?.application_number || id} sonli ariza ma‘lumotlarini o‘zgartirish va to‘ldirish`
                  : 'Fuqaro murojaati va kiberjinoyat holatini ro‘yxatga olish shakli'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Murojaat manbasi (102, 112, etc.) */}
            <div className="flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-1.5 shadow-sm">
              <Radio className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                Manba:
              </span>
              <select
                value={sourceId || ''}
                onChange={(e) => setSourceId(e.target.value || null)}
                className="h-7 border-0 p-0 text-xs font-semibold bg-transparent text-foreground focus:outline-none cursor-pointer"
              >
                <option value="">-- MANBANI TANLANG --</option>
                {allApplicationSources.map((src) => (
                  <option key={src.id} value={src.id}>
                    {src.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-1.5 shadow-sm">
              <span className="text-[11px] font-semibold text-muted-foreground">Sana:</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-7 border-0 p-0 text-xs font-mono bg-transparent text-foreground focus:outline-none"
              />
            </div>

            <select
              value={statusId || status}
              onChange={(e) => {
                const val = e.target.value;
                const found = allApplicationStatuses.find((s) => s.id === val || s.code === val);
                if (found) {
                  setStatusId(found.id);
                  setStatus(found.code || found.name);
                } else {
                  setStatus(val as ApplicationStatus);
                }
              }}
              className="h-10 rounded-lg border border-input bg-background px-3 text-xs shadow-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {allApplicationStatuses.length > 0 ? (
                allApplicationStatuses.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="YANGI">Yangi (Qabul qilindi)</option>
                  <option value="JARAYONDA">Jarayonda (Tergovda)</option>
                  <option value="HAL_QILINDI">Hal qilindi</option>
                  <option value="RAD_ETILDI">Rad etildi</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* QORALAMA TIKLANDI BANNERI (LOCALSTORAGE) */}
        {!id && wasDraftRestored && (
          <div className="mx-5 sm:mx-6 mt-4 rounded-xl border border-sky-500/35 bg-sky-500/10 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
              <BookmarkCheck className="h-4 w-4 shrink-0" />
              <span>
                <strong>Avvalgi to‘ldirilgan ma’lumotlar tiklandi.</strong> Sahifani yangilasangiz
                yoki boshqa bo‘limga o‘tib qaytsangiz ham saqlanib turadi; faqat{' '}
                <strong>Saqlash</strong> yoki <strong>Bekor qilish</strong> bosilganda tozalanadi.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setWasDraftRestored(false)}
              className="text-sky-700 dark:text-sky-300 hover:underline font-semibold text-[11px] cursor-pointer"
            >
              Yopish
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 0.5-QISM: MUROJAAT TASNIFI VA TAKRORIY / DUBLIKAT ZANJIRI (O'RQ-445) */}
        {/* ================================================================= */}
        <div className="px-5 sm:px-6 pt-5 bg-card">
          <AppealClassificationCard
            currentApplicationId={id}
            selectedCitizenId={selectedCitizenId}
            appealType={appealType}
            onAppealTypeChange={setAppealType}
            submissionForm={submissionForm}
            onSubmissionFormChange={setSubmissionForm}
            applicantType={applicantType}
            onApplicantTypeChange={setApplicantType}
            repeatType={repeatType}
            onRepeatTypeChange={setRepeatType}
            parentApplicationId={parentApplicationId}
            onParentApplicationChange={(appId) => setParentApplicationId(appId)}
            repeatReason={repeatReason}
            onRepeatReasonChange={setRepeatReason}
            isReviewTerminated={isReviewTerminated}
            onIsReviewTerminatedChange={setIsReviewTerminated}
            terminationNote={terminationNote}
            onTerminationNoteChange={setTerminationNote}
            onCopyFromParent={async (parentId) => {
              try {
                const parentApp = await applicationsApi.getOne(parentId);
                if (parentApp.citizen) {
                  setSelectedCitizenId(parentApp.citizen.id);
                  setCitizenDistrictId(
                    parentApp.citizen.district_id || parentApp.citizen.district?.id || null,
                  );
                  setCitizenMahallaId(
                    parentApp.citizen.neighborhood_id || parentApp.citizen.neighborhood?.id || null,
                  );
                  setCitizenForm({
                    full_name: parentApp.citizen.full_name || '',
                    passport: parentApp.citizen.passport || '',
                    phone_number: parentApp.citizen.phone_number || '',
                    pinfl: parentApp.citizen.pinfl || '',
                    address: parentApp.citizen.address || '',
                    birth_date: parentApp.citizen.birth_date
                      ? String(parentApp.citizen.birth_date).substring(0, 10)
                      : '',
                    gender: (parentApp.citizen.gender as 'male' | 'female') || '',
                  });
                }
                if (parentApp.district) {
                  setSelectedDistrictId(parentApp.district.id);
                  setDistrictForm({ name: parentApp.district.name || '' });
                }
                if (parentApp.crime) {
                  setSelectedCrimeId(parentApp.crime.id);
                  setCrimeForm({ article: parentApp.crime.article || parentApp.crime.title || '' });
                }
                if (parentApp.crime_method_id || parentApp.crime_method?.id) {
                  setSelectedCrimeMethodId(
                    parentApp.crime_method_id || parentApp.crime_method?.id || null,
                  );
                }
                toast.success(
                  `Avvalgi ariza (${parentApp.application_number || 'Raqamsiz'}) ma’lumotlari nusxalandi`,
                  {
                    description:
                      'Fuqaro, tuman va jinoyat turi to‘ldirildi; karta/o‘tkazmalar bo‘sh qoldi.',
                  },
                );
              } catch (err) {
                toast.error('Avvalgi ariza ma’lumotlarini yuklashda xatolik', {
                  description: getErrorMessage(err),
                });
              }
            }}
          />
        </div>

        {/* ================================================================= */}
        {/* 1-QISM: ARIZACHI (JABRLANUVCHI FUQARO) SHAXSIY ANKETASI */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-4 bg-red-50 dark:bg-red-950/20 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-200/70 dark:border-red-800/40 pb-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  <User className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground whitespace-nowrap">
                  1. Arizachi Shaxsiy Ma‘lumotlar
                </h2>
              </div>

              {/* Ariza / Murojaat Raqami (kengaytirilgan va qulay) */}
              <div className="flex flex-col gap-1 min-w-[260px] sm:w-80">
                <div
                  className={`flex items-center gap-2 bg-background border rounded-lg px-3 py-1.5 shadow-sm transition-colors ${
                    showAppNumberWarning ? 'border-red-500 ring-1 ring-red-500/30' : 'border-input'
                  }`}
                >
                  <span
                    className={`text-xs font-bold font-mono ${
                      showAppNumberWarning ? 'text-red-500' : 'text-primary'
                    }`}
                  >
                    №
                  </span>
                  <Input
                    id="application-number-input"
                    value={applicationNumber}
                    onChange={(e) => setApplicationNumber(e.target.value.toUpperCase())}
                    onBlur={() => setApplicationNumberTouched(true)}
                    placeholder="ARIZA RAQAMI"
                    className="h-7 w-full border-0 p-0 text-xs font-mono font-bold focus-visible:ring-0 bg-transparent uppercase text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
                {showAppNumberWarning && (
                  <span className="text-[11px] font-medium text-red-500 px-1">
                    Ariza raqamini kiritish talab etiladi
                  </span>
                )}
              </div>
            </div>

            {selectedCitizenId ? (
              <Badge
                className={`${
                  isEditMode
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                } gap-1.5 text-xs py-1 px-2.5 shrink-0`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isEditMode
                  ? 'Biriktirilgan fuqaro (tahrirlanmoqda)'
                  : 'Bazadagi fuqaro biriktirildi'}
                <button
                  type="button"
                  onClick={handleUnlinkCitizen}
                  className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Bog‘lanishni bekor qilish / Boshqa fuqaro tanlash"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[11px] text-muted-foreground shrink-0 border-dashed"
              >
                Yangi fuqaro sifatida qayd etiladi
              </Badge>
            )}
          </div>

          <div ref={citizenPopoverRef} className="relative space-y-4 pt-1">
            {/* 1-Qator: To'liq F.I.SH. */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                To‘liq F.I.SH. (Familiya Ism Otasining ismi) *
              </label>
              <Input
                placeholder="FAMILIYA ISM OTASINING ISMI (Masalan: ALIYEV VALIJON KARIMOVICH)"
                value={citizenForm.full_name}
                onFocus={() => {
                  if (!selectedCitizenId) setShowCitizenPopover(true);
                }}
                onChange={(e) => {
                  setCitizenForm({ ...citizenForm, full_name: e.target.value });
                  if (!selectedCitizenId) setShowCitizenPopover(true);
                }}
                className="h-10 text-xs uppercase font-medium"
              />
            </div>

            {/* 2-Qator: Tug‘ilgan sana, Jinsi, Telefon raqami */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Tug‘ilgan Sana</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Ixtiyoriy</span>
                </label>
                <Input
                  type="date"
                  value={citizenForm.birth_date}
                  onChange={(e) => {
                    setCitizenForm({ ...citizenForm, birth_date: e.target.value });
                  }}
                  className="h-10 text-xs font-medium cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Jinsi</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Ixtiyoriy</span>
                </label>
                <div className="grid grid-cols-2 gap-2 h-10">
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenForm({
                        ...citizenForm,
                        gender: citizenForm.gender === 'male' ? '' : 'male',
                      });
                    }}
                    className={`h-full flex items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
                      citizenForm.gender === 'male'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-background hover:bg-muted text-foreground border-input'
                    }`}
                  >
                    <MaleIcon className="h-3.5 w-3.5" /> Erkak
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenForm({
                        ...citizenForm,
                        gender: citizenForm.gender === 'female' ? '' : 'female',
                      });
                    }}
                    className={`h-full flex items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
                      citizenForm.gender === 'female'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-background hover:bg-muted text-foreground border-input'
                    }`}
                  >
                    <FemaleIcon className="h-3.5 w-3.5" /> Ayol
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Telefon Raqami</label>
                <PhoneInput
                  value={citizenForm.phone_number}
                  onFocus={() => {
                    if (!selectedCitizenId) setShowCitizenPopover(true);
                  }}
                  onChange={(val) => {
                    setCitizenForm({ ...citizenForm, phone_number: val });
                    if (!selectedCitizenId) setShowCitizenPopover(true);
                  }}
                />
              </div>
            </div>

            {/* 3-Qator: Pasport ma'lumotlari, JSHSHIR (PINFL) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Pasport Seriya & Raqam (Qidiruv)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Ixtiyoriy</span>
                </label>
                <Input
                  placeholder="AA1234567"
                  value={citizenForm.passport}
                  onFocus={() => {
                    if (!selectedCitizenId) setShowCitizenPopover(true);
                  }}
                  onChange={(e) => {
                    setCitizenForm({
                      ...citizenForm,
                      passport: e.target.value.toUpperCase(),
                    });
                    if (!selectedCitizenId) setShowCitizenPopover(true);
                  }}
                  className="h-10 text-xs font-mono uppercase font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>JSHSHIR (PINFL - 14 ta raqam)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Ixtiyoriy</span>
                </label>
                <Input
                  placeholder="30101901234567"
                  value={citizenForm.pinfl}
                  onFocus={() => {
                    if (!selectedCitizenId) setShowCitizenPopover(true);
                  }}
                  onChange={(e) => {
                    setCitizenForm({ ...citizenForm, pinfl: e.target.value.toUpperCase() });
                    if (!selectedCitizenId) setShowCitizenPopover(true);
                  }}
                  className="h-10 text-xs font-mono uppercase"
                />
              </div>
            </div>

            {/* 3-Qator: Tuman va Neighborhood (Fuqaro yashaydigan hududi) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Yashash Tumani */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Yashash Tumani
                  </label>
                  {citizenDistrictId && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Tanlandi
                    </Badge>
                  )}
                </div>
                <DistrictSearchSelect
                  districts={allDistricts}
                  value={citizenDistrictId}
                  onChange={(dId) => {
                    setCitizenDistrictId(dId);
                    setCitizenMahallaId(null);
                  }}
                  groupedByRegion
                  onQuickAdd={
                    canWrite
                      ? (q) =>
                          setQuickLocationState({
                            open: true,
                            initialDistrictQuery: q,
                          })
                      : undefined
                  }
                  placeholder="-- TUMANNI TANLANG --"
                  searchPlaceholder="Tuman yoki viloyat nomini qidiring..."
                />
              </div>

              {/* Yashash Mahallasi */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    Yashash Mahallasi
                  </label>
                  <div className="flex items-center gap-2">
                    {citizenMahallaId && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" />
                        Tanlandi
                      </Badge>
                    )}
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => {
                          const currentDist = allDistricts.find((d) => d.id === citizenDistrictId);
                          setQuickLocationState({
                            open: true,
                            initialRegionId: currentDist?.region_id || null,
                            initialDistrictId: citizenDistrictId || null,
                          });
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        Qo‘shish
                      </button>
                    )}
                  </div>
                </div>
                <MahallaSearchSelect
                  mahallas={allCitizenMahallas}
                  value={citizenMahallaId}
                  disabled={!citizenDistrictId}
                  isLoading={isLoadingCitizenMahallas}
                  onChange={(mId) => {
                    setCitizenMahallaId(mId);
                  }}
                  onQuickAdd={
                    canWrite
                      ? (q) => {
                          const currentDist = allDistricts.find((d) => d.id === citizenDistrictId);
                          setQuickLocationState({
                            open: true,
                            initialRegionId: currentDist?.region_id || null,
                            initialDistrictId: citizenDistrictId || null,
                            initialNeighborhoodQuery: q,
                          });
                        }
                      : undefined
                  }
                  placeholder="-- MAHALLANI TANLANG --"
                  disabledPlaceholder="AVVAL TUMANNI TANLANG..."
                  searchPlaceholder="Mahalla nomini qidiring..."
                />
              </div>
            </div>

            {/* 4-Qator: Doimiy yashash manzili */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Aniq Yashash Manzili (Ko‘cha, uy, xonadon)
              </label>
              <Input
                placeholder="A. Temur ko'chasi, 9-MAVZE, 12-UY, 45-XONADON..."
                value={citizenForm.address}
                onChange={(e) =>
                  setCitizenForm({ ...citizenForm, address: e.target.value.toUpperCase() })
                }
                className="h-10 text-xs uppercase"
              />
            </div>

            {/* Kasb maydonlari alohida "Kasb va Ish Joyi Ma'lumotlari" bo'limiga ko'chirildi */}

            {/* Fuqaro Jonli Avtokomplit Popoveri */}
            {showCitizenPopover && !selectedCitizenId && matchedCitizens.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover text-popover-foreground border border-border shadow-2xl rounded-xl p-2 max-h-60 overflow-y-auto animate-in fade-in-50">
                <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1.5 flex items-center justify-between border-b border-border/50 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Bazada mos kelgan fuqarolar ({matchedCitizens.length} ta topildi):
                  </span>
                  {isSearchingCitizens && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  )}
                </div>
                {matchedCitizens.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCitizen(c)}
                    className="p-2.5 rounded-lg hover:bg-muted/80 cursor-pointer transition flex items-center justify-between gap-3 text-xs border border-transparent hover:border-primary/20 mb-1"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {c.full_name?.trim() || 'Ismsiz fuqaro'}
                        </span>
                        {c.gender ? (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                              c.gender === 'male'
                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                : 'bg-pink-500/10 text-pink-500 border-pink-500/20'
                            }`}
                          >
                            {c.gender === 'male' ? 'Erkak' : 'Ayol'}
                          </span>
                        ) : null}
                        {c.birth_date ? (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(c.birth_date).toLocaleDateString('uz-UZ')}
                          </span>
                        ) : null}
                        {c.passport ? (
                          <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                            {c.passport}
                          </span>
                        ) : null}
                      </div>
                      {c.address ? (
                        <p className="text-[11px] text-muted-foreground truncate max-w-md">
                          {c.address}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-muted-foreground text-[11px] block">
                        {c.phone_number || 'Tel yo‘q'}
                      </span>
                      {c.pinfl ? (
                        <span className="font-mono text-[10px] text-muted-foreground/70 block">
                          JSHSHIR: {c.pinfl}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 1.5-QISM: KASB VA ISH JOYI MA'LUMOTLARI (ALOHIDA BO'LIM) */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 bg-indigo-50/60 dark:bg-indigo-950/15 transition-colors">
          <EmploymentSectionCard
            occupationCategoryId={occupationCategoryId}
            onOccupationCategoryChange={setOccupationCategoryId}
            occupationId={occupationId}
            onOccupationChange={setOccupationId}
            allOccupationCategories={allOccupationCategories}
            availableOccupations={availableOccupations}
            selectedWorkplace={selectedWorkplace}
            onSelectWorkplace={setSelectedWorkplace}
            workPosition={workPosition}
            onWorkPositionChange={setWorkPosition}
          />
        </div>

        {/* ================================================================= */}
        {/* 2-QISM: YO‘NALTIRILGAN HUDUD VA JINOYAT TURI */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-4 bg-orange-50 dark:bg-orange-950/20 transition-colors">
          <div className="flex items-center gap-2.5 border-b border-orange-200/70 dark:border-orange-800/40 pb-3">
            <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              <MapPin className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              2. Ariza Yo‘naltirilgan Tuman & Jinoyat Turi
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tuman tanlash */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Yo‘naltirilgan Tuman / Biriktirilgan Bo‘lim *
                </label>
                {selectedDistrictId && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" />
                    Biriktirildi
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDistrictId(null);
                        setDistrictForm({ name: '' });
                      }}
                      className="ml-1 hover:text-foreground"
                      title="Bekor qilish"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
              <DistrictSearchSelect
                districts={allDistricts}
                value={selectedDistrictId}
                onChange={(dId, found) => {
                  setSelectedDistrictId(dId);
                  setDistrictForm({ name: found?.name || '' });
                }}
                onlyRegionCode="QASHQADARYO"
                placeholder="-- TUMANNI TANLANG --"
                searchPlaceholder="Qashqadaryo tumanini qidiring..."
              />
            </div>

            {/* Jinoyat turi */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                  Jinoyat turi *
                </label>
                {selectedCrimeId && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" />
                    Tanlandi
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCrimeId(null);
                        setCrimeForm({ article: '' });
                      }}
                      className="ml-1 hover:text-foreground"
                      title="Bekor qilish"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>

              <select
                value={selectedCrimeId || ''}
                onChange={(e) => {
                  const cId = e.target.value;
                  setSelectedCrimeId(cId || null);
                  const found = allCrimes.find((c) => c.id === cId);
                  setCrimeForm({ article: found?.article || found?.title || '' });
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold uppercase shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">-- JINOYAT TURINI TANLANG --</option>
                {sortedCrimes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.article || c.title || '').toUpperCase()}
                  </option>
                ))}
                {selectedCrimeId && !sortedCrimes.some((c) => c.id === selectedCrimeId) && (
                  <option value={selectedCrimeId}>
                    {crimeForm.article?.toUpperCase() || 'BIRIKTIRILGAN JINOYAT TURI'}
                  </option>
                )}
              </select>
            </div>

            {/* Jinoyat sodir etish usuli (Grouped Select) */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Jinoyat sodir etish usuli
                </label>
                {selectedCrimeMethodId && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" />
                    Tanlandi
                    <button
                      type="button"
                      onClick={() => setSelectedCrimeMethodId(null)}
                      className="ml-1 hover:text-foreground cursor-pointer"
                      title="Bekor qilish"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>

              <select
                value={selectedCrimeMethodId || ''}
                onChange={(e) => setSelectedCrimeMethodId(e.target.value || null)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">-- JINOYAT SODIR ETISH USULINI TANLANG (IXTIYORIY) --</option>
                {Object.entries(groupedCrimeMethods).map(([groupName, methods]) => (
                  <optgroup key={groupName} label={groupName} className="font-bold text-foreground">
                    {methods.map((m) => (
                      <option key={m.id} value={m.id} className="font-normal py-1">
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Tanlangan jinoyat usuliga xos dinamik maydonlar (APK, Telegram va h.k.) */}
            {activeMethodFields.length > 0 && (
              <div className="md:col-span-2 p-4 rounded-xl border border-primary/25 bg-primary/[0.03] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">
                    Usul bo‘yicha qo‘shimcha ma’lumotlar ({selectedCrimeMethod?.name})
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {activeMethodFields.length} ta dinamik maydon
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeMethodFields.map((mf) => {
                    const fieldKey = mf.key || mf.label;
                    const value = methodFieldValues[fieldKey] || '';
                    return (
                      <div
                        key={fieldKey}
                        className={`space-y-1 ${mf.field_type === 'TEXT' ? 'sm:col-span-2' : ''}`}
                      >
                        <label className="text-xs font-medium text-foreground">
                          {mf.label}
                          {mf.is_required && <span className="text-rose-500 ml-0.5">*</span>}
                        </label>
                        {mf.field_type === 'SELECT' &&
                        Array.isArray(mf.options) &&
                        mf.options.length > 0 ? (
                          <select
                            value={value}
                            onChange={(e) =>
                              setMethodFieldValues((prev) => ({
                                ...prev,
                                [fieldKey]: e.target.value,
                              }))
                            }
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                          >
                            <option value="">-- Tanlang --</option>
                            {mf.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : mf.field_type === 'TEXT' ? (
                          <textarea
                            rows={2}
                            value={value}
                            placeholder={mf.placeholder || ''}
                            onChange={(e) =>
                              setMethodFieldValues((prev) => ({
                                ...prev,
                                [fieldKey]: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                          />
                        ) : (
                          <Input
                            type={
                              mf.field_type === 'NUMBER'
                                ? 'number'
                                : mf.field_type === 'DATE'
                                  ? 'date'
                                  : mf.field_type === 'URL'
                                    ? 'url'
                                    : 'text'
                            }
                            value={value}
                            placeholder={mf.placeholder || ''}
                            onChange={(e) =>
                              setMethodFieldValues((prev) => ({
                                ...prev,
                                [fieldKey]: e.target.value,
                              }))
                            }
                            className="h-9 text-xs"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fuqaro kiberxavfsizlik bo'yicha targ'ibot qilinganmi? */}
            <div className="md:col-span-2 rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Megaphone className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Fuqaro kiberxavfsizlik bo‘yicha targ‘ibot qilinganmi?
                </label>
                <div className="flex items-center gap-2">
                  {selectedAwarenessStatus && (
                    <Badge
                      className={
                        selectedAwarenessStatus.is_informed
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1'
                      }
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {selectedAwarenessStatus.is_informed ? 'Targ‘ibot qilingan' : 'Qilinmagan'}
                    </Badge>
                  )}
                  {(awarenessStatusId || isInformedModeActive) && (
                    <button
                      type="button"
                      onClick={() => {
                        setAwarenessStatusId(null);
                        setAwarenessNote('');
                        setAwarenessInformedExpanded(false);
                      }}
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      Tozalash
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setAwarenessInformedExpanded(false);
                    setAwarenessStatusId(notInformedStatus?.id || null);
                  }}
                  className={`h-10 rounded-lg border px-3 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isNotInformedSelected
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-background hover:bg-muted text-foreground border-input'
                  }`}
                >
                  <span>Yo‘q — targ‘ibot qilinmagan</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAwarenessInformedExpanded(true);
                    if (isNotInformedSelected) {
                      setAwarenessStatusId(null);
                    }
                  }}
                  className={`h-10 rounded-lg border px-3 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isInformedModeActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-background hover:bg-muted text-foreground border-input'
                  }`}
                >
                  <span>Ha — targ‘ibot qilingan</span>
                </button>
              </div>

              {isInformedModeActive && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Kim targ‘ibot qilgan va fuqaro qanday jabrlangan? *
                    </label>
                    <select
                      value={selectedAwarenessStatus?.is_informed ? awarenessStatusId || '' : ''}
                      onChange={(e) => setAwarenessStatusId(e.target.value || null)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                    >
                      <option value="">-- TARG‘IBOT TURINI TANLANG --</option>
                      {informedAwarenessStatuses.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Qo‘shimcha izoh (ixtiyoriy)
                    </label>
                    <Input
                      value={awarenessNote}
                      onChange={(e) => setAwarenessNote(e.target.value)}
                      placeholder="Masalan: Telegramdagi APK..."
                      className="h-10 text-xs bg-background"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tashqi tizimlarga kiritilganligi (CardBlock, E-Elektron, E-Material, ...) */}
            {allExternalSystems.length > 0 && (
              <div className="md:col-span-2 rounded-xl border border-indigo-500/25 bg-indigo-500/[0.04] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                      <Server className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Tashqi tizimlarga kiritilganligi
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Ushbu ariza qaysi boshqa tizimlarga kiritilgan bo‘lsa «Ha» deb belgilang
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-mono border-indigo-500/35 text-indigo-700 dark:text-indigo-300"
                  >
                    {
                      externalSystemIds.filter((sysId) =>
                        allExternalSystems.some((s) => s.id === sysId),
                      ).length
                    }{' '}
                    / {allExternalSystems.length} kiritilgan
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {allExternalSystems.map((sys) => {
                    const isChecked = externalSystemIds.includes(sys.id);
                    return (
                      <div
                        key={sys.id}
                        className={`rounded-lg border p-2.5 transition-all flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/40 shadow-2xs'
                            : 'bg-background/80 border-border hover:border-border/80'
                        }`}
                        title={sys.description || sys.name}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: sys.color || '#2563EB' }}
                          />
                          <span className="text-xs font-semibold text-foreground truncate">
                            {sys.name}
                          </span>
                        </div>
                        <div className="flex items-center rounded-md border border-input bg-muted/40 p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleExternalSystemSelection(sys.id, true)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Ha
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleExternalSystemSelection(sys.id, false)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                              !isChecked
                                ? 'bg-background text-foreground shadow-2xs border border-border/60'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Yo‘q
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sohaviy Xizmat & Qabul qilingan Qaror Turi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2 pt-1">
              {/* Sohaviy Xizmat */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    Biriktirilgan Sohaviy Xizmat
                  </label>
                  {departmentServiceId && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Tanlandi
                    </Badge>
                  )}
                </div>
                <select
                  value={departmentServiceId || ''}
                  onChange={(e) => setDepartmentServiceId(e.target.value || null)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold uppercase shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">-- SOHAVIY XIZMATNI TANLANG --</option>
                  {allDepartmentServices.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.short_name ? `[${ds.short_name}] ` : ''}
                      {ds.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Qaror Turi */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-primary" />
                    Qabul qilingan Qaror Turi
                  </label>
                  {decisionTypeId && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Tanlandi
                    </Badge>
                  )}
                </div>
                <select
                  value={decisionTypeId || ''}
                  onChange={(e) => setDecisionTypeId(e.target.value || null)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold uppercase shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">-- QAROR TURINI TANLANG --</option>
                  {allDecisionTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Protsessual Muddat (SLA) va Qaror Rekvizitlari */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Tekshiruv muddati (JPK 329-m.)
                </label>
                <select
                  value={slaDays}
                  onChange={(e) => setSlaDays(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">Avtomatik (Status bo‘yicha)</option>
                  <option value="3">3 kun (Tezkor tekshiruv)</option>
                  <option value="10">10 kun (Standart JPK 329-m.)</option>
                  <option value="30">30 kun (Uzaytirilgan)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Qaror / Jinoyat ishi raqami
                </label>
                <Input
                  placeholder="Masalan: JI № 124/2026"
                  value={decisionNumber}
                  onChange={(e) => setDecisionNumber(e.target.value)}
                  className="h-10 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Qaror sanasi</label>
                <Input
                  type="date"
                  value={decisionDate}
                  onChange={(e) => setDecisionDate(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Qaror izohi</label>
                <Input
                  placeholder="Qisqa izoh (ixtiyoriy)..."
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>
            </div>

            {/* Rad Etish Sababi (Agar ariza rad etilgan bo'lsa yoki rad etish qarori tanlansa) */}
            {(status === 'RAD_ETILDI' ||
              allDecisionTypes
                .find((d) => d.id === decisionTypeId)
                ?.name.toLowerCase()
                .includes('rad') ||
              rejectionReasonId) && (
              <div className="md:col-span-2 space-y-1.5 p-3.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertOctagon className="h-4 w-4 text-rose-600" />
                    Arizani Rad Etish Sababi *
                  </label>
                  {rejectionReasonId && (
                    <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400/40 gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Sabab biriktirildi
                    </Badge>
                  )}
                </div>
                <select
                  value={rejectionReasonId || ''}
                  onChange={(e) => setRejectionReasonId(e.target.value || null)}
                  className="h-10 w-full rounded-md border border-rose-300 bg-background px-3 py-2 text-xs font-semibold uppercase shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="">-- RAD ETISH SABABINI TANLANG --</option>
                  {allRejectionReasons.map((rr) => (
                    <option key={rr.id} value={rr.id}>
                      {rr.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Fabula</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hodisa qanday sodir bo‘lgani, jabrlanuvchining murojaati va holat tafsilotlari..."
              className="w-full rounded-lg border border-input bg-background p-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Xodim Ko‘rsatmasi / Ma'lumotnomasi</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Xodim tomonidan kiritiladigan ma'lumot
              </span>
            </label>
            <textarea
              rows={4}
              value={officerNotes}
              onChange={(e) => setOfficerNotes(e.target.value)}
              placeholder="Surishtiruvchi / xodim tomonidan aniqlangan holatlar, ma'lumotlar va qaydlar..."
              className="w-full rounded-lg border border-input bg-background p-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>

          {/* FIRIBGAR / GUMONLANUVCHI MA'LUMOTLARI DARAXTI (MINDMAP) */}
          <div className="pt-2 border-t border-border/50">
            <SuspectTreeBuilder
              value={suspectTree}
              onChange={setSuspectTree}
              excludeAppId={location.pathname.includes('/edit/') ? id : undefined}
            />
          </div>
        </div>

        <FinancialTransfersSection
          hasFinancialLoss={hasFinancialLoss}
          setHasFinancialLoss={setHasFinancialLoss}
          transferContainerRef={transferContainerRef}
          financialTransfers={financialTransfers}
          activeTransferPopover={activeTransferPopover}
          setActiveTransferPopover={setActiveTransferPopover}
          filteredVictimCards={filteredVictimCards}
          filteredReceiverCards={filteredReceiverCards}
          allBanks={allBanks}
          allProviders={allProviders}
          excludeAppId={location.pathname.includes('/edit/') ? id : undefined}
          onUpdateTransferEntry={handleUpdateTransferEntry}
          onAddTransferEntry={handleAddTransferEntry}
          onRemoveTransferEntry={handleRemoveTransferEntry}
          onFillApplicantName={handleFillApplicantName}
        />

        <NonCardDamagesSection
          hasNonCardDamage={hasNonCardDamage}
          setHasNonCardDamage={setHasNonCardDamage}
          nonCardDamages={nonCardDamages}
          allBanks={allBanks}
          allProviders={allProviders}
          onUpdateDamageEntry={handleUpdateDamageEntry}
          onAddDamageEntry={handleAddDamageEntry}
          onRemoveDamageEntry={handleRemoveDamageEntry}
          onAddSuspectClue={handleAddSuspectClueFromDamage}
        />

        <EvidenceAndCitizensSection
          applicationId={id}
          excludeAppId={location.pathname.includes('/edit/') ? id : undefined}
          evidenceFiles={evidenceFiles}
          isUploadingEvidence={isUploadingEvidence}
          isDraggingEvidence={isDraggingEvidence}
          setIsDraggingEvidence={setIsDraggingEvidence}
          evidenceInputRef={evidenceInputRef}
          onUploadEvidenceFiles={handleUploadEvidenceFiles}
          onRemoveEvidenceFile={handleRemoveEvidenceFile}
          appDocuments={appDocuments}
          wordFileInputRef={wordFileInputRef}
          isUploadingWord={uploadWordMutation.isPending}
          onOpenWordUploadDialog={(file) =>
            setWordDialogState({ isOpen: true, mode: 'upload', file })
          }
          onOpenTemplateModal={(initialTemplateId) =>
            setTemplateModalState({ isOpen: true, initialTemplateId })
          }
          onEditDocument={(docId) => setActiveEditingDocId(docId)}
          onRequestDeleteDocument={(doc) => setDocToDelete(doc)}
          customFields={customFields}
          allDistricts={allDistricts}
          onAddCustomFieldItem={handleAddCustomFieldItem}
          onRemoveCustomFieldItem={handleRemoveCustomFieldItem}
          onUpdateCustomFieldItem={handleUpdateCustomFieldItem}
        />
      </div>

      {/* ===================================================================== */}
      {/* HARAKATLAR PANELI (STICKY BOTTOM ACTION DOCK) */}
      {/* ===================================================================== */}
      <div className="sticky bottom-2 sm:bottom-4 z-30 w-full mt-6">
        <div className="w-full p-4 sm:p-5 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-foreground tracking-tight">
                  Ariza {applicationNumber ? `№ ${applicationNumber}` : '(Raqamsiz)'}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono uppercase px-2 py-0 border-primary/40 text-primary font-bold"
                >
                  {allApplicationStatuses.find((s) => s.id === statusId || s.code === status)
                    ?.name || status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Kiritilgan barcha fuqaro, hudud, modda, karta va dalillar biriktiriladi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            {isEditMode || !id ? (
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => {
                  if (!id && !hasUnsavedData) {
                    draftClearedRef.current = true;
                    clearApplicationDraft(currentUserId);
                    setCanLeave(true);
                    navigate('/applications');
                    return;
                  }
                  setIsCancelModalOpen(true);
                }}
                disabled={saveMutation.isPending}
                className="h-10 text-xs font-semibold px-4 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 text-slate-500" />
                Bekor qilish
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={deleteMutation.isPending || saveMutation.isPending}
                className="h-10 text-xs font-semibold px-4 gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Bekor qilish / O‘chirish
              </Button>
            )}

            <Button
              type="button"
              size="default"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || deleteMutation.isPending}
              className="h-10 text-xs font-bold px-6 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all cursor-pointer min-w-[190px]"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>
                    {isEditMode ? 'O‘zgarishlarni Saqlash' : 'Arizani Saqlash & Yakunlash'}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* TAHRIRLASHNI YOKI YANGI FORMANI BEKOR QILISH DIALOGI */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
              <RotateCcw className="h-5 w-5 text-slate-500" />
              <span>{isEditMode ? 'Tahrirlashni bekor qilish' : 'Formadan chiqish'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
              {isEditMode
                ? 'Haqiqatan ham tahrirlash formasidan chiqmoqchimisiz? Kiritilgan oxirgi o‘zgarishlar saqlanmaydi, ammo mavjud ariza va unga biriktirilgan barcha ma‘lumotlar bazada to‘liq o‘z holicha saqlanib qoladi (o‘chirilmaydi).'
                : 'Haqiqatan ham ariza kiritish formasidan chiqmoqchimisiz? Kiritilgan ma‘lumotlar bazaga saqlanmaydi.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="default"
              onClick={() => setIsCancelModalOpen(false)}
              className="text-xs sm:text-sm h-10 px-4 cursor-pointer font-medium"
            >
              Yo‘q, davom etish
            </Button>
            <Button
              variant="default"
              size="default"
              onClick={() => {
                setCanLeave(true);
                setIsCancelModalOpen(false);
                if (isEditMode && id) {
                  toast.info('Tahrirlash bekor qilindi (ariza o‘chirilmay saqlanib qoldi)');
                  navigate(`/applications/${id}`);
                } else {
                  draftClearedRef.current = true;
                  clearApplicationDraft(currentUserId);
                  toast.info('Ariza qoralamasi tozalandi');
                  navigate('/applications');
                }
              }}
              className="text-xs sm:text-sm h-10 px-5 font-semibold cursor-pointer gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Ha, bekor qilinsin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* O'CHIRISHNI TASDIQLASH DIALOGI */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              <span>Ariza loyihasini butunlay o‘chirish</span>
            </DialogTitle>
            <DialogDescription>
              Ushbu arizani va kiritilgan barcha ma‘lumotlarni bazadan to‘liq o‘chirib
              tashlamoqchimisiz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="default"
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-xs sm:text-sm h-10 px-4 cursor-pointer font-medium"
            >
              Yo‘q, davom etish
            </Button>
            <Button
              variant="destructive"
              size="default"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-xs sm:text-sm h-10 px-5 font-semibold cursor-pointer shadow-md shadow-red-500/20 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleteMutation.isPending ? 'O‘chirilmoqda...' : 'Ha, butunlay o‘chirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FUQARONI ARIZADAN AJRATISH CONFIRM DIALOGI */}
      <ConfirmDialog
        open={showUnlinkCitizenConfirm}
        onOpenChange={setShowUnlinkCitizenConfirm}
        title="Fuqaroni arizadan ajratish"
        description={
          isEditMode
            ? 'Ushbu fuqaroni arizadan ajratib, boshqa fuqaroni tanlamoqchimisiz yoki yangi kiritmoqchimisiz? Mavjud fuqaro profili bazada saqlanib qoladi.'
            : 'Tanlangan fuqaroni bekor qilib, boshqa fuqaro tanlamoqchimisiz yoki yangi kiritmoqchimisiz?'
        }
        confirmText="Ha, ajratilsin"
        cancelText="Bekor qilish"
        variant="default"
        onConfirm={confirmUnlinkCitizen}
      />

      {/* WORD HUJJATINI O'CHIRISH DIALOGI */}
      <ConfirmDialog
        open={!!docToDelete}
        onOpenChange={(open) => !open && setDocToDelete(null)}
        title="Word hujjatini o‘chirish"
        description={
          docToDelete ? (
            <span>
              Haqiqatan ham{' '}
              <strong className="text-foreground font-semibold">"{docToDelete.title}"</strong> nomli
              rasmiy Word hujjatini tizimdan o‘chirmoqchimisiz?
            </span>
          ) : (
            ''
          )
        }
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        isLoading={deleteDocMutation.isPending}
        onConfirm={() => {
          if (docToDelete) {
            deleteDocMutation.mutate(docToDelete.id, {
              onSettled: () => setDocToDelete(null),
            });
          }
        }}
      />

      {/* WORD HUJJATINI YARATISH YOKI YUKLASHDA NOMINI SO'RASH DIALOGI */}
      <CreateWordDialog
        isOpen={wordDialogState.isOpen}
        fileToUpload={wordDialogState.file}
        applicationNumber={initialApp?.application_number}
        isLoading={createBlankDocMutation.isPending || uploadWordMutation.isPending}
        onClose={() => setWordDialogState((prev) => ({ ...prev, isOpen: false, file: null }))}
        onSubmit={async (title, file) => {
          if (wordDialogState.mode === 'upload' && file) {
            await uploadWordMutation.mutateAsync({ file, title });
            setWordDialogState((prev) => ({ ...prev, isOpen: false, file: null }));
          } else {
            await createBlankDocMutation.mutateAsync(title);
            setWordDialogState((prev) => ({ ...prev, isOpen: false, file: null }));
          }
        }}
      />

      {/* SHABLON YOKI BO'SH WORD HUJJAT YARATISH MODALI */}
      {id && (
        <TemplateGeneratorModal
          isOpen={templateModalState.isOpen}
          applicationId={id}
          applicationNumber={initialApp?.application_number}
          initialTemplateId={templateModalState.initialTemplateId}
          onClose={() => setTemplateModalState((prev) => ({ ...prev, isOpen: false }))}
          onSuccess={(newDocId) => {
            refetchDocuments();
            setActiveEditingDocId(newDocId);
          }}
        />
      )}

      {/* ONLYOFFICE WORD MUHARRIRI MODALI */}
      {initialApp && (
        <DocumentEditorModal
          documentId={activeEditingDocId}
          application={initialApp}
          isOpen={!!activeEditingDocId}
          onClose={() => setActiveEditingDocId(null)}
          onSaved={() => refetchDocuments()}
        />
      )}

      {/* TEZKOR HUDUD (VILOYAT / TUMAN / MAHALLA) QO'SHISH MODALI */}
      <QuickLocationDialog
        open={quickLocationState.open}
        onOpenChange={(open) => setQuickLocationState((prev) => ({ ...prev, open }))}
        initialRegionId={quickLocationState.initialRegionId}
        initialDistrictId={quickLocationState.initialDistrictId}
        initialDistrictQuery={quickLocationState.initialDistrictQuery}
        initialNeighborhoodQuery={quickLocationState.initialNeighborhoodQuery}
        onCreated={({ district, neighborhood }) => {
          setCitizenDistrictId(district.id);
          if (neighborhood) {
            setCitizenMahallaId(neighborhood.id);
          } else if (citizenDistrictId !== district.id) {
            setCitizenMahallaId(null);
          }
        }}
      />
    </div>
  );
}
