import { DocumentEditor } from '@onlyoffice/document-editor-react';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  Eye,
  FileCode2,
  Loader2,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { templatesApi } from '@/lib/api';

import { VariablePaletteDrawer } from './variable-palette-drawer';

interface TemplateEditorModalProps {
  templateId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function TemplateEditorModal({
  templateId,
  isOpen,
  onClose,
  onSaved,
}: TemplateEditorModalProps) {
  const [showVariablesDrawer, setShowVariablesDrawer] = useState(true);
  const [, setIsEditorReady] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const connectorRef = useRef<any>(null);

  const editorInstanceId = useId().replace(/[^a-zA-Z0-9]/g, '_');
  const editorId = `tpl_editor_${editorInstanceId}`;

  // 1. Fetch ONLYOFFICE Config for Template
  const {
    data: configData,
    isLoading: isConfigLoading,
    isError: isConfigError,
    error: configError,
  } = useQuery({
    queryKey: ['template-config', templateId],
    queryFn: () => (templateId ? templatesApi.getConfig(templateId) : null),
    enabled: !!templateId && isOpen,
  });

  // 2. Fetch Variables Dictionary for Drawer
  const { data: variablesCategories = [] } = useQuery({
    queryKey: ['template-variables'],
    queryFn: () => templatesApi.getVariables(),
    enabled: isOpen,
  });

  // 3. Cleanup on unmount
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

  // 4. Keyboard save shortcut (Ctrl + S)
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

  if (!isOpen || !templateId) return null;

  const documentServerUrl =
    (import.meta as any).env?.VITE_ONLYOFFICE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8084`;

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

  const handleDocumentStateChange = (event: any) => {
    if (event) {
      if (event.data === true) {
        setIsModified(true);
      } else if (event.data === false) {
        setIsModified(false);
        setIsSaving(false);
        onSaved?.();
      }
    }
  };

  const handleInsertTag = (tag: string) => {
    if (connectorRef.current) {
      try {
        connectorRef.current.executeMethod('PasteText', [tag]);
        setIsModified(true);
        return;
      } catch (e) {
        console.warn('executeMethod PasteText error:', e);
      }
    }
    navigator.clipboard.writeText(tag);
    setIsModified(true);
  };

  const handleForceSave = () => {
    setIsSaving(true);
    try {
      const docEditor = (window as any).DocEditor?.instances?.[editorId];
      if (docEditor && typeof docEditor.serviceCommand === 'function') {
        docEditor.serviceCommand('forcesave');
        setTimeout(() => {
          setIsModified(false);
          setIsSaving(false);
          toast.success('Shablon saqlandi');
          onSaved?.();
        }, 1200);
        return;
      }
    } catch (err) {
      console.error('forcesave error:', err);
    }
    setTimeout(() => {
      setIsModified(false);
      setIsSaving(false);
      onSaved?.();
    }, 1000);
  };

  const handleTestGenerate = async () => {
    if (!templateId) return;
    setIsTesting(true);
    try {
      // First force save if modified
      if (isModified) {
        handleForceSave();
        await new Promise((r) => setTimeout(r, 1000));
      }

      const blob = await templatesApi.testGenerate(templateId, { script: 'lotin' });
      // Trigger browser download of generated sample
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test_sinov_${configData?.title || 'shablon'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Namunaviy ariza bilan to‘ldirilgan Word hujjati yuklab olindi!');
    } catch (e: any) {
      toast.error('Sinov generatsiyasida xatolik: ' + (e.message || 'Xatolik'));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4 gap-4 shadow-sm z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileCode2 className="h-5 w-5" />
          </div>
          <div className="truncate">
            <h2 className="text-sm font-semibold truncate text-foreground flex items-center gap-2">
              <span>{configData?.title || 'Shablon Muharriri'}</span>
              <span className="text-[11px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Universal Shablon
              </span>
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              O‘zgaruvchilar kiritish uchun o‘ng tarafdagi katalogdan foydalaning
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Toggle Variables Palette Button */}
          <Button
            variant={showVariablesDrawer ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowVariablesDrawer((prev) => !prev)}
            className="gap-1.5 h-8 text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">O‘zgaruvchilar</span>
          </Button>

          {/* Test Generate Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestGenerate}
            disabled={isTesting}
            className="gap-1.5 h-8 text-xs border-primary/30 hover:bg-primary/5 text-primary"
            title="Namunaviy ma’lumotlar bilan to‘ldirilgan Word ko‘rinishini yuklab olish"
          >
            {isTesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Sinash (Test)</span>
          </Button>

          {/* Save Button */}
          <Button
            variant={isModified ? 'default' : 'outline'}
            size="sm"
            onClick={handleForceSave}
            disabled={isSaving}
            className="gap-1.5 h-8 text-xs min-w-[90px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saqlanmoqda...
              </>
            ) : isModified ? (
              <>
                <Save className="w-3.5 h-3.5" />
                Saqlash *
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Saqlangan
              </>
            )}
          </Button>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Yopish"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Editor Area */}
        <div className="flex-1 h-full w-full relative bg-muted/20">
          {isConfigLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                ONLYOFFICE muharriri yuklanmoqda...
              </p>
            </div>
          )}

          {isConfigError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-20 gap-3 p-6 text-center">
              <p className="text-sm text-destructive font-medium">
                Shablonni yuklashda xatolik yuz berdi
              </p>
              <p className="text-xs text-muted-foreground">
                {(configError as any)?.message || 'Xatolik tafsilotlari mavjud emas'}
              </p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Yopish
              </Button>
            </div>
          )}

          {configData && (
            <div className="w-full h-full">
              <DocumentEditor
                id={editorId}
                documentServerUrl={documentServerUrl}
                config={{
                  ...configData,
                  events: {
                    onDocumentReady: handleDocumentReady,
                    onDocumentStateChange: handleDocumentStateChange,
                  },
                }}
              />
            </div>
          )}
        </div>

        {/* Right Side: Variable Palette Drawer */}
        <VariablePaletteDrawer
          categories={variablesCategories}
          isOpen={showVariablesDrawer}
          onInsertTag={handleInsertTag}
          onClose={() => setShowVariablesDrawer(false)}
        />
      </div>
    </div>
  );
}
