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
  ExternalLink,
  File as FileIcon,
  FileText,
  FileUp,
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
import { useNavigate, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useDebounce } from '@/hooks/use-debounce';
import {
  applicationsApi,
  banksApi,
  cardsApi,
  citizensApi,
  crimesApi,
  districtsApi,
  filesApi,
  mahallasApi,
  paymentProvidersApi,
  type UploadedFile,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type {
  ApplicationStatus,
  Citizen,
  Crime,
  CrimeGravity,
  CustomFieldType,
  District,
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
    address?: string;
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
    part?: string;
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

export function ApplicationCreatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [canLeave, setCanLeave] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ==========================================================================
  // 1. ASOSIY ARIZA QAYD REKVIZITLARI
  // ==========================================================================
  const [applicationNumber, setApplicationNumber] = useState('');
  const [description, setDescription] = useState('');
  const [officerNotes, setOfficerNotes] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('YANGI');
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
  });
  const [showCitizenPopover, setShowCitizenPopover] = useState(false);
  const citizenPopoverRef = useRef<HTMLDivElement>(null);

  // Fuqaroning yashash tumani va mahallasi
  const [citizenDistrictId, setCitizenDistrictId] = useState<string | null>(null);
  const [citizenDistrictName, setCitizenDistrictName] = useState('');
  const [showCitizenDistrictPopover, setShowCitizenDistrictPopover] = useState(false);
  const citizenDistrictPopoverRef = useRef<HTMLDivElement>(null);

  const [citizenMahallaId, setCitizenMahallaId] = useState<string | null>(null);
  const [citizenMahallaName, setCitizenMahallaName] = useState('');
  const [showCitizenMahallaPopover, setShowCitizenMahallaPopover] = useState(false);
  const citizenMahallaPopoverRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // 3. HODISA HUDUDI VA JINOYAT MODDASI
  // ==========================================================================
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [districtForm, setDistrictForm] = useState({
    name: '',
  });
  const [showDistrictPopover, setShowDistrictPopover] = useState(false);
  const districtPopoverRef = useRef<HTMLDivElement>(null);

  const [selectedCrimeId, setSelectedCrimeId] = useState<string | null>(null);
  const [crimeForm, setCrimeForm] = useState<{
    article: string;
  }>({
    article: '',
  });
  const [showCrimePopover, setShowCrimePopover] = useState(false);
  const crimePopoverRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // 4. MOLIYAVIY ZARAR VA TRANZAKSIYA SHAKLLARI
  // ==========================================================================
  const [hasFinancialLoss, setHasFinancialLoss] = useState(false);

  const [financialTransfers, setFinancialTransfers] = useState<FinancialTransferEntry[]>([
    createDefaultTransferEntry(),
  ]);

  const [activeTransferPopover, setActiveTransferPopover] = useState<{
    index: number;
    type: 'victimCard' | 'victimBank' | 'provider' | 'receiverCard' | 'receiverBank';
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
  // QUERY & DATA FETCHING
  // ==========================================================================
  const { data: initialApp, isLoading } = useQuery({
    queryKey: ['application-draft', id],
    queryFn: () => applicationsApi.getOne(id as string),
    enabled: !!id,
  });

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

  const { data: citizenMahallasData, isLoading: isLoadingCitizenMahallas } = useQuery({
    queryKey: ['citizen-mahallas', citizenDistrictId],
    queryFn: () => mahallasApi.getAll({ district_id: citizenDistrictId!, limit: 200 }),
    enabled: Boolean(citizenDistrictId),
  });
  const allCitizenMahallas = citizenMahallasData?.items || [];

  const createCitizenMahallaMutation = useMutation({
    mutationFn: async ({ name, district_id }: { name: string; district_id: string }) => {
      return mahallasApi.create({ name, district_id });
    },
    onSuccess: (newM) => {
      queryClient.invalidateQueries({ queryKey: ['citizen-mahallas', citizenDistrictId] });
      setCitizenMahallaId(newM.id);
      setCitizenMahallaName(newM.name || '');
      setShowCitizenMahallaPopover(false);
      toast.success('Yangi mahalla qo‘shildi va biriktirildi');
    },
    onError: (err) => {
      toast.error('Mahallani saqlashda xatolik', { description: getErrorMessage(err) });
    },
  });

  const { data: crimesData } = useQuery({
    queryKey: ['crimes-autocomplete'],
    queryFn: () => crimesApi.getAll({ limit: 100 }),
  });
  const allCrimes = crimesData?.items || [];

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

  // ==========================================================================
  // POPULATE INITIAL DATA
  // ==========================================================================
  useEffect(() => {
    if (initialApp) {
      setApplicationNumber(initialApp.application_number || '');
      setDescription(initialApp.description || '');
      setOfficerNotes(initialApp.officer_notes || '');
      setStatus(initialApp.status || 'YANGI');
      if (initialApp.date) {
        setDate(new Date(initialApp.date).toISOString().substring(0, 10));
      }

      if (initialApp.citizen) {
        setSelectedCitizenId(initialApp.citizen.id);
        setCitizenDistrictId(
          initialApp.citizen.district_id || initialApp.citizen.district?.id || null,
        );
        setCitizenDistrictName(initialApp.citizen.district?.name || '');
        setCitizenMahallaId(
          initialApp.citizen.mahalla_id || initialApp.citizen.mahalla?.id || null,
        );
        setCitizenMahallaName(initialApp.citizen.mahalla?.name || '');
        setCitizenForm({
          first_name: initialApp.citizen.first_name || '',
          last_name: initialApp.citizen.last_name || '',
          middle_name: initialApp.citizen.middle_name || '',
          passport: initialApp.citizen.passport || '',
          phone_number: initialApp.citizen.phone_number || '',
          pinfl: initialApp.citizen.pinfl || '',
          address: initialApp.citizen.address || '',
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
                    address: cf.citizen.address || '',
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
                    part: cf.crime.part || '',
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
      if (
        citizenDistrictPopoverRef.current &&
        !citizenDistrictPopoverRef.current.contains(target)
      ) {
        setShowCitizenDistrictPopover(false);
      }
      if (citizenMahallaPopoverRef.current && !citizenMahallaPopoverRef.current.contains(target)) {
        setShowCitizenMahallaPopover(false);
      }
      if (districtPopoverRef.current && !districtPopoverRef.current.contains(target)) {
        setShowDistrictPopover(false);
      }
      if (crimePopoverRef.current && !crimePopoverRef.current.contains(target)) {
        setShowCrimePopover(false);
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
  const filteredDistricts = allDistricts.filter((d) => {
    const q = districtForm.name.trim().toLowerCase();
    if (!q) return false;
    return (d.name || '').toLowerCase().includes(q);
  });

  const filteredCitizenDistricts = allDistricts.filter((d) => {
    const q = citizenDistrictName.trim().toLowerCase();
    if (!q) return true;
    return (d.name || '').toLowerCase().includes(q);
  });

  const filteredCitizenMahallas = allCitizenMahallas.filter((m) => {
    const q = citizenMahallaName.trim().toLowerCase();
    if (!q) return true;
    return (m.name || '').toLowerCase().includes(q);
  });

  const filteredCrimes = allCrimes.filter((c) => {
    const q = crimeForm.article.trim().toLowerCase();
    if (!q) return false;
    return (c.article || '').toLowerCase().includes(q) || (c.title || '').toLowerCase().includes(q);
  });

  const currentActiveTransfer =
    activeTransferPopover !== null ? financialTransfers[activeTransferPopover.index] : null;

  const activeVictimCardNumber = currentActiveTransfer?.victimCardNumber || '';
  const activeVictimBankName = currentActiveTransfer?.victimBankName || '';
  const activeProviderName = currentActiveTransfer?.providerName || '';
  const activeReceiverCardNumber = currentActiveTransfer?.receiverCardNumber || '';
  const activeReceiverBankName = currentActiveTransfer?.receiverBankName || '';

  const filteredVictimCards = useMemo(() => {
    const q = activeVictimCardNumber.replace(/\D/g, '');
    if (!q) return [];
    return allCards.filter((c) => (c.card_number || '').replace(/\D/g, '').includes(q));
  }, [allCards, activeVictimCardNumber]);

  const filteredVictimBanks = useMemo(() => {
    const q = activeVictimBankName.trim().toLowerCase();
    if (!q) return [];
    return allBanks.filter((b) => (b.name || '').toLowerCase().includes(q));
  }, [allBanks, activeVictimBankName]);

  const filteredEntryProviders = useMemo(() => {
    const q = activeProviderName.trim().toLowerCase();
    if (!q) return [];
    return allProviders.filter(
      (p) => (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q),
    );
  }, [allProviders, activeProviderName]);

  const filteredReceiverCards = useMemo(() => {
    const q = activeReceiverCardNumber.replace(/\D/g, '');
    if (!q) return [];
    return allCards.filter((c) => (c.card_number || '').replace(/\D/g, '').includes(q));
  }, [allCards, activeReceiverCardNumber]);

  const filteredReceiverBanks = useMemo(() => {
    const q = activeReceiverBankName.trim().toLowerCase();
    if (!q) return [];
    return allBanks.filter((b) => (b.name || '').toLowerCase().includes(q));
  }, [allBanks, activeReceiverBankName]);

  // ==========================================================================
  // SELECTION HANDLERS
  // ==========================================================================
  const handleSelectCitizen = (c: Citizen) => {
    setSelectedCitizenId(c.id);
    setCitizenDistrictId(c.district_id || c.district?.id || null);
    setCitizenDistrictName(c.district?.name || '');
    setCitizenMahallaId(c.mahalla_id || c.mahalla?.id || null);
    setCitizenMahallaName(c.mahalla?.name || '');
    setCitizenForm({
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      middle_name: c.middle_name || '',
      passport: c.passport || '',
      phone_number: c.phone_number || '',
      pinfl: c.pinfl || '',
      address: c.address || '',
    });
    setShowCitizenPopover(false);
  };

  const handleSelectDistrict = (d: District) => {
    setSelectedDistrictId(d.id);
    setDistrictForm({
      name: d.name || '',
    });
    setShowDistrictPopover(false);
  };

  const handleSelectCrime = (c: Crime) => {
    setSelectedCrimeId(c.id);
    setCrimeForm({
      article: c.article || c.title || '',
    });
    setShowCrimePopover(false);
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
        status,
        date: date ? new Date(date).toISOString() : undefined,
      };

      // 1. Fuqaro
      const citizenDataObj: Record<string, unknown> = {
        first_name: citizenForm.first_name || undefined,
        last_name: citizenForm.last_name || undefined,
        middle_name: citizenForm.middle_name || undefined,
        passport:
          citizenForm.passport && citizenForm.passport.trim() !== ''
            ? citizenForm.passport.trim().toUpperCase()
            : undefined,
        phone_number: citizenForm.phone_number || undefined,
        pinfl:
          citizenForm.pinfl && citizenForm.pinfl.trim() !== ''
            ? citizenForm.pinfl.trim()
            : undefined,
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
            full_name: primary.victimCardFullName || undefined,
            bank_name: primary.victimBankName || undefined,
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
            amount: primary.amount ? Number(primary.amount) : undefined,
            currency: primary.currency || 'UZS',
            payment_provider_id: primary.providerId || undefined,
            payment_provider_name: primary.providerId
              ? undefined
              : primary.providerName || undefined,
            receiver_card_id: primary.receiverCardId || undefined,
            receiver_card_number: primary.receiverCardId
              ? undefined
              : primary.receiverCardNumber.replace(/\D/g, ''),
            receiver_card_full_name: primary.receiverCardFullName || undefined,
            receiver_bank_name: primary.receiverBankName || undefined,
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
              full_name: entry.victimCardFullName || undefined,
              bank_name: entry.victimBankName || undefined,
            },
            inline_transfer: {
              amount: entry.amount ? Number(entry.amount) : '',
              currency: entry.currency || 'UZS',
              payment_provider_id: entry.providerId || undefined,
              payment_provider_name: entry.providerId ? undefined : entry.providerName || undefined,
              receiver_card_id: entry.receiverCardId || undefined,
              receiver_card_number: entry.receiverCardId
                ? undefined
                : entry.receiverCardNumber.replace(/\D/g, ''),
              receiver_card_full_name: entry.receiverCardFullName || undefined,
              receiver_bank_name: entry.receiverBankName || undefined,
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
      toast.success('Ariza muvaffaqiyatli saqlandi va ro‘yxatga olindi!');
      navigate('/applications');
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
                  Murojaatlar
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono px-2 py-0 border-primary/40 text-primary font-bold"
                >
                  {status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Fuqaro murojaati va kiberjinoyat holatini ro‘yxatga olish shakli
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-1.5 shadow-sm">
              <span className="text-[11px] font-semibold text-muted-foreground">№</span>
              <Input
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value.toUpperCase())}
                placeholder="Ixtiyoriy raqam..."
                className="h-7 w-36 border-0 p-0 text-xs font-mono font-bold focus-visible:ring-0 bg-transparent uppercase"
              />
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
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-xs shadow-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="YANGI">Yangi (Qabul qilindi)</option>
              <option value="JARAYONDA">Jarayonda (Tergovda)</option>
              <option value="HAL_QILINDI">Hal qilindi</option>
              <option value="RAD_ETILDI">Rad etildi</option>
            </select>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 1-QISM: ARIZACHI (JABRLANUVCHI FUQARO) SHAXSIY ANKETASI */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5 text-primary">
              <User className="h-5 w-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                1. Arizachi Shaxsiy Ma‘lumotlar
              </h2>
            </div>
            {selectedCitizenId ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 text-xs py-1 px-2.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Bazadagi fuqaro biriktirildi
                <button
                  type="button"
                  onClick={() => setSelectedCitizenId(null)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  title="Bog‘lanishni bekor qilish"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px] text-muted-foreground">
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
                  onFocus={() => setShowCitizenPopover(true)}
                  onChange={(e) => {
                    setCitizenForm({ ...citizenForm, first_name: e.target.value.toUpperCase() });
                    setSelectedCitizenId(null);
                    setShowCitizenPopover(true);
                  }}
                  className="h-10 text-xs uppercase font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Familiya *</label>
                <Input
                  placeholder="FAMILIYA"
                  value={citizenForm.last_name}
                  onFocus={() => setShowCitizenPopover(true)}
                  onChange={(e) => {
                    setCitizenForm({ ...citizenForm, last_name: e.target.value.toUpperCase() });
                    setSelectedCitizenId(null);
                    setShowCitizenPopover(true);
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
                  onFocus={() => setShowCitizenPopover(true)}
                  onChange={(e) => {
                    setCitizenForm({ ...citizenForm, middle_name: e.target.value.toUpperCase() });
                    setSelectedCitizenId(null);
                    setShowCitizenPopover(true);
                  }}
                  className="h-10 text-xs uppercase font-medium"
                />
              </div>
            </div>

            {/* 2-Qator: Telefon raqami, Pasport ma'lumotlari, JSHSHIR (PINFL) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Telefon Raqami</label>
                <Input
                  placeholder="+998 90 123 45 67"
                  value={citizenForm.phone_number}
                  onFocus={() => setShowCitizenPopover(true)}
                  onChange={(e) => {
                    setCitizenForm({ ...citizenForm, phone_number: e.target.value.toUpperCase() });
                    setSelectedCitizenId(null);
                    setShowCitizenPopover(true);
                  }}
                  className="h-10 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Pasport Seriya & Raqam (Qidiruv)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Ixtiyoriy</span>
                </label>
                <Input
                  placeholder="AA1234567"
                  value={citizenForm.passport}
                  onFocus={() => setShowCitizenPopover(true)}
                  onChange={(e) => {
                    setCitizenForm({
                      ...citizenForm,
                      passport: e.target.value.toUpperCase(),
                    });
                    setSelectedCitizenId(null);
                    setShowCitizenPopover(true);
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
                  onFocus={() => setShowCitizenPopover(true)}
                  onChange={(e) => {
                    setCitizenForm({ ...citizenForm, pinfl: e.target.value.toUpperCase() });
                    setSelectedCitizenId(null);
                    setShowCitizenPopover(true);
                  }}
                  className="h-10 text-xs font-mono uppercase"
                />
              </div>
            </div>

            {/* 3-Qator: Tuman va Mahalla (Fuqaro yashaydigan hududi) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Yashash Tumani */}
              <div ref={citizenDistrictPopoverRef} className="relative space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Yashash Tumani
                  </label>
                  {citizenDistrictId ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Tuman tanlandi
                      <button
                        type="button"
                        onClick={() => {
                          setCitizenDistrictId(null);
                          setCitizenDistrictName('');
                          setCitizenMahallaId(null);
                          setCitizenMahallaName('');
                        }}
                        className="ml-1 hover:text-foreground"
                        title="Tozalash"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null}
                </div>
                <Input
                  placeholder="TUMANNI TANLANG YOKI QIDIRING..."
                  value={citizenDistrictName}
                  onFocus={() => setShowCitizenDistrictPopover(true)}
                  onChange={(e) => {
                    setCitizenDistrictName(e.target.value.toUpperCase());
                    setCitizenDistrictId(null);
                    setCitizenMahallaId(null);
                    setCitizenMahallaName('');
                    setShowCitizenDistrictPopover(true);
                  }}
                  className="h-10 text-xs uppercase font-medium"
                />

                {showCitizenDistrictPopover && filteredCitizenDistricts.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border shadow-xl rounded-xl p-2 max-h-48 overflow-y-auto">
                    <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1 border-b border-border/50 mb-1">
                      Mavjud tumanlar:
                    </div>
                    {filteredCitizenDistricts.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setCitizenDistrictId(d.id);
                          setCitizenDistrictName(d.name || '');
                          setCitizenMahallaId(null);
                          setCitizenMahallaName('');
                          setShowCitizenDistrictPopover(false);
                        }}
                        className="p-2 rounded hover:bg-muted cursor-pointer flex justify-between text-xs"
                      >
                        <span className="font-medium text-foreground">{d.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Yashash Mahallasi */}
              <div ref={citizenMahallaPopoverRef} className="relative space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    Yashash Mahallasi
                  </label>
                  {citizenMahallaId ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Mahalla tanlandi
                      <button
                        type="button"
                        onClick={() => {
                          setCitizenMahallaId(null);
                          setCitizenMahallaName('');
                        }}
                        className="ml-1 hover:text-foreground"
                        title="Tozalash"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null}
                </div>
                <Input
                  placeholder={
                    citizenDistrictId
                      ? 'MAHALLANI TANLANG YOKI YOZING...'
                      : 'AVVAL TUMANNI TANLANG (MAHALLA UCHUN)...'
                  }
                  value={citizenMahallaName}
                  disabled={!citizenDistrictId}
                  onFocus={() => {
                    if (citizenDistrictId) setShowCitizenMahallaPopover(true);
                  }}
                  onChange={(e) => {
                    setCitizenMahallaName(e.target.value.toUpperCase());
                    setCitizenMahallaId(null);
                    setShowCitizenMahallaPopover(true);
                  }}
                  className={`h-10 text-xs uppercase font-medium ${
                    !citizenDistrictId ? 'bg-muted/50 cursor-not-allowed text-muted-foreground' : ''
                  }`}
                />

                {showCitizenMahallaPopover && citizenDistrictId && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border shadow-xl rounded-xl p-2 max-h-48 overflow-y-auto">
                    <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1 border-b border-border/50 mb-1 flex items-center justify-between">
                      <span>{citizenDistrictName} tumanidagi mahallalar:</span>
                      {isLoadingCitizenMahallas && (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      )}
                    </div>

                    {filteredCitizenMahallas.length > 0 ? (
                      filteredCitizenMahallas.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setCitizenMahallaId(m.id);
                            setCitizenMahallaName(m.name || '');
                            setShowCitizenMahallaPopover(false);
                          }}
                          className="p-2 rounded hover:bg-muted cursor-pointer flex justify-between text-xs"
                        >
                          <span className="font-medium text-foreground">{m.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-xs text-muted-foreground">
                        Ushbu tumanda hozircha mahalla topilmadi.
                      </div>
                    )}

                    {citizenMahallaName.trim() &&
                      !allCitizenMahallas.some(
                        (m) =>
                          (m.name || '').toUpperCase() === citizenMahallaName.trim().toUpperCase(),
                      ) && (
                        <button
                          type="button"
                          onClick={() => {
                            createCitizenMahallaMutation.mutate({
                              name: citizenMahallaName.trim().toUpperCase(),
                              district_id: citizenDistrictId,
                            });
                          }}
                          disabled={createCitizenMahallaMutation.isPending}
                          className="w-full mt-1 p-2 text-left rounded bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          {createCitizenMahallaMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          <span>
                            Yangi mahalla sifatida qo‘shish: &quot;{citizenMahallaName}&quot;
                          </span>
                        </button>
                      )}
                  </div>
                )}
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
            {showCitizenPopover && matchedCitizens.length > 0 && (
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
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-primary border-b border-border/40 pb-3">
            <MapPin className="h-5 w-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              2. Ariza Yo‘naltirilgan Tuman & Jinoyat Turi
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tuman tanlash */}
            <div ref={districtPopoverRef} className="relative space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Yo‘naltirilgan Tuman / Biriktirilgan Bo‘lim *
                </label>
                {selectedDistrictId ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" />
                    Biriktirilgan tuman
                    <button
                      type="button"
                      onClick={() => setSelectedDistrictId(null)}
                      className="ml-1 hover:text-foreground"
                      title="Bog‘lanishni bekor qilish"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : districtForm.name ? (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Yangi tuman
                  </Badge>
                ) : null}
              </div>
              <Input
                placeholder="CHILONZOR, YUNUSOBOD, MIRZO ULUG‘BEK..."
                value={districtForm.name}
                onFocus={() => setShowDistrictPopover(true)}
                onChange={(e) => {
                  setDistrictForm({ name: e.target.value.toUpperCase() });
                  setSelectedDistrictId(null);
                  setShowDistrictPopover(true);
                }}
                className="h-10 text-xs uppercase"
              />

              {showDistrictPopover && filteredDistricts.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border shadow-xl rounded-xl p-2 max-h-48 overflow-y-auto">
                  <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1 border-b border-border/50 mb-1">
                    Bazada mavjud tumanlar:
                  </div>
                  {filteredDistricts.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => handleSelectDistrict(d)}
                      className="p-2 rounded hover:bg-muted cursor-pointer flex justify-between text-xs"
                    >
                      <span className="font-medium text-foreground">{d.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Jinoyat moddasi */}
            <div ref={crimePopoverRef} className="relative space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                  Jinoyat turi
                </label>
                {selectedCrimeId ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" />
                    Jinoyat turi biriktirildi
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCrimeId(null);
                        setCrimeForm({ article: '' });
                      }}
                      className="ml-1 hover:text-foreground"
                      title="Bog‘lanishni bekor qilish"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : crimeForm.article ? (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Yangi jinoyat turi
                  </Badge>
                ) : null}
              </div>

              <Input
                placeholder="JINOYAT TURINI TANLANG YOKI YOZING (MASALAN: FIRIBGARLIK)..."
                value={crimeForm.article}
                onFocus={() => setShowCrimePopover(true)}
                onChange={(e) => {
                  setCrimeForm({ article: e.target.value.toUpperCase() });
                  setSelectedCrimeId(null);
                  setShowCrimePopover(true);
                }}
                className="h-10 text-xs uppercase font-medium"
              />

              {showCrimePopover && filteredCrimes.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border shadow-xl rounded-xl p-2 max-h-48 overflow-y-auto">
                  <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1 border-b border-border/50 mb-1">
                    Bazada mavjud jinoyat turlari:
                  </div>
                  {filteredCrimes.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCrime(c)}
                      className="p-2 rounded hover:bg-muted cursor-pointer flex justify-between text-xs"
                    >
                      <span className="font-medium text-foreground">{c.article || c.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Fabula</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value.toUpperCase())}
              placeholder="HODISA QANDAY SODIR BO‘LGANI, JABRLANUVCHINING MUROJAATI VA HOLAT TAFSILOTLARI..."
              className="w-full rounded-lg border border-input bg-background p-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed uppercase"
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
              onChange={(e) => setOfficerNotes(e.target.value.toUpperCase())}
              placeholder="SURISHTIRUVCHI / XODIM TOMONIDAN ANIQLANGAN HOLATLAR, MA'LUMOTLAR VA QAYDLAR..."
              className="w-full rounded-lg border border-input bg-background p-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed uppercase"
            />
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3-QISM: BANK KARTASI VA NOQONUNIY O'TKAZMA (MOLIYAVIY ZARAR) */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 space-y-5 bg-muted/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5 text-primary">
              <CreditCard className="h-5 w-5" />
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
                          value={entry.victimCardNumber}
                          onFocus={() => setActiveTransferPopover({ index, type: 'victimCard' })}
                          onChange={(e) => {
                            handleUpdateTransferEntry(index, {
                              victimCardNumber: e.target.value.toUpperCase(),
                              victimCardId: null,
                            });
                            setActiveTransferPopover({ index, type: 'victimCard' });
                          }}
                          className="h-9 text-xs font-mono font-bold uppercase"
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
                                      victimCardNumber: c.card_number || '',
                                      victimCardFullName: c.full_name || '',
                                      victimBankName: c.bank?.name || '',
                                    });
                                    setActiveTransferPopover(null);
                                  }}
                                  className="p-1.5 rounded hover:bg-muted cursor-pointer flex justify-between font-mono text-xs"
                                >
                                  <span className="font-bold text-foreground">
                                    {c.masked_number || c.card_number}
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

                      <div className="relative space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Xizmat ko‘rsatuvchi bank
                        </label>
                        <Input
                          placeholder="KAPITALBANK, XALQ BANKI, AGROBANK..."
                          value={entry.victimBankName}
                          onFocus={() => setActiveTransferPopover({ index, type: 'victimBank' })}
                          onChange={(e) => {
                            handleUpdateTransferEntry(index, {
                              victimBankName: e.target.value.toUpperCase(),
                            });
                            setActiveTransferPopover({ index, type: 'victimBank' });
                          }}
                          className="h-9 text-xs uppercase"
                        />
                        {activeTransferPopover?.index === index &&
                          activeTransferPopover.type === 'victimBank' &&
                          filteredVictimBanks.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border shadow-xl rounded-xl p-2 max-h-40 overflow-y-auto">
                              {filteredVictimBanks.map((b) => (
                                <div
                                  key={b.id}
                                  onClick={() => {
                                    handleUpdateTransferEntry(index, {
                                      victimBankName: b.name || '',
                                    });
                                    setActiveTransferPopover(null);
                                  }}
                                  className="p-1.5 rounded hover:bg-muted cursor-pointer flex justify-between text-xs"
                                >
                                  <span className="font-medium text-foreground">{b.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
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
                            type="number"
                            placeholder="2500000"
                            value={entry.amount}
                            onChange={(e) =>
                              handleUpdateTransferEntry(index, { amount: e.target.value })
                            }
                            className="h-9 text-xs font-mono font-bold text-emerald-400 bg-background"
                          />
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

                      <div className="relative space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          To‘lov Provayderi / Ilova Nomi
                        </label>
                        <Input
                          placeholder="PAYME, CLICK, UZUM, ANORBANK..."
                          value={entry.providerName}
                          onFocus={() => setActiveTransferPopover({ index, type: 'provider' })}
                          onChange={(e) => {
                            handleUpdateTransferEntry(index, {
                              providerName: e.target.value.toUpperCase(),
                              providerId: null,
                            });
                            setActiveTransferPopover({ index, type: 'provider' });
                          }}
                          className="h-9 text-xs bg-background uppercase"
                        />
                        {activeTransferPopover?.index === index &&
                          activeTransferPopover.type === 'provider' &&
                          filteredEntryProviders.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border shadow-xl rounded-xl p-2 max-h-40 overflow-y-auto">
                              {filteredEntryProviders.map((p) => (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    handleUpdateTransferEntry(index, {
                                      providerId: p.id,
                                      providerName: p.name || '',
                                    });
                                    setActiveTransferPopover(null);
                                  }}
                                  className="p-1.5 rounded hover:bg-muted cursor-pointer flex justify-between text-xs"
                                >
                                  <span className="font-medium text-foreground">{p.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
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
                          value={entry.receiverCardNumber}
                          onFocus={() => setActiveTransferPopover({ index, type: 'receiverCard' })}
                          onChange={(e) => {
                            handleUpdateTransferEntry(index, {
                              receiverCardNumber: e.target.value.toUpperCase(),
                              receiverCardId: null,
                            });
                            setActiveTransferPopover({ index, type: 'receiverCard' });
                          }}
                          className="h-9 text-xs font-mono font-bold uppercase"
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
                                      receiverCardNumber: c.card_number || '',
                                      receiverCardFullName: c.full_name || '',
                                      receiverBankName: c.bank?.name || '',
                                    });
                                    setActiveTransferPopover(null);
                                  }}
                                  className="p-1.5 rounded hover:bg-muted cursor-pointer flex justify-between font-mono text-xs"
                                >
                                  <span className="font-bold text-foreground">
                                    {c.masked_number || c.card_number}
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

                      <div className="relative space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Firibgar kartasi banki
                        </label>
                        <Input
                          placeholder="KAPITALBANK, IPAK YO‘LI, TBC..."
                          value={entry.receiverBankName}
                          onFocus={() => setActiveTransferPopover({ index, type: 'receiverBank' })}
                          onChange={(e) => {
                            handleUpdateTransferEntry(index, {
                              receiverBankName: e.target.value.toUpperCase(),
                            });
                            setActiveTransferPopover({ index, type: 'receiverBank' });
                          }}
                          className="h-9 text-xs uppercase"
                        />
                        {activeTransferPopover?.index === index &&
                          activeTransferPopover.type === 'receiverBank' &&
                          filteredReceiverBanks.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border shadow-xl rounded-xl p-2 max-h-40 overflow-y-auto">
                              {filteredReceiverBanks.map((b) => (
                                <div
                                  key={b.id}
                                  onClick={() => {
                                    handleUpdateTransferEntry(index, {
                                      receiverBankName: b.name || '',
                                    });
                                    setActiveTransferPopover(null);
                                  }}
                                  className="p-1.5 rounded hover:bg-muted cursor-pointer flex justify-between text-xs"
                                >
                                  <span className="font-medium text-foreground">{b.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
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
        <div className="p-5 sm:p-6 space-y-6">
          <div className="flex items-center gap-2.5 text-primary border-b border-border/40 pb-3">
            <Paperclip className="h-5 w-5" />
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
                  const isImg =
                    f.mimetype?.startsWith('image/') ||
                    f.url?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                    f.original_name?.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                  const previewUrl = f.proxy_url || f.url;

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
                          href={previewUrl}
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

          {/* B. QO'SHIMCHA SUBYEKTLAR (GUMONLANUVCHI, TRANZIT KARTA, TERGOV QAYDI) */}
          <div className="pt-4 border-t border-border/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-foreground">
                  Ishga aloqador qo‘shimcha shaxslar va qaydlar ({customFields.length})
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Guvohlar, gumonlanuvchilar yoki tergov ko‘rsatmalarini qo‘shish
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddCustomFieldItem('CITIZEN', 'Gumonlanuvchi / Guvoh shaxs')}
                  className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <UserPlus className="h-3.5 w-3.5" />+ Guvoh / Gumonlanuvchi
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddCustomFieldItem('CARD', 'Qo‘shimcha karta')}
                  className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <CreditCard className="h-3.5 w-3.5" />+ Qo‘shimcha karta
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddCustomFieldItem('TEXT', 'Tergov ko‘rsatmasi / Qayd')}
                  className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <FileText className="h-3.5 w-3.5" />+ Tergov qaydi
                </Button>
              </div>
            </div>

            {/* QO'SHILGAN SUBYEKTLAR KARTOCHKALARI */}
            {customFields.length > 0 && (
              <div className="space-y-3 pt-1">
                {customFields.map((cf) => (
                  <div
                    key={cf.clientId}
                    className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                      <div className="flex items-center gap-2 flex-1">
                        {cf.type === 'CITIZEN' && (
                          <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">
                            Guvoh / Gumonlanuvchi
                          </Badge>
                        )}
                        {cf.type === 'CARD' && (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                            Qo‘shimcha karta
                          </Badge>
                        )}
                        {cf.type === 'TEXT' && (
                          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                            Tergov qaydi
                          </Badge>
                        )}

                        <Input
                          placeholder="Mavzu / Rol (Masalan: Gumonlanuvchi, Guvoh ko‘rsatmasi...)"
                          value={cf.label}
                          onChange={(e) =>
                            handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              label: e.target.value.toUpperCase(),
                            }))
                          }
                          className="h-8 text-xs font-semibold max-w-sm uppercase"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCustomFieldItem(cf.clientId)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* FUQARO ANKETASI */}
                    {cf.type === 'CITIZEN' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            placeholder="Ism *"
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
                            className="h-8 text-xs uppercase"
                          />
                          <Input
                            placeholder="Familiya"
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
                            className="h-8 text-xs uppercase"
                          />
                          <Input
                            placeholder="Sharif"
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
                            className="h-8 text-xs uppercase"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            placeholder="Telefon raqami"
                            value={cf.inline_citizen?.phone_number || ''}
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
                                  phone_number: val,
                                },
                              }));
                            }}
                            className="h-8 text-xs font-mono uppercase"
                          />
                          <Input
                            placeholder="Pasport (ixtiyoriy)"
                            value={cf.inline_citizen?.passport || ''}
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
                                  passport: val,
                                },
                              }));
                            }}
                            className="h-8 text-xs font-mono uppercase"
                          />
                          <Input
                            placeholder="JSHSHIR (ixtiyoriy)"
                            value={cf.inline_citizen?.pinfl || ''}
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
                                  pinfl: val,
                                },
                              }));
                            }}
                            className="h-8 text-xs font-mono uppercase"
                          />
                        </div>

                        <Input
                          placeholder="Yashash manzili"
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
                          className="h-8 text-xs uppercase"
                        />
                      </div>
                    )}

                    {/* KARTA ANKETASI */}
                    {cf.type === 'CARD' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                          placeholder="Karta raqami (16 talik)"
                          value={cf.inline_card?.card_number || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              inline_card: {
                                ...(f.inline_card || {
                                  card_number: '',
                                  expire_date: '',
                                  bank_name: '',
                                }),
                                card_number: val,
                              },
                            }));
                          }}
                          className="h-8 text-xs font-mono font-bold uppercase"
                        />
                        <Input
                          placeholder="Muddati (MM/YY)"
                          value={cf.inline_card?.expire_date || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              inline_card: {
                                ...(f.inline_card || {
                                  card_number: '',
                                  expire_date: '',
                                  bank_name: '',
                                }),
                                expire_date: val,
                              },
                            }));
                          }}
                          className="h-8 text-xs font-mono uppercase"
                        />
                        <Input
                          placeholder="Bank nomi"
                          value={cf.inline_card?.bank_name || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                              ...f,
                              inline_card: {
                                ...(f.inline_card || {
                                  card_number: '',
                                  expire_date: '',
                                  bank_name: '',
                                }),
                                bank_name: val,
                              },
                            }));
                          }}
                          className="h-8 text-xs uppercase"
                        />
                      </div>
                    )}

                    {/* MATN / TERGOV QAYDI */}
                    {cf.type === 'TEXT' && (
                      <textarea
                        rows={3}
                        placeholder="Tergov qaydi, shaxsning ko‘rsatmalari yoki qo‘shimcha ma‘lumotlar..."
                        value={String(cf.value || '')}
                        onChange={(e) =>
                          handleUpdateCustomFieldItem(cf.clientId, (f) => ({
                            ...f,
                            value: e.target.value.toUpperCase(),
                          }))
                        }
                        className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-inner uppercase"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
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
                  {status}
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
                  <span>Arizani Saqlash & Yakunlash</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* O'CHIRISHNI TASDIQLASH DIALOGI */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ariza loyihasini butunlay o‘chirish</DialogTitle>
            <DialogDescription className="text-xs">
              Ushbu arizani va kiritilgan barcha ma‘lumotlarni bazadan to‘liq o‘chirib
              tashlamoqchimisiz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-xs"
            >
              Yo‘q, davom etish
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-xs gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleteMutation.isPending ? 'O‘chirilmoqda...' : 'Ha, butunlay o‘chirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
