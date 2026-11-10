import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeftRight,
  BookmarkCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Edit2,
  ExternalLink,
  File as FileIcon,
  FileText,
  FileUp,
  Layers,
  Loader2,
  MapPin,
  Paperclip,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

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
  applicationStatusesApi,
  banksApi,
  cardsApi,
  citizensApi,
  crimeMethodsApi,
  crimesApi,
  districtsApi,
  documentsApi,
  filesApi,
  getFileDownloadUrl,
  getFileViewUrl,
  mahallasApi,
  paymentProvidersApi,
  type UploadedFile,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import {
  formatAmountInput,
  formatAmountWords,
  formatCardNumberDisplay,
  formatTitleCase,
  formatUzbekName,
} from '@/lib/formatters';
import type {
  ApplicationStatus,
  Citizen,
  CrimeGravity,
  CrimeMethod,
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
    mahalla_id?: string | null;
    mahalla_name?: string;
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

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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

function CustomCitizenMahallaSelect({
  districtId,
  mahallaId,
  onSelect,
}: {
  districtId: string | null;
  mahallaId: string | null;
  onSelect: (id: string | null, name: string) => void;
}) {
  const { data: mahallasData } = useQuery({
    queryKey: ['custom-citizen-mahallas-select', districtId],
    queryFn: () => mahallasApi.getAll({ district_id: districtId!, limit: 200 }),
    enabled: Boolean(districtId),
  });

  const items = mahallasData?.items || [];

  return (
    <select
      value={mahallaId || ''}
      disabled={!districtId}
      onChange={(e) => {
        const val = e.target.value;
        const found = items.find((m) => m.id === val);
        onSelect(val || null, found?.name || '');
      }}
      className={`h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
        !districtId ? 'bg-muted/50 cursor-not-allowed opacity-60 text-muted-foreground' : ''
      }`}
    >
      <option value="">
        {districtId ? '-- MAHALLANI TANLANG --' : 'AVVAL TUMANNI TANLANG...'}
      </option>
      {items.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

export function ApplicationCreatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [canLeave, setCanLeave] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ==========================================================================
  // 1. ASOSIY ARIZA QAYD REKVIZITLARI
  // ==========================================================================
  const [applicationNumber, setApplicationNumber] = useState('');
  const [description, setDescription] = useState('');
  const [officerNotes, setOfficerNotes] = useState('');
  const [suspectTree, setSuspectTree] = useState<any[]>([]);
  const [status, setStatus] = useState<ApplicationStatus>('YANGI');
  const [statusId, setStatusId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));

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
  const { data: initialApp, isLoading } = useQuery({
    queryKey: ['application-draft', id],
    queryFn: () => applicationsApi.getOne(id as string),
    enabled: !!id,
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
    queryKey: ['crime-methods-active'],
    queryFn: () => crimeMethodsApi.getAllActive(),
  });
  const allCrimeMethods = crimeMethodsData || [];

  const groupedCrimeMethods = useMemo(() => {
    const groups: Record<string, CrimeMethod[]> = {};
    for (const method of allCrimeMethods) {
      const g = method.group_name || 'Бошқа';
      if (!groups[g]) groups[g] = [];
      groups[g].push(method);
    }
    return groups;
  }, [allCrimeMethods]);

  const { data: cardsData } = useQuery({
    queryKey: ['cards-autocomplete'],
    queryFn: () => cardsApi.getAll({ limit: 100 }),
  });
  const allCards = cardsData?.items || [];

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

  // ==========================================================================
  // POPULATE INITIAL DATA
  // ==========================================================================
  useEffect(() => {
    if (initialApp) {
      setApplicationNumber(initialApp.application_number || '');
      setDescription(initialApp.description || '');
      setOfficerNotes(initialApp.officer_notes || '');
      if (initialApp.suspect_tree && Array.isArray(initialApp.suspect_tree)) {
        setSuspectTree(initialApp.suspect_tree);
      }
      setStatus(initialApp.status || initialApp.application_status?.code || 'YANGI');
      setStatusId(initialApp.status_id || initialApp.application_status?.id || null);
      if (initialApp.date) {
        setDate(new Date(initialApp.date).toISOString().substring(0, 10));
      }

      if (initialApp.citizen) {
        setSelectedCitizenId(initialApp.citizen.id);
        setCitizenDistrictId(
          initialApp.citizen.district_id || initialApp.citizen.district?.id || null,
        );
        setCitizenMahallaId(
          initialApp.citizen.mahalla_id || initialApp.citizen.mahalla?.id || null,
        );
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
    }
  }, [initialApp]);

  // Tab yopilishidan himoya
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!canLeave) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [canLeave]);

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
  // AUTOCOMPLETE FILTERLASH
  // ==========================================================================
  const currentActiveTransfer =
    activeTransferPopover !== null ? financialTransfers[activeTransferPopover.index] : null;

  const activeVictimCardNumber = currentActiveTransfer?.victimCardNumber || '';
  const activeReceiverCardNumber = currentActiveTransfer?.receiverCardNumber || '';

  const filteredVictimCards = useMemo(() => {
    const q = activeVictimCardNumber.replace(/\D/g, '');
    if (!q) return [];
    return allCards.filter((c) => (c.card_number || '').replace(/\D/g, '').includes(q));
  }, [allCards, activeVictimCardNumber]);

  const filteredReceiverCards = useMemo(() => {
    const q = activeReceiverCardNumber.replace(/\D/g, '');
    if (!q) return [];
    return allCards.filter((c) => (c.card_number || '').replace(/\D/g, '').includes(q));
  }, [allCards, activeReceiverCardNumber]);

  // ==========================================================================
  // SELECTION HANDLERS
  // ==========================================================================
  const handleSelectCitizen = (c: Citizen) => {
    setSelectedCitizenId(c.id);
    setCitizenDistrictId(c.district_id || c.district?.id || null);
    setCitizenMahallaId(c.mahalla_id || c.mahalla?.id || null);
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
      if (!id) return;

      const payload: Record<string, unknown> = {
        application_number: applicationNumber.trim() ? applicationNumber.trim() : null,
        description: description || undefined,
        officer_notes: officerNotes || undefined,
        suspect_tree: suspectTree,
        status,
        status_id: statusId || undefined,
        date: date ? new Date(date).toISOString() : undefined,
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
        citizenForm.address
      ) {
        payload.citizen_data = citizenDataObj;
      }

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

      // 4. Moliyaviy Zarar / Karta va O'tkazmalar
      const allCustomFields = [...customFields];

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

      return applicationsApi.update(id, payload);
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
      <div className="bg-card border border-border shadow-xl rounded-2xl overflow-hidden divide-y divide-border/60">
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
        <div className="p-5 sm:p-6 space-y-4 bg-sky-50 dark:bg-sky-950/20 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-200/70 dark:border-sky-800/40 pb-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  <User className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground whitespace-nowrap">
                  1. Arizachi Shaxsiy Ma‘lumotlar
                </h2>
              </div>

              {/* Ariza / Murojaat Raqami (kengaytirilgan va qulay) */}
              <div className="flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-1.5 shadow-sm min-w-[260px] sm:w-80">
                <span className="text-xs font-bold text-primary font-mono">№</span>
                <Input
                  value={applicationNumber}
                  onChange={(e) => setApplicationNumber(e.target.value.toUpperCase())}
                  placeholder="ARIZA RAQAMI (IXTIYORIY)..."
                  className="h-7 w-full border-0 p-0 text-xs font-mono font-bold focus-visible:ring-0 bg-transparent uppercase text-foreground placeholder:text-muted-foreground/60"
                />
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
                placeholder="TOSHKENT SH., 9-MAVZE, 12-UY, 45-XONADON..."
                value={citizenForm.address}
                onChange={(e) =>
                  setCitizenForm({ ...citizenForm, address: e.target.value.toUpperCase() })
                }
                className="h-10 text-xs uppercase"
              />
            </div>

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
        {/* 2-QISM: YO‘NALTIRILGAN HUDUD VA JINOYAT TURI */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-4 bg-indigo-50 dark:bg-indigo-950/20 transition-colors">
          <div className="flex items-center gap-2.5 border-b border-indigo-200/70 dark:border-indigo-800/40 pb-3">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
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
            <SuspectTreeBuilder value={suspectTree} onChange={setSuspectTree} />
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3-QISM: BANK KARTASI VA NOQONUNIY O'TKAZMA (MOLIYAVIY ZARAR) */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-5 bg-emerald-50 dark:bg-emerald-950/20 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/70 dark:border-emerald-800/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  3. Bank Plastik Kartasi & Noqonuniy Pul O‘tkazmasi
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Mazkur holatda bank kartalari orqali moliyaviy zarar yetkazilgan bo‘lsa yoqing
                </p>
              </div>
            </div>

            {/* INTERAKTIV TOGGLE SWITCH */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto bg-card border border-border px-3 py-1.5 rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-foreground select-none">
                Pul o‘tkazmasi bormi?
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={hasFinancialLoss}
                onClick={() => setHasFinancialLoss(!hasFinancialLoss)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  hasFinancialLoss ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    hasFinancialLoss ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {!hasFinancialLoss ? (
            <div className="p-4 rounded-xl border border-dashed border-border/80 bg-background/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>
                  Ushbu ariza bo‘yicha bank kartasi yoki pul o‘tkazmasi kiritilmagan. Agar karta
                  orqali mablag‘ yechilgan bo‘lsa, yuqoridagi tugmani yoqing.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHasFinancialLoss(true)}
                className="h-8 text-xs shrink-0 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Karta va o‘tkazmani kiritish
              </Button>
            </div>
          ) : (
            <div
              ref={transferContainerRef}
              className="space-y-6 animate-in fade-in-50 duration-200"
            >
              {financialTransfers.map((entry, index) => (
                <div
                  key={entry.clientId}
                  className="p-4 sm:p-5 rounded-2xl border border-border bg-card/70 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {index === 0
                          ? '1-O‘tkazma shakli (Asosiy)'
                          : `${index + 1}-O‘tkazma shakli`}
                      </span>
                    </div>
                    {financialTransfers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTransferEntry(index)}
                        className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1 px-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        O‘chirish
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* 1. JABRLANUVCHI KARTASI */}
                    <div className="p-4 rounded-xl border border-border bg-muted/10 shadow-sm space-y-3 relative">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <CreditCard className="h-4 w-4 text-primary" />
                          Jabrlanuvchi Bank Kartasi
                        </span>
                        {entry.victimCardId ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            Bazadagi karta
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateTransferEntry(index, { victimCardId: null })
                              }
                              className="ml-1 hover:text-foreground"
                              title="Bog‘lanishni bekor qilish"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : entry.victimCardNumber ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Yangi karta
                          </Badge>
                        ) : null}
                      </div>

                      <div className="relative space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Karta raqami (16 talik) *
                        </label>
                        <Input
                          placeholder="8600 0000 0000 0000"
                          value={formatCardNumberDisplay(entry.victimCardNumber)}
                          onFocus={() => setActiveTransferPopover({ index, type: 'victimCard' })}
                          onChange={(e) => {
                            const val = formatCardNumberDisplay(e.target.value);
                            handleUpdateTransferEntry(index, {
                              victimCardNumber: val,
                              victimCardId: null,
                            });
                            setActiveTransferPopover({ index, type: 'victimCard' });
                          }}
                          className="h-9 text-xs font-mono font-bold tracking-wider"
                          maxLength={19}
                        />
                        {activeTransferPopover?.index === index &&
                          activeTransferPopover.type === 'victimCard' &&
                          filteredVictimCards.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border shadow-xl rounded-xl p-2 max-h-40 overflow-y-auto">
                              <div className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 border-b border-border/50 mb-1">
                                Bazada mavjud kartalar:
                              </div>
                              {filteredVictimCards.map((c) => (
                                <div
                                  key={c.id}
                                  onClick={() => {
                                    handleUpdateTransferEntry(index, {
                                      victimCardId: c.id,
                                      victimCardNumber: formatCardNumberDisplay(
                                        c.card_number || '',
                                      ),
                                      victimCardFullName: c.full_name || '',
                                      victimBankName: c.bank?.name || '',
                                    });
                                    setActiveTransferPopover(null);
                                  }}
                                  className="p-1.5 rounded hover:bg-muted cursor-pointer flex justify-between font-mono text-xs"
                                >
                                  <span className="font-bold text-foreground">
                                    {formatCardNumberDisplay(c.card_number)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {c.bank?.name || 'Bank'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            Karta egasining F.I.SH.
                          </label>
                          <button
                            type="button"
                            onClick={() => handleFillApplicantName(index)}
                            className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded transition-colors"
                          >
                            <UserCheck className="h-3 w-3" />
                            Arizachining o‘zi
                          </button>
                        </div>
                        <Input
                          placeholder="ESHMURODOV TOSHPULAT..."
                          value={entry.victimCardFullName}
                          onChange={(e) =>
                            handleUpdateTransferEntry(index, {
                              victimCardFullName: e.target.value.toUpperCase(),
                            })
                          }
                          className="h-9 text-xs uppercase"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Xizmat ko‘rsatuvchi bank
                        </label>
                        <select
                          value={entry.victimBankName || ''}
                          onChange={(e) =>
                            handleUpdateTransferEntry(index, {
                              victimBankName: e.target.value,
                            })
                          }
                          className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="">-- BANKNI TANLANG --</option>
                          {allBanks.map((b) => (
                            <option key={b.id} value={b.name || ''}>
                              {b.name?.toUpperCase()}
                            </option>
                          ))}
                          {entry.victimBankName &&
                            !allBanks.some(
                              (b) =>
                                b.name?.trim().toUpperCase() ===
                                entry.victimBankName?.trim().toUpperCase(),
                            ) && (
                              <option value={entry.victimBankName}>
                                {entry.victimBankName.toUpperCase()}
                              </option>
                            )}
                        </select>
                      </div>
                    </div>

                    {/* 2. O'TKAZMA MA'LUMOTI */}
                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <ArrowLeftRight className="h-4 w-4 text-primary" />
                          O‘tkazma Ma‘lumoti
                        </span>
                        {entry.transferDate && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-primary/40 text-primary"
                          >
                            {entry.transferDate}{' '}
                            {entry.transferTime ? `(${entry.transferTime})` : ''}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            O‘tkazma Summasi *
                          </label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="1 000 000"
                            value={formatAmountInput(entry.amount)}
                            onChange={(e) =>
                              handleUpdateTransferEntry(index, {
                                amount: formatAmountInput(e.target.value),
                              })
                            }
                            className="h-9 text-xs font-mono font-bold text-emerald-400 bg-background"
                          />
                          {entry.amount && (
                            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-0.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>{formatAmountWords(entry.amount, entry.currency)}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            Valyuta
                          </label>
                          <select
                            value={entry.currency}
                            onChange={(e) =>
                              handleUpdateTransferEntry(index, { currency: e.target.value })
                            }
                            className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs font-mono font-bold"
                          >
                            <option value="UZS">UZS</option>
                            <option value="USD">USD</option>
                            <option value="RUB">RUB</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          To‘lov Provayderi / Ilova Nomi
                        </label>
                        <select
                          value={entry.providerName || ''}
                          onChange={(e) => {
                            const pName = e.target.value;
                            const found = allProviders.find(
                              (p) => p.name?.toUpperCase() === pName.toUpperCase(),
                            );
                            handleUpdateTransferEntry(index, {
                              providerName: pName,
                              providerId: found?.id || null,
                            });
                          }}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="">-- PROVAYDERNI TANLANG --</option>
                          {allProviders.map((p) => (
                            <option key={p.id} value={p.name || ''}>
                              {p.name?.toUpperCase()}
                            </option>
                          ))}
                          {entry.providerName &&
                            !allProviders.some(
                              (p) =>
                                p.name?.trim().toUpperCase() ===
                                entry.providerName?.trim().toUpperCase(),
                            ) && (
                              <option value={entry.providerName}>
                                {entry.providerName.toUpperCase()}
                              </option>
                            )}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-primary" /> O‘tkazma Sanasi
                          </label>
                          <Input
                            type="date"
                            value={entry.transferDate}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              handleUpdateTransferEntry(index, {
                                transferDate: newDate,
                                transferTime: newDate ? entry.transferTime : '',
                              });
                            }}
                            className="h-9 text-xs bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3 text-primary" /> O‘tkazma Vaqti
                          </label>
                          <Input
                            type="time"
                            value={entry.transferTime}
                            disabled={!entry.transferDate}
                            onChange={(e) =>
                              handleUpdateTransferEntry(index, { transferTime: e.target.value })
                            }
                            className={`h-9 text-xs bg-background ${!entry.transferDate ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
                            title={
                              !entry.transferDate ? 'Avval o‘tkazma sanasini tanlang' : undefined
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. FIRIBGAR (QABUL QILUVCHI) KARTASI */}
                    <div className="p-4 rounded-xl border border-red-500/30 bg-muted/10 shadow-sm space-y-3 relative">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 text-red-400" />
                          Qabul Qiluvchi (Firibgar) Kartasi
                        </span>
                        {entry.receiverCardId ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            Bazadagi karta
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateTransferEntry(index, { receiverCardId: null })
                              }
                              className="ml-1 hover:text-foreground"
                              title="Bog‘lanishni bekor qilish"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : entry.receiverCardNumber ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Yangi karta
                          </Badge>
                        ) : null}
                      </div>

                      <div className="relative space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Karta raqami (16 talik) *
                        </label>
                        <Input
                          placeholder="9860 0000 0000 0000"
                          value={formatCardNumberDisplay(entry.receiverCardNumber)}
                          onFocus={() => setActiveTransferPopover({ index, type: 'receiverCard' })}
                          onChange={(e) => {
                            const val = formatCardNumberDisplay(e.target.value);
                            handleUpdateTransferEntry(index, {
                              receiverCardNumber: val,
                              receiverCardId: null,
                            });
                            setActiveTransferPopover({ index, type: 'receiverCard' });
                          }}
                          className="h-9 text-xs font-mono font-bold tracking-wider"
                          maxLength={19}
                        />
                        {activeTransferPopover?.index === index &&
                          activeTransferPopover.type === 'receiverCard' &&
                          filteredReceiverCards.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border shadow-xl rounded-xl p-2 max-h-40 overflow-y-auto">
                              <div className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 border-b border-border/50 mb-1">
                                Bazada mavjud kartalar:
                              </div>
                              {filteredReceiverCards.map((c) => (
                                <div
                                  key={c.id}
                                  onClick={() => {
                                    handleUpdateTransferEntry(index, {
                                      receiverCardId: c.id,
                                      receiverCardNumber: formatCardNumberDisplay(
                                        c.card_number || '',
                                      ),
                                      receiverCardFullName: c.full_name || '',
                                      receiverBankName: c.bank?.name || '',
                                    });
                                    setActiveTransferPopover(null);
                                  }}
                                  className="p-1.5 rounded hover:bg-muted cursor-pointer flex justify-between font-mono text-xs"
                                >
                                  <span className="font-bold text-foreground">
                                    {formatCardNumberDisplay(c.card_number)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {c.bank?.name || 'Bank'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Karta egasining F.I.SH.
                        </label>
                        <Input
                          placeholder="FIRIBGAR / NOMA‘LUM SHAXS F.I.SH."
                          value={entry.receiverCardFullName}
                          onChange={(e) =>
                            handleUpdateTransferEntry(index, {
                              receiverCardFullName: e.target.value.toUpperCase(),
                            })
                          }
                          className="h-9 text-xs uppercase"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Firibgar kartasi banki
                        </label>
                        <select
                          value={entry.receiverBankName || ''}
                          onChange={(e) =>
                            handleUpdateTransferEntry(index, {
                              receiverBankName: e.target.value,
                            })
                          }
                          className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="">-- BANKNI TANLANG --</option>
                          {allBanks.map((b) => (
                            <option key={b.id} value={b.name || ''}>
                              {b.name?.toUpperCase()}
                            </option>
                          ))}
                          {entry.receiverBankName &&
                            !allBanks.some(
                              (b) =>
                                b.name?.trim().toUpperCase() ===
                                entry.receiverBankName?.trim().toUpperCase(),
                            ) && (
                              <option value={entry.receiverBankName}>
                                {entry.receiverBankName.toUpperCase()}
                              </option>
                            )}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* + TUGMASI: YANGI KARTA VA O'TKAZMA SHAKLI QO'SHISH */}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTransferEntry}
                className="w-full border-dashed py-5 text-xs font-semibold gap-2 border-primary/40 hover:border-primary text-primary hover:bg-primary/5 transition-all shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Yangi karta & o‘tkazma shaklini qo‘shish
              </Button>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 4-QISM: HUJJATLAR, ISBOTLAR VA QO'SHIMCHA SUBYEKTLAR */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-6 bg-amber-50 dark:bg-amber-950/20 transition-colors">
          <div className="flex items-center gap-2.5 border-b border-amber-200/70 dark:border-amber-800/40 pb-3">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Paperclip className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                4. Isbotlar, Kvitansiyalar va Qo‘shimcha Subyektlar
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Tergov dalillari (chek skrinshotlari, PDF ko‘chirmalar) va ishga aloqador boshqa
                shaxslar
              </p>
            </div>
          </div>

          {/* A. YAGONA MINIO FAYL VA ISBOTLAR YUKLASH ZONASI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <UploadCloud className="h-4 w-4 text-primary" />
                Ishga oid fayl va skrinshotlar ({evidenceFiles.length} ta ilova)
              </span>
              <input
                ref={evidenceInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUploadEvidenceFiles(e.target.files)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => evidenceInputRef.current?.click()}
                disabled={isUploadingEvidence}
                className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                {isUploadingEvidence ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Yuklanmoqda...</span>
                  </>
                ) : (
                  <>
                    <FileUp className="h-3.5 w-3.5" />
                    <span>+ Fayl tanlash</span>
                  </>
                )}
              </Button>
            </div>

            {/* DRAG & DROP ZONE */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingEvidence(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingEvidence(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingEvidence(false);
                handleUploadEvidenceFiles(e.dataTransfer.files);
              }}
              onClick={() => evidenceInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center ${
                isDraggingEvidence
                  ? 'border-primary bg-primary/10'
                  : 'border-border/80 hover:border-primary/50 bg-muted/10'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {isUploadingEvidence ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <UploadCloud className="h-5 w-5" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">
                  Fayllarni shu yerga tashlang yoki bosing
                </p>
                <p className="text-[11px] text-muted-foreground">
                  PNG, JPG, PDF, DOCX, MP3, MP4 formatdagi kvitansiya, audio yoki skrinshotlar
                </p>
              </div>
            </div>

            {/* YUKLANGAN FAYLLAR GRIDI */}
            {evidenceFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {evidenceFiles.map((f, idx) => {
                  const previewUrl = getFileViewUrl(f);
                  const downloadUrl = getFileDownloadUrl(f);
                  const isImg =
                    f.mimetype?.startsWith('image/') ||
                    f.url?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                    f.original_name?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                    f.key?.match(/\.(jpg|jpeg|png|webp|gif)$/i);

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {isImg ? (
                          <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-border/80 bg-muted/30 flex items-center justify-center">
                            <img
                              src={previewUrl}
                              alt={f.original_name || 'Isbot'}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-primary">
                            <FileIcon className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {f.original_name || 'Fayl'}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {formatFileSize(f.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={downloadUrl || previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                          title="Ochish / Yuklab olish"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveEvidenceFile(idx)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
                          title="O‘chirish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* B. RASMIY WORD HUJJATLARI (.DOCX / ONLYOFFICE) */}
          <div className="pt-4 border-t border-border/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 font-serif font-black text-xs">
                  W
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground">
                    Rasmiy Word Hujjatlari ({appDocuments.length} ta hujjat)
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Tergov hujjati yoki blank. Kompyuterdan Word yuklash yoki yangi Word yaratib
                    tizimda ONLYOFFICE orqali tahrirlash
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <input
                  ref={wordFileInputRef}
                  type="file"
                  accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setWordDialogState({
                        isOpen: true,
                        mode: 'upload',
                        file,
                      });
                      e.target.value = '';
                    }
                  }}
                />

                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setTemplateModalState({
                      isOpen: true,
                      initialTemplateId: 'tushuntirish-telegram',
                    })
                  }
                  className="h-8 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                  title="Rasmiy tergov shablonlari (Tushuntirish xati, Bayonnoma, Sanksiya) asosida avtomatik to‘ldirib yaratish"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Shablondan yaratish</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => wordFileInputRef.current?.click()}
                  disabled={uploadWordMutation.isPending}
                  className="h-8 text-xs gap-1.5 border-border font-medium cursor-pointer"
                  title="Kompyuterdan mavjud Word (.docx / .doc) faylini yuklash"
                >
                  {uploadWordMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="h-3.5 w-3.5 text-blue-600" />
                  )}
                  <span>Kompyuterdan yuklash</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setTemplateModalState({
                      isOpen: true,
                      initialTemplateId: 'blank',
                    })
                  }
                  className="h-8 text-xs gap-1.5 font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                  title="Yangi bo‘sh Word blank yaratish va ONLYOFFICE da tahrirlash"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Yangi Word</span>
                </Button>
              </div>
            </div>

            {/* YUKLANGAN WORD HUJJATLARI GRIDI */}
            {appDocuments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {appDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl border border-border/80 bg-card hover:border-blue-400 transition shadow-2xs flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#185abd] text-white font-serif font-black text-xs shadow-2xs">
                        W
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-xs font-semibold text-foreground truncate"
                          title={doc.title || doc.file_name}
                        >
                          {doc.title || doc.file_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {(doc.size / 1024).toFixed(1)} KB &bull; v{doc.version || 1}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setActiveEditingDocId(doc.id)}
                        className="h-7 px-2 text-[11px] font-semibold bg-[#185abd] hover:bg-[#12448f] text-white gap-1 cursor-pointer"
                        title="ONLYOFFICE muharririda ochish va tahrirlash"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Tahrirlash</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          window.open(documentsApi.getFileUrl(doc.id), '_blank');
                        }}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Yuklab olish"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDocToDelete({ id: doc.id, title: doc.title || doc.file_name })
                        }
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                        title="O‘chirish"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/10 text-center space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Hozircha biriktirilgan Word hujjati yo‘q
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Yuqoridagi tugmalar orqali kompyuterdan Word faylni yuklashingiz yoki yangi bo‘sh
                  Word yaratib OnlyOffice'da to‘ldirishingiz mumkin.
                </p>
              </div>
            )}
          </div>

          {/* C. QO'SHIMCHA FUQAROLAR */}
          <div className="pt-4 border-t border-border/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-foreground">
                  Ishga aloqador qo‘shimcha fuqarolar (
                  {customFields.filter((cf) => cf.type === 'CITIZEN').length})
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Gumonlanuvchilar, guvohlar, sheriklar yoki boshqa aloqador shaxslarni kiritish
                </p>
              </div>
            </div>

            {/* QO'SHILGAN FUQAROLAR KARTOCHKALARI */}
            {customFields.filter((cf) => cf.type === 'CITIZEN').length > 0 && (
              <div className="space-y-4 pt-1">
                {customFields
                  .filter((cf) => cf.type === 'CITIZEN')
                  .map((cf) => {
                    const citDistId = cf.inline_citizen?.district_id || null;
                    const citMahId = cf.inline_citizen?.mahalla_id || null;

                    return (
                      <div
                        key={cf.clientId}
                        className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3.5"
                      >
                        {/* Karta sarlavhasi: Icon + Fuqaro Roli Inputi + O'chirish tugmasi */}
                        <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2.5">
                          <div className="flex items-center gap-2.5 flex-1">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                              <UserPlus className="h-4 w-4" />
                            </div>
                            <Input
                              placeholder="Fuqaro maqomi / Roli (Masalan: Gumonlanuvchi, Guvoh, Sherik...)"
                              value={cf.label}
                              onChange={(e) =>
                                handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                  ...f,
                                  label: e.target.value.toUpperCase(),
                                }))
                              }
                              className="h-9 text-xs font-bold w-full max-w-md uppercase text-primary placeholder:text-muted-foreground/60 placeholder:normal-case placeholder:font-normal"
                            />
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCustomFieldItem(cf.clientId)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 shrink-0"
                            title="Fuqaroni ro‘yxatdan o‘chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* FUQARO ANKETASI */}
                        <div className="space-y-3">
                          {/* 1-Qator: Ism, Familiya, Sharif */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-muted-foreground">
                                Ism *
                              </label>
                              <Input
                                placeholder="ISM"
                                value={cf.inline_citizen?.first_name || ''}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                    ...f,
                                    inline_citizen: {
                                      ...(f.inline_citizen || {
                                        first_name: '',
                                        last_name: '',
                                        middle_name: '',
                                        passport: '',
                                        phone_number: '',
                                      }),
                                      first_name: val,
                                    },
                                  }));
                                }}
                                className="h-9 text-xs uppercase font-medium"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-muted-foreground">
                                Familiya
                              </label>
                              <Input
                                placeholder="FAMILIYA"
                                value={cf.inline_citizen?.last_name || ''}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                    ...f,
                                    inline_citizen: {
                                      ...(f.inline_citizen || {
                                        first_name: '',
                                        last_name: '',
                                        middle_name: '',
                                        passport: '',
                                        phone_number: '',
                                      }),
                                      last_name: val,
                                    },
                                  }));
                                }}
                                className="h-9 text-xs uppercase font-medium"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-muted-foreground">
                                Sharif (Otasining ismi)
                              </label>
                              <Input
                                placeholder="SHARIF"
                                value={cf.inline_citizen?.middle_name || ''}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                    ...f,
                                    inline_citizen: {
                                      ...(f.inline_citizen || {
                                        first_name: '',
                                        last_name: '',
                                        middle_name: '',
                                        passport: '',
                                        phone_number: '',
                                      }),
                                      middle_name: val,
                                    },
                                  }));
                                }}
                                className="h-9 text-xs uppercase font-medium"
                              />
                            </div>
                          </div>

                          {/* 2-Qator: Tug'ilgan sana, Jinsi */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-muted-foreground">
                                Tug‘ilgan Sana
                              </label>
                              <Input
                                type="date"
                                value={cf.inline_citizen?.birth_date || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                    ...f,
                                    inline_citizen: {
                                      ...(f.inline_citizen || {
                                        first_name: '',
                                        last_name: '',
                                        middle_name: '',
                                        passport: '',
                                        phone_number: '',
                                      }),
                                      birth_date: val,
                                    },
                                  }));
                                }}
                                className="h-9 text-xs cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-muted-foreground">
                                Jinsi
                              </label>
                              <div className="grid grid-cols-2 gap-2 h-9">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                      ...f,
                                      inline_citizen: {
                                        ...(f.inline_citizen || {
                                          first_name: '',
                                          last_name: '',
                                          middle_name: '',
                                          passport: '',
                                          phone_number: '',
                                        }),
                                        gender: f.inline_citizen?.gender === 'male' ? '' : 'male',
                                      },
                                    }));
                                  }}
                                  className={`h-full flex items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
                                    cf.inline_citizen?.gender === 'male'
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-background hover:bg-muted text-foreground border-input'
                                  }`}
                                >
                                  <MaleIcon className="h-3.5 w-3.5" /> Erkak
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                      ...f,
                                      inline_citizen: {
                                        ...(f.inline_citizen || {
                                          first_name: '',
                                          last_name: '',
                                          middle_name: '',
                                          passport: '',
                                          phone_number: '',
                                        }),
                                        gender:
                                          f.inline_citizen?.gender === 'female' ? '' : 'female',
                                      },
                                    }));
                                  }}
                                  className={`h-full flex items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
                                    cf.inline_citizen?.gender === 'female'
                                      ? 'bg-pink-600 text-white border-pink-600'
                                      : 'bg-background hover:bg-muted text-foreground border-input'
                                  }`}
                                >
                                  <FemaleIcon className="h-3.5 w-3.5" /> Ayol
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 3-Qator: Telefon, Pasport, JSHSHIR */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-muted-foreground">
                                Telefon raqami
                              </label>
                              <PhoneInput
                                value={cf.inline_citizen?.phone_number}
                                onChange={(val) => {
                                  handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                    ...f,
                                    inline_citizen: {
                                      ...(f.inline_citizen || {
                                        first_name: '',
                                        last_name: '',
                                        middle_name: '',
                                        passport: '',
                                        phone_number: '',
                                      }),
                                      phone_number: val,
                                    },
                                  }));
                                }}
                                className="h-9"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-muted-foreground">
                                Pasport seriya & raqam
                              </label>
                              <Input
                                placeholder="AA1234567"
                                value={cf.inline_citizen?.passport || ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                    .toUpperCase()
                                    .replace(/[^A-Z0-9]/g, '')
                                    .slice(0, 9);
                                  handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                    ...f,
                                    inline_citizen: {
                                      ...(f.inline_citizen || {
                                        first_name: '',
                                        last_name: '',
                                        middle_name: '',
                                        passport: '',
                                        phone_number: '',
                                      }),
                                      passport: val,
                                    },
                                  }));
                                }}
                                className="h-9 text-xs font-mono font-bold uppercase"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-muted-foreground">
                                JSHSHIR (PINFL - 14 ta raqam)
                              </label>
                              <Input
                                placeholder="14 TALIK RAQAM"
                                value={cf.inline_citizen?.pinfl || ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 14);
                                  handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                    ...f,
                                    inline_citizen: {
                                      ...(f.inline_citizen || {
                                        first_name: '',
                                        last_name: '',
                                        middle_name: '',
                                        passport: '',
                                        phone_number: '',
                                      }),
                                      pinfl: val,
                                    },
                                  }));
                                }}
                                className="h-9 text-xs font-mono"
                              />
                            </div>
                          </div>

                          {/* 3-Qator: Yashash Tumani va Yashash Mahallasi */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Yashash Tumani */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-primary" />
                                  Yashash Tumani
                                </label>
                                {citDistId && (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px] py-0 px-1.5">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Tanlandi
                                  </Badge>
                                )}
                              </div>
                              <select
                                value={citDistId || ''}
                                onChange={(e) => {
                                  const dId = e.target.value;
                                  const found = allDistricts.find((d) => d.id === dId);
                                  handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                    ...f,
                                    inline_citizen: {
                                      ...(f.inline_citizen || {
                                        first_name: '',
                                        last_name: '',
                                        passport: '',
                                        phone_number: '',
                                      }),
                                      district_id: dId || null,
                                      district_name: found?.name || '',
                                      mahalla_id: null,
                                      mahalla_name: '',
                                    },
                                  }));
                                }}
                                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3 text-primary" />
                                  Yashash Mahallasi
                                </label>
                                {citMahId && (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px] py-0 px-1.5">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Tanlandi
                                  </Badge>
                                )}
                              </div>
                              <CustomCitizenMahallaSelect
                                districtId={citDistId}
                                mahallaId={citMahId}
                                onSelect={(mId, mName) => {
                                  handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                    ...f,
                                    inline_citizen: {
                                      ...(f.inline_citizen || {
                                        first_name: '',
                                        last_name: '',
                                        passport: '',
                                        phone_number: '',
                                      }),
                                      mahalla_id: mId,
                                      mahalla_name: mName,
                                    },
                                  }));
                                }}
                              />
                            </div>
                          </div>

                          {/* 4-Qator: Aniq yashash manzili */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              Aniq yashash manzili (Ko‘cha, uy, xonadon...)
                            </label>
                            <Input
                              placeholder="VILOYAT, TUMAN, KO‘CHA, UY..."
                              value={cf.inline_citizen?.address || ''}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                                  ...f,
                                  inline_citizen: {
                                    ...(f.inline_citizen || {
                                      first_name: '',
                                      last_name: '',
                                      middle_name: '',
                                      passport: '',
                                      phone_number: '',
                                    }),
                                    address: val,
                                  },
                                }));
                              }}
                              className="h-9 text-xs uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* PASTDAGI UZUN TUGMA (HUDDI KARTA KABI) */}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddCustomFieldItem('CITIZEN', '')}
              className="w-full h-11 border-dashed border-2 border-primary/40 hover:border-primary hover:bg-primary/5 text-primary text-xs font-semibold gap-2 shadow-sm rounded-xl transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>Fuqaro qo‘shish</span>
            </Button>
          </div>
        </div>
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
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={deleteMutation.isPending || saveMutation.isPending}
              className="h-10 text-xs font-semibold px-4 gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
            >
              <Trash2 className="h-4 w-4" />
              Bekor qilish / O‘chirish
            </Button>

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
