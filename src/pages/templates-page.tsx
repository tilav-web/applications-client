import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Eye, FileCode2, FileText, Loader2, Plus, Search, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { CreateTemplateDialog } from '@/components/templates/create-template-dialog';
import { TemplateEditorModal } from '@/components/templates/template-editor-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { type DocumentTemplateRecord, templatesApi } from '@/lib/api';

export function TemplatesPage() {
  const queryClient = useQueryClient();
  const [script, setScript] = useState<'lotin' | 'krill'>('lotin');
  const [search, setSearch] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [testingTemplateId, setTestingTemplateId] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; title: string } | null>(
    null,
  );

  // 1. Fetch Templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', script, search],
    queryFn: () =>
      templatesApi.getAll({
        script,
        search: search.trim() || undefined,
      }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      toast.success('Shablon o‘chirildi');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      toast.error('O‘chirishda xatolik: ' + msg);
    },
  });

  const handleDelete = (id: string, title: string) => {
    setTemplateToDelete({ id, title });
  };

  const handleTestGenerate = async (tpl: DocumentTemplateRecord) => {
    setTestingTemplateId(tpl.id);
    try {
      const blob = await templatesApi.testGenerate(tpl.id, { script });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sinov_${tpl.file_name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Namunaviy ariza bilan to‘ldirilgan Word hujjati yuklab olindi!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Xatolik';
      toast.error('Sinov generatsiyasida xatolik: ' + msg);
    } finally {
      setTestingTemplateId(null);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
            <FileCode2 className="h-6 w-6 text-primary" />
            Hujjat Shablonlari Boshqaruvi
          </h1>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Script Toggle */}
          <div className="flex rounded-lg border border-border p-0.5 bg-muted/40">
            <button
              onClick={() => setScript('lotin')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                script === 'lotin'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Lotin
            </button>
            <button
              onClick={() => setScript('krill')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                script === 'krill'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Кирилл
            </button>
          </div>

          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" />
            Yangi Shablon
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Shablon nomi yoki tavsifini qidirish..."
            className="pl-8 h-9 text-xs bg-background"
          />
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Jami: <span className="font-semibold text-foreground">{templates.length}</span> ta shablon
        </p>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Shablonlar yuklanmoqda...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/50">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">
            Hozircha shablonlar mavjud emas
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            Yangi shablon yaratish yoki .docx formatidagi namunaviy faylni yuklash orqali tizimni
            to‘ldirishingiz mumkin.
          </p>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Birinchi shablonni qo‘shish
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const displayTitle =
              script === 'krill' && tpl.title_krill ? tpl.title_krill : tpl.title;
            const tagsCount = Array.isArray(tpl.available_tags) ? tpl.available_tags.length : 0;
            const isTesting = testingTemplateId === tpl.id;

            return (
              <Card
                key={tpl.id}
                className="hover:shadow-md transition-all duration-200 border-border/80 flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Shablon</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Tag className="w-3 h-3 text-primary" />
                      <span>{tagsCount} ta teg</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm mt-2 text-foreground line-clamp-1 leading-snug">
                    {displayTitle}
                  </h3>
                  {tpl.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {tpl.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="p-4 pt-1 pb-3 text-[11px] text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Fayl:</span>
                    <span className="font-mono text-foreground/80 truncate max-w-[180px]">
                      {tpl.file_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Hajmi:</span>
                    <span>{(Number(tpl.file_size) / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Versiya:</span>
                    <span>v{tpl.version}</span>
                  </div>
                </CardContent>

                <CardFooter className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {/* Test Generate */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestGenerate(tpl)}
                      disabled={isTesting}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
                      title="Namunaviy ma’lumotlar bilan to‘ldirilgan Word ni yuklab ko‘rish"
                    >
                      {isTesting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                      <span className="hidden sm:inline">Sinash</span>
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(tpl.id, tpl.title)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Edit in OnlyOffice */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setEditingTemplateId(tpl.id)}
                    className="h-7 px-3 text-xs gap-1.5 shadow-sm"
                  >
                    <Edit3 className="w-3 h-3" />
                    Tahrirlash
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateTemplateDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(newTpl) => {
          queryClient.invalidateQueries({ queryKey: ['templates'] });
          // Open editor for newly created blank template immediately
          setEditingTemplateId(newTpl.id);
        }}
      />

      {/* Template Editor Modal */}
      <TemplateEditorModal
        templateId={editingTemplateId}
        isOpen={!!editingTemplateId}
        onClose={() => setEditingTemplateId(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['templates'] });
        }}
      />

      {/* Shablonni o'chirish tasdiqlash dialogi */}
      <ConfirmDialog
        open={!!templateToDelete}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
        title="Shablonni o‘chirish"
        description={
          templateToDelete ? (
            <span>
              Haqiqatan ham{' '}
              <strong className="text-foreground font-semibold">"{templateToDelete.title}"</strong>{' '}
              nomli shablonni tizimdan o‘chirmoqchimisiz?
            </span>
          ) : (
            ''
          )
        }
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (templateToDelete) {
            deleteMutation.mutate(templateToDelete.id, {
              onSettled: () => setTemplateToDelete(null),
            });
          }
        }}
      />
    </div>
  );
}
export default TemplatesPage;
