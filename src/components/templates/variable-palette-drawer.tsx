import {
  ArrowLeftRight,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  FileText,
  Plus,
  PlusCircle,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import type { TemplateCategoryConfig } from '@/lib/api';

interface VariablePaletteDrawerProps {
  categories: TemplateCategoryConfig[];
  onInsertTag?: (tag: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  citizen: User,
  application: FileText,
  app: FileText,
  crime: Scale,
  district: Building2,
  victim_card: CreditCard,
  fraud_card: ShieldAlert,
  transfer: CreditCard,
  transfers: ArrowLeftRight,
  custom: PlusCircle,
  officer: BadgeCheck,
  system: Calendar,
};

export function VariablePaletteDrawer({
  categories,
  onInsertTag,
  isOpen,
  onClose,
}: VariablePaletteDrawerProps) {
  const [search, setSearch] = useState('');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleCopy = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    toast.success(`Nusxalandi: "${tag}"`);
    setTimeout(() => {
      setCopiedTag((prev) => (prev === tag ? null : prev));
    }, 1800);
  };

  const handleInsert = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInsertTag) {
      onInsertTag(tag);
      toast.success(`Hujjatga joylandi: ${tag}`);
    } else {
      handleCopy(tag, e);
    }
  };

  // Filter categories and items based on search query
  const filteredCategories = React.useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase().trim();

    return categories
      .map((cat) => {
        const filteredItems = cat.items.filter(
          (item) =>
            item.tag.toLowerCase().includes(q) ||
            item.label.toLowerCase().includes(q) ||
            item.rawKey.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q)) ||
            (item.sampleValue && item.sampleValue.toLowerCase().includes(q)),
        );
        return {
          ...cat,
          items: filteredItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categories, search]);

  if (!isOpen) return null;

  return (
    <aside className="w-80 md:w-96 flex flex-col border-l border-border bg-card/95 backdrop-blur-md shadow-2xl z-30 transition-all duration-200 h-full flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/40">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight">O‘zgaruvchilar Katalogi</h3>
              <p className="text-xs text-muted-foreground">Shablon uchun dinamik modellar</p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              title="Yopish"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Model yoki o‘zgaruvchi qidirish..."
            className="pl-8 h-8 text-xs bg-background/80"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Info Tip */}
      <div className="px-4 py-2 bg-primary/5 border-b border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Word dagi kursor joyiga kiritish uchun:</span>
        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
          1-bosish
        </Badge>
      </div>

      {/* Categories & Variables List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-10 px-4 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Bunday o‘zgaruvchi topilmadi</p>
            <p className="text-xs mt-1">Boshqa so‘z bilan qidirib ko‘ring</p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id] || FileText;
            const isCollapsed = Boolean(collapsedCategories[cat.id]);

            return (
              <div
                key={cat.id}
                className="rounded-lg border border-border/80 bg-background/50 overflow-hidden"
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">{cat.label}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-mono">
                      {cat.items.length}
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>

                {/* Items */}
                {!isCollapsed && (
                  <div className="divide-y divide-border/50">
                    {cat.items.map((item) => {
                      const isCopied = copiedTag === item.tag;

                      return (
                        <div
                          key={item.tag}
                          className="p-2.5 hover:bg-muted/40 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-1.5 mb-1">
                            <span className="text-xs font-medium text-foreground leading-tight">
                              {item.label}
                            </span>
                            <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                              {onInsertTag && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1.5 text-[11px] text-primary hover:text-primary hover:bg-primary/10 gap-1 font-normal"
                                  onClick={(e) => handleInsert(item.tag, e)}
                                  title="Word kursoriga joylash"
                                >
                                  <Plus className="w-3 h-3" />
                                  Kiritish
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={(e) => handleCopy(item.tag, e)}
                                title="Nusxalash"
                              >
                                {isCopied ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1 mt-1">
                            <code className="text-[11px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded font-semibold select-all break-all">
                              {item.tag}
                            </code>
                          </div>

                          {item.sampleValue && (
                            <p className="text-[10px] text-muted-foreground mt-1 truncate">
                              Namuna: <span className="italic">{item.sampleValue}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
