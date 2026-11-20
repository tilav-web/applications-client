import { DocumentEditor } from '@onlyoffice/document-editor-react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronRight, Download, Loader2, Save, X, Zap } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { documentsApi } from '@/lib/api';
import type { Application } from '@/types/models';

import { QuickActionsPanel } from './quick-actions-panel';

interface DocumentEditorModalProps {
  documentId: string | null;
  application: Application;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function DocumentEditorModal({
  documentId,
  application,
  isOpen,
  onClose,
  onSaved,
}: DocumentEditorModalProps) {
  // Standart holatda yashirin (false) bo'ladi, foydalanuvchi tugmani bosganda sheet ochiladi
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const connectorRef = useRef<any>(null);

  const editorInstanceId = useId().replace(/[^a-zA-Z0-9]/g, '_');
  const editorId = `docx_editor_${editorInstanceId}`;

  // 1. Fetch ONLYOFFICE Config
  const {
    data: configData,
    isLoading: isConfigLoading,
    isError: isConfigError,
    error: configError,
  } = useQuery({
    queryKey: ['document-config', documentId],
    queryFn: () => (documentId ? documentsApi.getConfig(documentId) : null),
    enabled: !!documentId && isOpen,
  });

  // 2. Tozalash: Modal yopilganda connector ni uzish
  useEffect(() => {
    return () => {
      if (connectorRef.current) {
        try {
          connectorRef.current.disconnect();
        } catch (e) {
          console.warn('Disconnect error:', e);
        }
        connectorRef.current = null;
      }
    };
  }, []);

  // Hujjatni majburiy saqlash (Ctrl+S yoki tugma orqali)
  const handleForceSave = () => {
    setIsSaving(true);
    try {
      const docEditor = (window as any).DocEditor?.instances?.[editorId];
      if (docEditor && typeof docEditor.serviceCommand === 'function') {
        docEditor.serviceCommand('forcesave');
        setTimeout(() => {
          setIsModified(false);
          setIsSaving(false);
          onSaved?.();
        }, 500);
        return;
      }
    } catch (e) {
      console.warn('Force save xatoligi:', e);
    }
    setIsSaving(false);
    setIsModified(false);
    onSaved?.();
  };

  // 3. Klaviatura orqali tezkor saqlash (Ctrl + S yoki Cmd + S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
        e.preventDefault();
        e.stopPropagation();
        handleForceSave();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  if (!isOpen || !documentId) return null;

  // Document Server URL
  const documentServerUrl =
    (import.meta as any).env?.VITE_ONLYOFFICE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8084`;

  // ONLYOFFICE tayyor bo'lganda ishga tushuvchi callback
  const handleDocumentReady = () => {
    setIsEditorReady(true);
    try {
      const docEditor = (window as any).DocEditor?.instances?.[editorId];
      if (docEditor) {
        const conn = docEditor.createConnector();
        connectorRef.current = conn;
      }
    } catch (e) {
      console.warn('Connector yaratishda ogohlantirish:', e);
    }
  };

  // ONLYOFFICE holati o'zgarganda (hujjat tahrirlanganda yoki saqlanganda)
  const handleDocumentStateChange = (event: any) => {
    if (event) {
      if (event.data === true) {
        // Hujjatda saqlanmagan yangi o'zgarishlar bor
        setIsModified(true);
      } else if (event.data === false) {
        // Barcha o'zgarishlar saqlandi (alert chiqarmay, tugma default ko'rinishga o'tadi)
        setIsModified(false);
        setIsSaving(false);
        onSaved?.();
      }
    }
  };

  // "Tezkor amallar" orqali hujjat kursoriga matn kiritish
  const handleInsertText = (text: string) => {
    if (connectorRef.current) {
      try {
        connectorRef.current.executeMethod('PasteText', [text]);
        setIsModified(true);
        return;
      } catch (e) {
        console.warn('executeMethod xatoligi, fallback qo‘llaniladi:', e);
      }
    }

    // Fallback: Clipboard
    navigator.clipboard.writeText(text);
    setIsModified(true);
  };

  // Faylni to'g'ridan-to'g'ri yuklab olish
  const handleDownload = () => {
    const downloadUrl = documentsApi.getFileUrl(documentId);
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="light fixed inset-0 z-50 w-screen h-screen bg-white flex flex-col overflow-hidden animate-in fade-in-50 text-slate-900">
      {/* ================================================================= */}
      {/* MICROSOFT OFFICE CLASSIC WHITE TOP BAR */}
      {/* ================================================================= */}
      <div className="h-12 px-3 sm:px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs z-30 select-none">
        {/* CHAP TOMON: Word Ikonka + Hujjat Nomi */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#185abd] text-white font-bold shadow-xs">
            <span className="text-xs font-serif">W</span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
              {configData?.title || 'Rasmiy Word Hujjati'}
            </span>

            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span>—</span>
              <span className="flex items-center gap-1 text-emerald-600">
                <Check className="h-3 w-3" />
                {isEditorReady ? 'Tayyor' : 'Ulanmoqda...'}
              </span>
            </div>
          </div>
        </div>

        {/* O'NG TOMON: Tugmalar (Tezkor amallar Sheet tugmasi, Saqlash, Yuklab olish, Yopish) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* TEZKOR AMALLARNI OCHISH TUGMASI (KICHIK VA TOZA OFFICE USLUBIDA) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={`h-8 px-2.5 sm:px-3 text-xs font-semibold gap-1.5 transition-all shadow-none ${
              showQuickActions
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'
                : 'bg-blue-50/80 hover:bg-blue-100/80 text-blue-700 border-blue-200'
            }`}
            title="Arizachi ma'lumotlarini kursorga joylash paneli"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Tezkor amallar</span>
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                showQuickActions ? 'rotate-90' : ''
              }`}
            />
          </Button>

          {/* SAQLASH TUGMASI (O'ZGARISH BO'LSA KO'K VA PULSATING, SAQLANGAN BO'LSA DEFAULT OQ) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleForceSave}
            disabled={isSaving}
            className={`h-8 px-2.5 sm:px-3 text-xs font-semibold gap-1.5 transition-all shadow-none ${
              isSaving
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : isModified
                  ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title={
              isModified ? 'O‘zgarishlarni saqlash (Ctrl + S)' : 'Barcha o‘zgarishlar saqlangan'
            }
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                <span className="hidden sm:inline">Saqlanmoqda...</span>
              </>
            ) : isModified ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                </span>
                <Save className="h-3.5 w-3.5 text-white" />
                <span>Saqlash</span>
                <kbd className="hidden lg:inline-flex text-[10px] bg-blue-700 text-blue-100 px-1 py-0.5 rounded border border-blue-500 font-mono font-medium">
                  Ctrl+S
                </kbd>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline font-medium text-slate-600">Saqlangan</span>
                <kbd className="hidden lg:inline-flex text-[10px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded border border-slate-200 font-mono">
                  Ctrl+S
                </kbd>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-8 px-2.5 sm:px-3 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border-slate-200 shadow-none gap-1.5"
            title="Word faylini yuklab olish"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span className="hidden md:inline">Yuklab olish</span>
          </Button>

          <div className="h-5 w-px bg-slate-200 mx-0.5" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md"
            title="Hujjatni yopish va arizaga qaytish"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* ASOSIY OYNA: ONLYOFFICE EDITOR (100% EKRAN) + SLIDE-OVER SHEET */}
      {/* ================================================================= */}
      <div className="flex-1 w-full h-[calc(100vh-48px)] relative bg-[#f3f2f1] overflow-hidden">
        {/* YUKLANMOQDA HOLATI */}
        {isConfigLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#185abd]" />
            <p className="text-xs font-semibold text-slate-700">
              Microsoft Word muharriri yuklanmoqda...
            </p>
          </div>
        )}

        {/* XATOLIK HOLATI */}
        {isConfigError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-6 text-center z-20">
            <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <X className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Hujjatni yuklab bo‘lmadi</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {configError instanceof Error ? configError.message : 'Server bilan aloqa uzildi'}
            </p>
            <Button size="sm" variant="outline" onClick={onClose} className="mt-2 text-xs">
              Yopish
            </Button>
          </div>
        )}

        {/* ONLYOFFICE DOCUMENT EDITOR (TO'LIQ EKRAN) */}
        {configData && (
          <div className="w-full h-full">
            <DocumentEditor
              id={editorId}
              documentServerUrl={documentServerUrl}
              config={
                {
                  documentType: configData.documentType,
                  token: (configData as { token?: string }).token,
                  document: {
                    ...configData.document,
                    permissions: {
                      comment: true,
                      copy: true,
                      download: true,
                      edit: true,
                      fillForms: true,
                      modifyContentControl: true,
                      modifyFilter: true,
                      print: true,
                      review: true,
                      chat: false,
                      ...configData.document?.permissions,
                    },
                  },
                  editorConfig: {
                    ...configData.editorConfig,
                    mode: 'edit',
                    lang: 'ru',
                    customization: {
                      ...configData.editorConfig?.customization,
                      uiTheme: 'theme-classic-light',
                      forcesave: true,
                      autosave: true,
                      compactHeader: false,
                      toolbarNoTabs: false,
                      feedback: false,
                    },
                  },
                } as any
              }
              events_onDocumentReady={handleDocumentReady}
              events_onDocumentStateChange={handleDocumentStateChange}
              height="100%"
              width="100%"
            />
          </div>
        )}

        {/* TEZKOR AMALLAR UCHUN KICHIK SUZUVCHI YON TUGMA (AGAR PANEL YOPILGAN BO'LSA) */}
        {!showQuickActions && (
          <button
            type="button"
            onClick={() => setShowQuickActions(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 py-3 px-2 rounded-l-lg bg-white hover:bg-blue-50 text-blue-700 border border-r-0 border-slate-300 shadow-md text-xs font-semibold [writing-mode:vertical-rl] rotate-180 transition-all hover:pr-3 cursor-pointer"
            title="Tezkor amallar panelini ochish"
          >
            <Zap className="h-3.5 w-3.5 rotate-90 text-blue-600" />
            <span>Tezkor amallar</span>
          </button>
        )}

        {/* ================================================================= */}
        {/* SLIDE-OVER SHEET (TEZKOR AMALLAR KICHIK SHEET OYNASI) */}
        {/* ================================================================= */}
        <div
          className={`absolute top-0 right-0 bottom-0 w-80 sm:w-96 z-40 bg-white shadow-2xl border-l border-slate-200 transition-transform duration-300 ease-in-out flex flex-col ${
            showQuickActions ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
        >
          <QuickActionsPanel
            application={application}
            onInsert={handleInsertText}
            onClose={() => setShowQuickActions(false)}
          />
        </div>
      </div>
    </div>
  );
}
