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
  Radio,
  RotateCcw,
  Save,
  Scale,
  Shield,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import type {
  AppCustomFieldState,
  FinancialTransferEntry,
} from '@/components/applications/application-form.types';
import { EmploymentSectionCard } from '@/components/applications/employment-section-card';
import { EvidenceAndCitizensSection } from '@/components/applications/evidence-and-citizens-section';
import { FinancialTransfersSection } from '@/components/applications/financial-transfers-section';
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
import { FemaleIcon, MaleIcon } from '@/components/ui/gender-icons';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { toast } from '@/components/ui/sonner';
import { useDebounce } from '@/hooks/use-debounce';
import {
  applicationsApi,
  applicationSourcesApi,
  applicationStatusesApi,
  banksApi,
  cardsApi,
  citizensApi,
  crimeMethodsApi,
  crimesApi,
  decisionTypesApi,
  departmentServicesApi,
  districtsApi,
  documentsApi,
  filesApi,
  mahallasApi,
  occupationCategoriesApi,
  occupationsApi,
  paymentProvidersApi,
  rejectionReasonsApi,
  type UploadedFile,
} from '@/lib/api';
import { formatLocalDateISO, toLocalDateInputValue } from '@/lib/date';
import { getErrorMessage } from '@/lib/error';
import { formatTitleCase, formatUzbekName } from '@/lib/formatters';
import type { ApplicationStatus, Citizen, CrimeMethod, CustomFieldType } from '@/types/models';

export type {
  AppCustomFieldState,
  FinancialTransferEntry,
} from '@/components/applications/application-form.types';

let transferClientIdCounter = 0;
const createDefaultTransferEntry = (): FinancialTransferEntry => ({
  clientId: `ft_${++transferClientIdCounter}`,
  victimCardId: null,
  victimCardNumber: '',
  victimCardFullName: '',
  victimBankName: '',
  transferId: null,
  amount: '',
  currency: 'UZS',
  providerId: null,
  providerName: '',
  transferDate: '',
  transferTime: '',
  receiverCardId: null,
  receiverCardNumber: '',
  receiverCardFullName: '',
  receiverBankName: '',
});

export function ApplicationCreatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [canLeave, setCanLeave] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // ==========================================================================
  // 1. ASOSIY ARIZA QAYD REKVIZITLARI
  // ==========================================================================
  const [applicationNumber, setApplicationNumber] = useState('');
  const [applicationNumberTouched, setApplicationNumberTouched] = useState(false);
  const showAppNumberWarning = applicationNumberTouched && !applicationNumber.trim();
  const [description, setDescription] = useState('');
  const [officerNotes, setOfficerNotes] = useState('');
  const [suspectTree, setSuspectTree] = useState<unknown[]>([]);
  const [status, setStatus] = useState<ApplicationStatus>('YANGI');
  const [statusId, setStatusId] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [date, setDate] = useState(() => formatLocalDateISO());

  // ==========================================================================
  // 2. ARIZACHI FUQARO ANKETASI
  // ==========================================================================
  const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(null);
  const [citizenForm, setCitizenForm] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    passport: '',
    phone_number: '',
    pinfl: '',
    address: '',
    birth_date: '',
    gender: '' as 'male' | 'female' | '',
  });
  const [showCitizenPopover, setShowCitizenPopover] = useState(false);
  const citizenPopoverRef = useRef<HTMLDivElement>(null);

  // Fuqaroning kasbi va ish joyi
  const [occupationCategoryId, setOccupationCategoryId] = useState<string | null>(null);
  const [occupationId, setOccupationId] = useState<string | null>(null);
  const [selectedWorkplace, setSelectedWorkplace] = useState<
    import('@/types/models').Workplace | null
  >(null);
  const [workPosition, setWorkPosition] = useState<string>('');

  // Fuqaroning yashash tumani va mahallasi
  const [citizenDistrictId, setCitizenDistrictId] = useState<string | null>(null);
  const [citizenMahallaId, setCitizenMahallaId] = useState<string | null>(null);
  const [showUnlinkCitizenConfirm, setShowUnlinkCitizenConfirm] = useState(false);

  // ==========================================================================
  // 3. HODISA HUDUDI VA JINOYAT MODDASI
  // ==========================================================================
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [districtForm, setDistrictForm] = useState({
    name: '',
  });

  const [selectedCrimeId, setSelectedCrimeId] = useState<string | null>(null);
  const [selectedCrimeMethodId, setSelectedCrimeMethodId] = useState<string | null>(null);
  const [crimeForm, setCrimeForm] = useState<{
    article: string;
  }>({
    article: '',
  });

  // Sohaviy xizmat, SLA va yakuniy qaror
  const [departmentServiceId, setDepartmentServiceId] = useState<string | null>(null);
  const [decisionTypeId, setDecisionTypeId] = useState<string | null>(null);
  const [rejectionReasonId, setRejectionReasonId] = useState<string | null>(null);
  const [slaDays, setSlaDays] = useState<string>('');
  const [decisionNumber, setDecisionNumber] = useState<string>('');
  const [decisionDate, setDecisionDate] = useState<string>('');
  const [decisionNote, setDecisionNote] = useState<string>('');

  // ==========================================================================
  // 4. MOLIYAVIY ZARAR VA TRANZAKSIYA SHAKLLARI
  // ==========================================================================
  const [hasFinancialLoss, setHasFinancialLoss] = useState(false);

  const [financialTransfers, setFinancialTransfers] = useState<FinancialTransferEntry[]>([
    createDefaultTransferEntry(),
  ]);

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
    const parts = [citizenForm.last_name, citizenForm.first_name, citizenForm.middle_name].filter(
      (p) => Boolean(p && p.trim()),
    );
    const fullName = parts.join(' ').trim();
    if (!fullName) {
      toast.info('Avval 1-bo‘limda arizachining F.I.SH. ma‘lumotlarini kiriting');
      return;
    }
    handleUpdateTransferEntry(index, { victimCardFullName: fullName.toUpperCase() });
    toast.success('Arizachining F.I.SH. ma‘lumoti kartaga nusxalandi');
  };

  // ==========================================================================
  // 5. YAGONA ISBOTLAR VA DALILLAR (MinIO)
  // ==========================================================================
  const [evidenceFiles, setEvidenceFiles] = useState<UploadedFile[]>([]);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [isDraggingEvidence, setIsDraggingEvidence] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // ==========================================================================
  // 6. QO'SHIMCHA SUBYEKTLAR (APPLICATION CUSTOM FIELDS)
  // ==========================================================================
  const [customFields, setCustomFields] = useState<AppCustomFieldState[]>([]);

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
    debouncedCitizenForm.first_name.trim() ||
    debouncedCitizenForm.last_name.trim() ||
    debouncedCitizenForm.middle_name.trim() ||
    debouncedCitizenForm.phone_number.trim() ||
    debouncedCitizenForm.passport.trim() ||
    debouncedCitizenForm.pinfl.trim(),
  );

  const { data: searchedCitizensData, isFetching: isSearchingCitizens } = useQuery({
    queryKey: [
      'citizens-live-search',
      debouncedCitizenForm.first_name.trim(),
      debouncedCitizenForm.last_name.trim(),
      debouncedCitizenForm.middle_name.trim(),
      debouncedCitizenForm.phone_number.trim(),
      debouncedCitizenForm.passport.trim(),
      debouncedCitizenForm.pinfl.trim(),
    ],
    queryFn: () =>
      citizensApi.getAll({
        first_name: debouncedCitizenForm.first_name.trim() || undefined,
        last_name: debouncedCitizenForm.last_name.trim() || undefined,
        middle_name: debouncedCitizenForm.middle_name.trim() || undefined,
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
    queryFn: () => districtsApi.getAll({ limit: 100 }),
  });
  const allDistricts = districtsData?.items || [];

  const { data: citizenMahallasData } = useQuery({
    queryKey: ['citizen-mahallas', citizenDistrictId],
    queryFn: () => mahallasApi.getAll({ district_id: citizenDistrictId!, limit: 200 }),
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

  const [methodFieldValues, setMethodFieldValues] = useState<Record<string, string>>({});

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
    setDepartmentServiceId(
      initialApp.department_service_id || initialApp.department_service?.id || null,
    );
    setDecisionTypeId(initialApp.decision_type_id || initialApp.decision_type?.id || null);
    setRejectionReasonId(initialApp.rejection_reason_id || initialApp.rejection_reason?.id || null);
    setSlaDays(initialApp.sla_days ? String(initialApp.sla_days) : '');
    setDecisionNumber(initialApp.decision_number || '');
    setDecisionDate(toLocalDateInputValue(initialApp.decision_date));
    setDecisionNote(initialApp.decision_note || '');
    if (initialApp.date) {
      setDate(toLocalDateInputValue(initialApp.date));
    }

    if (initialApp.citizen) {
      setSelectedCitizenId(initialApp.citizen.id);
      setCitizenDistrictId(
        initialApp.citizen.district_id || initialApp.citizen.district?.id || null,
      );
      setCitizenMahallaId(initialApp.citizen.mahalla_id || initialApp.citizen.mahalla?.id || null);
      setOccupationCategoryId(
        initialApp.citizen.occupation_category_id ||
          initialApp.citizen.occupation_category?.id ||
          null,
      );
      setOccupationId(
        initialApp.citizen.occupation_id || initialApp.citizen.occupation?.id || null,
      );
      const initWp = initialApp.workplace || initialApp.citizen.workplace || null;
      if (initWp) setSelectedWorkplace(initWp);
      setWorkPosition(initialApp.work_position || initialApp.citizen.work_position || '');
      setCitizenForm({
        first_name: initialApp.citizen.first_name || '',
        last_name: initialApp.citizen.last_name || '',
        middle_name: initialApp.citizen.middle_name || '',
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

    if (hasPrimaryFinancial) {
      loadedTransfers.push({
        clientId: 'primary_ft',
        victimCardId: initialApp.card?.id || initialApp.card_id || null,
        victimCardNumber: initialApp.card?.card_number || '',
        victimCardFullName: initialApp.card?.full_name || '',
        victimBankName: initialApp.card?.bank?.name || '',
        transferId: initialApp.transfer?.id || initialApp.transfer_id || null,
        amount: initialApp.transfer?.amount ? String(initialApp.transfer.amount) : '',
        currency: initialApp.transfer?.currency || 'UZS',
        providerId: initialApp.transfer?.payment_provider?.id || null,
        providerName: initialApp.transfer?.payment_provider?.name || '',
        transferDate: initialApp.transfer?.transfer_date || '',
        transferTime: initialApp.transfer?.transfer_time || '',
        receiverCardId: initialApp.transfer?.receiver_card?.id || null,
        receiverCardNumber: initialApp.transfer?.receiver_card?.card_number || '',
        receiverCardFullName: initialApp.transfer?.receiver_card?.full_name || '',
        receiverBankName: initialApp.transfer?.receiver_card?.bank?.name || '',
      });
    }

    if (initialApp.custom_fields) {
      const loadedEvidence: UploadedFile[] = [];
      const nonEvidenceFields: AppCustomFieldState[] = [];

      initialApp.custom_fields.forEach((cf, idx) => {
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
          loadedTransfers.push({
            clientId: cf.id || `custom_ft_${idx}`,
            victimCardId: sc?.id || cf.card_id || null,
            victimCardNumber: sc?.card_number || '',
            victimCardFullName: sc?.full_name || '',
            victimBankName: sc?.bank?.name || '',
            transferId: t?.id || cf.transfer_id || null,
            amount: t?.amount ? String(t.amount) : '',
            currency: t?.currency || 'UZS',
            providerId: t?.payment_provider?.id || null,
            providerName: t?.payment_provider?.name || '',
            transferDate: t?.transfer_date || '',
            transferTime: t?.transfer_time || '',
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
            value: cf.value,
            order: cf.order ?? idx,
            citizen_id: cf.citizen_id,
            card_id: cf.card_id,
            crime_id: cf.crime_id,
            district_id: cf.district_id,
            transfer_id: cf.transfer_id,
            inline_citizen: cf.citizen
              ? {
                  first_name: cf.citizen.first_name || '',
                  last_name: cf.citizen.last_name || '',
                  middle_name: cf.citizen.middle_name || '',
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
                  mahalla_id: cf.citizen.mahalla_id || cf.citizen.mahalla?.id || null,
                  mahalla_name: cf.citizen.mahalla?.name || '',
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
  }, [initialApp]);

  const hasUnsavedData = Boolean(
    applicationNumber.trim() ||
    description.trim() ||
    officerNotes.trim() ||
    suspectTree.length > 0 ||
    selectedCitizenId ||
    citizenForm.first_name.trim() ||
    citizenForm.last_name.trim() ||
    citizenForm.phone_number.trim() ||
    citizenForm.passport.trim() ||
    citizenForm.pinfl.trim() ||
    selectedDistrictId ||
    selectedCrimeId ||
    selectedCrimeMethodId ||
    hasFinancialLoss ||
    evidenceFiles.length > 0 ||
    customFields.length > 0,
  );

  // Tab yopilishidan himoya
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!canLeave && (Boolean(id) || hasUnsavedData)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [canLeave, id, hasUnsavedData]);

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
    setCitizenMahallaId(c.mahalla_id || c.mahalla?.id || null);
    setOccupationCategoryId(c.occupation_category_id || c.occupation_category?.id || null);
    setOccupationId(c.occupation_id || c.occupation?.id || null);
    setSelectedWorkplace(c.workplace || null);
    setWorkPosition(c.work_position || '');
    setCitizenForm({
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      middle_name: c.middle_name || '',
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
      first_name: '',
      last_name: '',
      middle_name: '',
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
    const newItem: AppCustomFieldState = {
      clientId,
      type,
      label: defaultLabel,
      key: `${type.toLowerCase()}_${Date.now()}`,
      value: type === 'TEXT' ? '' : null,
      order: customFields.length,
      inline_citizen:
        type === 'CITIZEN'
          ? {
              first_name: '',
              last_name: '',
              middle_name: '',
              passport: '',
              phone_number: '',
              pinfl: '',
              address: '',
              district_id: null,
              district_name: '',
              mahalla_id: null,
              mahalla_name: '',
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
        description: description || undefined,
        officer_notes: officerNotes || undefined,
        suspect_tree: suspectTree,
        status,
        status_id: statusId || undefined,
        date: date ? new Date(date).toISOString() : undefined,
        source_id: sourceId || null,
        department_service_id: departmentServiceId || null,
        decision_type_id: decisionTypeId || null,
        rejection_reason_id: rejectionReasonId || null,
        sla_days: slaDays ? Number(slaDays) : undefined,
        decision_number: decisionNumber.trim() || null,
        decision_date: decisionDate || null,
        decision_note: decisionNote.trim() || null,
      };

      // 1. Fuqaro
      const citizenDataObj: Record<string, unknown> = {
        first_name: citizenForm.first_name ? formatUzbekName(citizenForm.first_name) : undefined,
        last_name: citizenForm.last_name ? formatUzbekName(citizenForm.last_name) : undefined,
        middle_name: citizenForm.middle_name ? formatUzbekName(citizenForm.middle_name) : undefined,
        passport:
          citizenForm.passport && citizenForm.passport.trim() !== ''
            ? citizenForm.passport.trim().toUpperCase()
            : undefined,
        phone_number: citizenForm.phone_number || undefined,
        pinfl:
          citizenForm.pinfl && citizenForm.pinfl.trim() !== ''
            ? citizenForm.pinfl.trim()
            : undefined,
        birth_date: citizenForm.birth_date || undefined,
        gender: citizenForm.gender || undefined,
        address: citizenForm.address || undefined,
        district_id: citizenDistrictId || undefined,
        mahalla_id: citizenMahallaId || undefined,
        occupation_category_id: occupationCategoryId || null,
        occupation_id: occupationId || null,
      };

      if (selectedCitizenId) {
        payload.citizen_id = selectedCitizenId;
        payload.citizen_data = citizenDataObj;
      } else if (
        citizenForm.first_name ||
        citizenForm.last_name ||
        citizenForm.phone_number ||
        citizenForm.passport ||
        citizenForm.pinfl ||
        citizenForm.birth_date ||
        citizenForm.gender ||
        citizenDistrictId ||
        citizenMahallaId ||
        citizenForm.address ||
        occupationCategoryId ||
        occupationId
      ) {
        payload.citizen_data = citizenDataObj;
      }

      // 1.5. Ish joyi / Tashkilot va lavozimi (Snapshot + Citizen profili)
      payload.workplace_id = selectedWorkplace ? selectedWorkplace.id : null;
      payload.work_position = workPosition.trim() || null;

      // 2. Tuman
      if (selectedDistrictId) {
        payload.district_id = selectedDistrictId;
      } else if (districtForm.name.trim()) {
        payload.district_data = {
          name: districtForm.name.trim(),
        };
      }

      // 3. Jinoyat turi
      if (selectedCrimeId) {
        payload.crime_id = selectedCrimeId;
      } else if (crimeForm.article.trim()) {
        payload.crime_data = {
          article: crimeForm.article.trim(),
          title: crimeForm.article.trim(),
        };
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
      const activeMethodFieldKeys = new Set(activeMethodFields.map((mf) => mf.key || mf.label));
      const allCustomFields = customFields.filter(
        (cf) => !cf.key || !activeMethodFieldKeys.has(cf.key),
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

      if (hasFinancialLoss && financialTransfers.length > 0) {
        const primary = financialTransfers[0];

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

        // Primary O'tkazma
        if (primary.transferId) {
          payload.transfer_id = primary.transferId;
        }
        if (
          primary.amount ||
          primary.receiverCardNumber ||
          primary.receiverCardFullName ||
          primary.transferDate
        ) {
          payload.transfer_data = {
            amount: primary.amount ? Number(String(primary.amount).replace(/\s/g, '')) : undefined,
            currency: primary.currency || 'UZS',
            payment_provider_id: primary.providerId || undefined,
            payment_provider_name: primary.providerId
              ? undefined
              : primary.providerName
                ? formatTitleCase(primary.providerName)
                : undefined,
            receiver_card_id: primary.receiverCardId || undefined,
            receiver_card_number: primary.receiverCardId
              ? undefined
              : primary.receiverCardNumber.replace(/\D/g, ''),
            receiver_card_full_name: primary.receiverCardFullName
              ? formatUzbekName(primary.receiverCardFullName)
              : undefined,
            receiver_bank_name: primary.receiverBankName
              ? formatTitleCase(primary.receiverBankName)
              : undefined,
            transfer_date: primary.transferDate || undefined,
            transfer_time: primary.transferTime || undefined,
          };
        }

        // Qo'shimcha o'tkazmalar (1 dan boshlab)
        financialTransfers.slice(1).forEach((entry, idx) => {
          allCustomFields.push({
            clientId: entry.clientId,
            type: 'TRANSFER',
            label: `Qo‘shimcha o‘tkazma #${idx + 2}`,
            key: `transfer_${entry.clientId}`,
            value: entry.amount ? `${entry.amount} ${entry.currency}` : 'O‘tkazma',
            order: allCustomFields.length + idx,
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
              amount: entry.amount ? Number(String(entry.amount).replace(/\s/g, '')) : '',
              currency: entry.currency || 'UZS',
              payment_provider_id: entry.providerId || undefined,
              payment_provider_name: entry.providerId
                ? undefined
                : entry.providerName
                  ? formatTitleCase(entry.providerName)
                  : undefined,
              receiver_card_id: entry.receiverCardId || undefined,
              receiver_card_number: entry.receiverCardId
                ? undefined
                : entry.receiverCardNumber.replace(/\D/g, ''),
              receiver_card_full_name: entry.receiverCardFullName
                ? formatUzbekName(entry.receiverCardFullName)
                : undefined,
              receiver_bank_name: entry.receiverBankName
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
            {/* 1-Qator: Ism, Familiya, Sharif */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Ism *</label>
                <Input
                  placeholder="ISM"
                  value={citizenForm.first_name}
                  onFocus={() => {
                    if (!selectedCitizenId) setShowCitizenPopover(true);
                  }}
                  onChange={(e) => {
                    setCitizenForm({ ...citizenForm, first_name: e.target.value });
                    if (!selectedCitizenId) setShowCitizenPopover(true);
                  }}
                  className="h-10 text-xs uppercase font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Familiya *</label>
                <Input
                  placeholder="FAMILIYA"
                  value={citizenForm.last_name}
                  onFocus={() => {
                    if (!selectedCitizenId) setShowCitizenPopover(true);
                  }}
                  onChange={(e) => {
                    setCitizenForm({ ...citizenForm, last_name: e.target.value });
                    if (!selectedCitizenId) setShowCitizenPopover(true);
                  }}
                  className="h-10 text-xs uppercase font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Sharif (Otasining ismi)
                </label>
                <Input
                  placeholder="SHARIF"
                  value={citizenForm.middle_name}
                  onFocus={() => {
                    if (!selectedCitizenId) setShowCitizenPopover(true);
                  }}
                  onChange={(e) => {
                    setCitizenForm({ ...citizenForm, middle_name: e.target.value });
                    if (!selectedCitizenId) setShowCitizenPopover(true);
                  }}
                  className="h-10 text-xs uppercase font-medium"
                />
              </div>
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

            {/* 3-Qator: Tuman va Mahalla (Fuqaro yashaydigan hududi) */}
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
                <select
                  value={citizenDistrictId || ''}
                  onChange={(e) => {
                    const dId = e.target.value;
                    setCitizenDistrictId(dId || null);
                    setCitizenMahallaId(null);
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold uppercase shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- TUMANNI TANLANG --</option>
                  {allDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Yashash Mahallasi */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    Yashash Mahallasi
                  </label>
                  {citizenMahallaId && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Tanlandi
                    </Badge>
                  )}
                </div>
                <select
                  value={citizenMahallaId || ''}
                  disabled={!citizenDistrictId}
                  onChange={(e) => {
                    const mId = e.target.value;
                    setCitizenMahallaId(mId || null);
                  }}
                  className={`h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold uppercase shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                    !citizenDistrictId
                      ? 'bg-muted/50 cursor-not-allowed opacity-60 text-muted-foreground'
                      : ''
                  }`}
                >
                  <option value="">
                    {citizenDistrictId ? '-- MAHALLANI TANLANG --' : 'AVVAL TUMANNI TANLANG...'}
                  </option>
                  {allCitizenMahallas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
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
                          {c.last_name} {c.first_name} {c.middle_name}
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
              <select
                value={selectedDistrictId || ''}
                onChange={(e) => {
                  const dId = e.target.value;
                  setSelectedDistrictId(dId || null);
                  const found = allDistricts.find((d) => d.id === dId);
                  setDistrictForm({ name: found?.name || '' });
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold uppercase shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">-- TUMANNI TANLANG --</option>
                {allDistricts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
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
          onUpdateTransferEntry={handleUpdateTransferEntry}
          onAddTransferEntry={handleAddTransferEntry}
          onRemoveTransferEntry={handleRemoveTransferEntry}
          onFillApplicantName={handleFillApplicantName}
        />

        <EvidenceAndCitizensSection
          applicationId={id}
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
    </div>
  );
}
