import { FileText, Loader2, Sparkles, Upload } from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';

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
import { type DocumentTemplateRecord, templatesApi } from '@/lib/api';

interface CreateTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (template: DocumentTemplateRecord) => void;
}

export function CreateTemplateDialog({ isOpen, onClose, onSuccess }: CreateTemplateDialogProps) {
  const [activeTab, setActiveTab] = useState<'blank' | 'upload'>('blank');
  const [title, setTitle] = useState('');
  const [titleKrill, setTitleKrill] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setTitleKrill('');
    setDescription('');
    setSelectedFile(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.docx')) {
        toast.error('Faqat .docx formatidagi fayllar qabul qilinadi');
        return;
      }
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.docx$/i, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Shablon nomini kiriting');
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeTab === 'blank') {
        const res = await templatesApi.createBlank({
          title: title.trim(),
          title_krill: titleKrill.trim() || undefined,
          description: description.trim() || undefined,
        });
        toast.success('Yangi bo‘sh shablon yaratildi!');
        onSuccess(res);
        handleClose();
      } else {
        if (!selectedFile) {
          toast.error('Word (.docx) faylini tanlang');
          setIsSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title.trim());
        if (titleKrill.trim()) formData.append('title_krill', titleKrill.trim());
        if (description.trim()) formData.append('description', description.trim());

        const res = await templatesApi.upload(formData);
        toast.success('Shablon muvaffaqiyatli yuklandi!');
        onSuccess(res);
        handleClose();
      }
    } catch (err: any) {
      toast.error(
        'Xatolik: ' + (err.response?.data?.message || err.message || 'Xatolik yuz berdi'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Yangi Hujjat Shablonini Qo‘shish
          </DialogTitle>
          <DialogDescription>
            Tizimga yangi universal shablon qo‘shing. U arizalar sahifasida avtomatik ravishda
            barcha xodimlar uchun mavjud bo‘ladi.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          <button
            type="button"
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'blank'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('blank')}
          >
            <FileText className="w-3.5 h-3.5" />
            Noldan yangi shablon (OnlyOffice)
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload className="w-3.5 h-3.5" />
            .docx fayl yuklash
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          {activeTab === 'upload' && (
            <div>
              <label className="text-xs font-medium text-foreground">
                Word (.docx) faylini tanlang *
              </label>
              <div className="mt-1.5 flex justify-center rounded-lg border border-dashed border-border px-6 py-4 hover:border-primary/50 transition-colors bg-muted/20">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <div className="mt-2 flex text-xs text-muted-foreground justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md font-semibold text-primary hover:underline"
                    >
                      <span>Faylni tanlang</span>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".docx"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">yoki shu yerga tashlang</p>
                  </div>
                  {selectedFile ? (
                    <p className="text-xs text-primary font-medium mt-1">
                      Tanlangan: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-1">Faqat .docx fayl</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Shablon nomi (Lotin) *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Tushuntirish xati"
                className="text-xs h-9"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Nomi (Kirillcha - ixtiyoriy)
              </label>
              <Input
                value={titleKrill}
                onChange={(e) => setTitleKrill(e.target.value)}
                placeholder="Масалан: Тушунтириш хати"
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Tavsifi (Izoh)</label>
            <textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              placeholder="Ushbu shablon qanday vaziyatlarda va kimlar uchun qo‘llaniladi..."
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Bekor qilish
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {activeTab === 'blank' ? 'Yaratish va Tahrirlash' : 'Yuklash'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
