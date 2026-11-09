import { FileText, Loader2, Sparkles, UploadCloud } from 'lucide-react';
import * as React from 'react';
import { useEffect, useState } from 'react';

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

interface CreateWordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileToUpload?: File | null;
  applicationNumber?: string | null;
  onSubmit: (title: string, file?: File | null) => Promise<void> | void;
  isLoading?: boolean;
}

const TEMPLATE_SUGGESTIONS = [
  'Tergov qarori',
  'Murojaat bayonnomasi',
  'Bankka so‘rovnoma',
  'Tushuntirish xati',
  'Muzlatish to‘g‘risida qaror',
  'Ekspertiza tayinlash qarori',
];

export function CreateWordDialog({
  isOpen,
  onClose,
  fileToUpload,
  applicationNumber,
  onSubmit,
  isLoading = false,
}: CreateWordDialogProps) {
  const [title, setTitle] = useState('');

  // Initial title setup when opening
  useEffect(() => {
    if (isOpen) {
      if (fileToUpload) {
        // Remove extension from file name
        const cleanName = fileToUpload.name.replace(/\.[^/.]+$/, '').trim();
        setTitle(cleanName || 'Yuklangan hujjat');
      } else {
        setTitle(applicationNumber ? `Tergov hujjati - ${applicationNumber}` : '');
      }
    }
  }, [isOpen, fileToUpload, applicationNumber]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalTitle = title.trim() || (fileToUpload ? fileToUpload.name : 'Rasmiy hujjat');
    onSubmit(finalTitle, fileToUpload);
  };

  const isUploadMode = Boolean(fileToUpload);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#185abd] text-white font-serif font-black text-lg shadow-sm">
              W
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                {isUploadMode
                  ? 'Word Hujjatini Yuklash & Nomlash'
                  : 'Yangi Word Hujjatini Yaratish'}
              </DialogTitle>
              <DialogDescription>
                {isUploadMode
                  ? 'Kompyuterdan yuklanayotgan hujjat nomini tasdiqlang yoki o‘zgartiring'
                  : 'Arizaga biriktiriladigan yangi Word hujjatining rasmiy nomini kiriting'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* If file is selected from computer, show file info card */}
          {fileToUpload && (
            <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <UploadCloud className="h-4 w-4 text-[#185abd] shrink-0" />
                <div className="overflow-hidden">
                  <p className="font-semibold text-foreground truncate" title={fileToUpload.name}>
                    {fileToUpload.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Hajmi: {(fileToUpload.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-blue-500/40 text-blue-600 bg-blue-500/10 text-[10px] shrink-0"
              >
                .DOCX / .DOC
              </Badge>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Hujjat Nomi (Sarlavha) *</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                ONLYOFFICE da aks etadi
              </span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Tergov qarori yoki Bayonnoma..."
                required
                className="h-11 pl-9 text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          {/* Quick suggestions pills */}
          {!isUploadMode && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Tezkor namunaviy nomlar:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setTitle(sug)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors cursor-pointer hover:border-primary/40"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs sm:text-sm h-10 px-5 cursor-pointer font-medium"
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              size="default"
              disabled={isLoading}
              className="text-xs sm:text-sm h-10 px-6 font-semibold bg-[#185abd] hover:bg-[#12448f] text-white shadow-md shadow-blue-600/25 cursor-pointer gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isUploadMode ? 'Yuklanmoqda...' : 'Yaratilmoqda...'}</span>
                </>
              ) : (
                <span>{isUploadMode ? 'Yuklash & Ochish' : 'Hujjatni Yaratish & Ochish'}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
