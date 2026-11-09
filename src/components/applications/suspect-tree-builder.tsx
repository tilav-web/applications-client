import {
  Car,
  Check,
  Coins,
  CreditCard,
  Edit2,
  Hash,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Send,
  ShieldAlert,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { SuspectTreeNode } from '@/types/models';

interface SuspectTreeBuilderProps {
  value: SuspectTreeNode[] | null | undefined;
  onChange?: (newTree: SuspectTreeNode[]) => void;
  readOnly?: boolean;
}

const COMMON_PRESETS_ROOT = [
  { label: 'Telegram', color: 'text-sky-500 bg-sky-500/10 border-sky-500/30' },
  { label: 'Instagram', color: 'text-pink-500 bg-pink-500/10 border-pink-500/30' },
  { label: 'Telefon', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  { label: 'Shaxs (F.I.Sh)', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { label: 'Karta raqami', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30' },
  { label: 'Yashash manzili', color: 'text-teal-500 bg-teal-500/10 border-teal-500/30' },
  { label: 'Kripto-hamyon', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' },
  { label: 'Avtoraqam', color: 'text-orange-500 bg-orange-500/10 border-orange-500/30' },
];

const COMMON_PRESETS_CHILD = [
  'username',
  'bio',
  'telefon',
  'ID raqam',
  'havola (link)',
  'guruh / kanal',
  'f.i.sh',
  'pasport',
  'pinfl',
  'manzil',
  'avtomashina',
  'izoh',
];

function renderNodeIcon(label: string, className = 'w-3 h-3') {
  const l = (label || '').toLowerCase();
  if (l.includes('telegram') || l.includes('tg')) return <Send className={className} />;
  if (l.includes('instagram') || l.includes('insta'))
    return <MessageCircle className={className} />;
  if (l.includes('telefon') || l.includes('tel') || l.includes('phone') || l.includes('raqam'))
    return <Phone className={className} />;
  if (l.includes('shaxs') || l.includes('ism') || l.includes('f.i.sh') || l.includes('pasport'))
    return <User className={className} />;
  if (l.includes('karta') || l.includes('card')) return <CreditCard className={className} />;
  if (l.includes('manzil') || l.includes('joy') || l.includes('shahar') || l.includes('tuman'))
    return <MapPin className={className} />;
  if (l.includes('kripto') || l.includes('crypto') || l.includes('usdt') || l.includes('btc'))
    return <Coins className={className} />;
  if (l.includes('avto') || l.includes('mashina') || l.includes('raqam'))
    return <Car className={className} />;
  return <Hash className={className} />;
}

export function SuspectTreeBuilder({ value, onChange, readOnly = false }: SuspectTreeBuilderProps) {
  const tree: SuspectTreeNode[] = useMemo(() => value || [], [value]);

  // Dialog & Popover states
  const [activeAddParentId, setActiveAddParentId] = useState<string | null | 'ROOT'>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');

  const [editingNode, setEditingNode] = useState<{
    id: string;
    label: string;
    value?: string;
  } | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);

  // Helper: Count total nodes
  const totalCount = useMemo(() => {
    let count = 0;
    const walk = (nodes: SuspectTreeNode[]) => {
      for (const n of nodes) {
        count++;
        if (n.children && n.children.length > 0) walk(n.children);
      }
    };
    walk(tree);
    return count;
  }, [tree]);

  // Tree mutation functions
  const handleAddChild = (parentId: string | 'ROOT') => {
    if (!newLabel.trim()) return;

    const newNode: SuspectTreeNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label: newLabel.trim(),
      value: newValue.trim() || undefined,
      children: [],
    };

    if (parentId === 'ROOT') {
      const next = [...tree, newNode];
      onChange?.(next);
    } else {
      const recurse = (nodes: SuspectTreeNode[]): SuspectTreeNode[] => {
        return nodes.map((n) => {
          if (n.id === parentId) {
            return {
              ...n,
              children: [...(n.children || []), newNode],
            };
          }
          if (n.children && n.children.length > 0) {
            return {
              ...n,
              children: recurse(n.children),
            };
          }
          return n;
        });
      };
      onChange?.(recurse(tree));
    }

    setNewLabel('');
    setNewValue('');
    setActiveAddParentId(null);
  };

  const handleUpdateNode = () => {
    if (!editingNode || !editingNode.label.trim()) return;

    const recurse = (nodes: SuspectTreeNode[]): SuspectTreeNode[] => {
      return nodes.map((n) => {
        if (n.id === editingNode.id) {
          return {
            ...n,
            label: editingNode.label.trim(),
            value: editingNode.value?.trim() || undefined,
          };
        }
        if (n.children && n.children.length > 0) {
          return {
            ...n,
            children: recurse(n.children),
          };
        }
        return n;
      });
    };

    onChange?.(recurse(tree));
    setEditingNode(null);
  };

  const handleDeleteNode = (id: string) => {
    const recurse = (nodes: SuspectTreeNode[]): SuspectTreeNode[] => {
      return nodes
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          children: n.children ? recurse(n.children) : [],
        }));
    };

    onChange?.(recurse(tree));
    setNodeToDelete(null);
  };

  const handleClearAll = () => {
    onChange?.([]);
  };

  return (
    <div className="space-y-2.5">
      {/* Sarlavha & Boshqaruv paneli */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              Firibgar / Gumonlanuvchi ma'lumotlari daraxti
              {totalCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-mono">
                  {totalCount} ta shoxobcha
                </Badge>
              )}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Telegram, Instagram, Telefon, Username, Bio yoki boshqa istalgan belgilarni chapdan
              o‘ngga daraxt kabi qo‘shing
            </p>
          </div>
        </div>

        {!readOnly && totalCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 text-[11px] text-muted-foreground hover:text-red-500 gap-1 px-2"
          >
            <Trash2 className="h-3 w-3" />
            Daraxtni tozalash
          </Button>
        )}
      </div>

      {/* DARAХТ MAYDONI (Horizontal scrollable diagram) */}
      <div className="relative rounded-xl border border-border/80 bg-background/50 p-4 overflow-x-auto min-h-[140px] flex items-center">
        {/* Orqa fon nuqtalari */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        <div className="relative flex items-center gap-6 py-2">
          {/* 1. ILDIZ TUGUN (ROOT NODE) */}
          <div className="flex items-center shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border-2 border-red-500/40 text-foreground shadow-sm shadow-red-500/5 hover:border-red-500/70 transition-all">
              <div className="w-6 h-6 rounded-lg bg-red-500/15 text-red-500 flex items-center justify-center font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold uppercase tracking-wider block text-red-600 dark:text-red-400">
                  Firibgar / Gumonlanuvchi
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {tree.length === 0
                    ? 'Hali maʼlumot qo‘shilmagan'
                    : `${tree.length} ta asosiy yo‘nalish`}
                </span>
              </div>

              {!readOnly && (
                <Popover
                  open={activeAddParentId === 'ROOT'}
                  onOpenChange={(open: boolean) => {
                    setActiveAddParentId(open ? 'ROOT' : null);
                    if (open) {
                      setNewLabel('');
                      setNewValue('');
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="ml-2 h-6 w-6 rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
                      title="Yangi yo‘nalish qo‘shish (Telegram, Instagram, Telefon...)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3 z-50 shadow-2xl" align="start">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          Yangi tarmoq qo‘shish
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          1-bosqich
                        </Badge>
                      </div>

                      {/* Tezkor tavsiyalar */}
                      <div className="flex flex-wrap gap-1">
                        {COMMON_PRESETS_ROOT.map((p) => {
                          return (
                            <button
                              key={p.label}
                              type="button"
                              onClick={() => setNewLabel(p.label)}
                              className={cn(
                                'text-[11px] px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all hover:scale-105',
                                newLabel === p.label
                                  ? 'ring-2 ring-primary border-primary'
                                  : p.color,
                              )}
                            >
                              {renderNodeIcon(p.label, 'w-2.5 h-2.5')}
                              {p.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Kategoriya / Nomi:
                        </label>
                        <Input
                          placeholder="Masalan: Telegram, Instagram..."
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddChild('ROOT');
                            }
                          }}
                          className="h-8 text-xs font-semibold"
                          autoFocus
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Qiymat (ixtiyoriy):
                        </label>
                        <Input
                          placeholder="Masalan: @firibgar, +99890..."
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddChild('ROOT');
                            }
                          }}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setActiveAddParentId(null)}
                        >
                          Bekor qilish
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs font-semibold gap-1 bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => handleAddChild('ROOT')}
                          disabled={!newLabel.trim()}
                        >
                          <Plus className="w-3 h-3" />
                          Qo‘shish
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Rootdan o'ngga chiqadigan asosiy ulash chizig'i */}
            {tree.length > 0 && <div className="w-6 h-0.5 bg-border shrink-0" />}
          </div>

          {/* 2. CHEKSIZ REKURSIF DARAXT TUGUNLARI */}
          {tree.length > 0 ? (
            <div className="flex flex-col gap-3 shrink-0">
              {tree.map((node, index) => (
                <TreeNodeItem
                  key={node.id}
                  node={node}
                  isFirst={index === 0}
                  isLast={index === tree.length - 1}
                  totalSiblings={tree.length}
                  readOnly={readOnly}
                  activeAddParentId={activeAddParentId}
                  setActiveAddParentId={setActiveAddParentId}
                  newLabel={newLabel}
                  setNewLabel={setNewLabel}
                  newValue={newValue}
                  setNewValue={setNewValue}
                  onAddChild={handleAddChild}
                  onEditNode={(n) => setEditingNode(n)}
                  onDeleteNode={(id) => setNodeToDelete(id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground italic pl-2">
              <span>
                ← "<strong>+</strong>" tugmasini bosib, firibgarning dastlabki maʼlumotlarini
                daraxtga kiriting
              </span>
            </div>
          )}
        </div>
      </div>

      {/* TAHRIRLASH MODALI */}
      {editingNode && (
        <Popover
          open={!!editingNode}
          onOpenChange={(open: boolean) => !open && setEditingNode(null)}
        >
          <PopoverContent className="w-80 p-3 z-50 shadow-2xl" align="center">
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-foreground block">Tugunni tahrirlash</span>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Nomi / Maydon:
                </label>
                <Input
                  value={editingNode.label}
                  onChange={(e) => setEditingNode({ ...editingNode, label: e.target.value })}
                  className="h-8 text-xs font-semibold"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Qiymati (ixtiyoriy):
                </label>
                <Input
                  value={editingNode.value || ''}
                  onChange={(e) => setEditingNode({ ...editingNode, value: e.target.value })}
                  placeholder="Masalan: @nik, bio, telefon..."
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex justify-end gap-1.5 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setEditingNode(null)}
                >
                  Bekor qilish
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs font-semibold gap-1"
                  onClick={handleUpdateNode}
                  disabled={!editingNode.label.trim()}
                >
                  <Check className="w-3 h-3" />
                  Saqlash
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* O'CHIRISHNI TASDIQLASH */}
      <ConfirmDialog
        open={!!nodeToDelete}
        onOpenChange={(open) => !open && setNodeToDelete(null)}
        title="Shoxobchani o‘chirish"
        description="Ushbu maʼlumot va uning barcha ichki tarmoqlarini daraxtdan o‘chirmoqchimisiz?"
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        onConfirm={() => {
          if (nodeToDelete) handleDeleteNode(nodeToDelete);
        }}
      />
    </div>
  );
}

// ============================================================================
// REKURSIF DARAXT TUGUNI (TREE NODE ITEM)
// ============================================================================
interface TreeNodeItemProps {
  node: SuspectTreeNode;
  isFirst: boolean;
  isLast: boolean;
  totalSiblings: number;
  readOnly: boolean;
  activeAddParentId: string | null | 'ROOT';
  setActiveAddParentId: (id: string | null | 'ROOT') => void;
  newLabel: string;
  setNewLabel: (val: string) => void;
  newValue: string;
  setNewValue: (val: string) => void;
  onAddChild: (parentId: string) => void;
  onEditNode: (node: { id: string; label: string; value?: string }) => void;
  onDeleteNode: (id: string) => void;
}

function TreeNodeItem({
  node,
  isFirst,
  isLast,
  totalSiblings,
  readOnly,
  activeAddParentId,
  setActiveAddParentId,
  newLabel,
  setNewLabel,
  newValue,
  setNewValue,
  onAddChild,
  onEditNode,
  onDeleteNode,
}: TreeNodeItemProps) {
  const hasChildren = Boolean(node.children && node.children.length > 0);

  return (
    <div className="relative flex items-center gap-6">
      {/* Chap tomondagi ulovchi chiziq (Parentga ulanish) */}
      <div className="absolute -left-6 top-1/2 w-6 h-0.5 bg-border/80" />

      {/* Agar bir nechta tugun bo'lsa vertikal orqa ulovchi chiziq */}
      {totalSiblings > 1 && (
        <div
          className={cn(
            'absolute -left-6 w-0.5 bg-border/80',
            isFirst && 'top-1/2 bottom-0',
            isLast && 'top-0 bottom-1/2',
            !isFirst && !isLast && 'top-0 bottom-0',
          )}
        />
      )}

      {/* Tugun Karti */}
      <div
        className={cn(
          'group flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-lg border bg-card/90 hover:bg-card shadow-2xs transition-all shrink-0',
          node.value
            ? 'border-primary/40 hover:border-primary'
            : 'border-border/80 hover:border-foreground/40',
        )}
      >
        <div className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {renderNodeIcon(node.label, 'w-3 h-3')}
        </div>

        <div className="text-left leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">{node.label}</span>
            {node.value && (
              <>
                <span className="text-muted-foreground text-[10px]">→</span>
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded select-all">
                  {node.value}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Amallar: + (novda qo'shish), Edit, Delete */}
        {!readOnly && (
          <div className="flex items-center gap-0.5 ml-2 pl-1.5 border-l border-border/60">
            {/* "+" bolalar qo'shish */}
            <Popover
              open={activeAddParentId === node.id}
              onOpenChange={(open: boolean) => {
                setActiveAddParentId(open ? node.id : null);
                if (open) {
                  setNewLabel('');
                  setNewValue('');
                }
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-5 w-5 rounded hover:bg-primary/15 text-primary flex items-center justify-center transition-colors cursor-pointer"
                  title="Ichki tarmoq qo‘shish"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3 z-50 shadow-2xl" align="start">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      "{node.label}" ga yangi tarmoq
                    </span>
                  </div>

                  {/* Tavsiyalar */}
                  <div className="flex flex-wrap gap-1">
                    {COMMON_PRESETS_CHILD.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewLabel(p)}
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded border transition-all hover:bg-muted font-medium',
                          newLabel === p
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-muted/40 text-muted-foreground',
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Tarmoq nomi:
                    </label>
                    <Input
                      placeholder="Masalan: username, bio, telefon..."
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          onAddChild(node.id);
                        }
                      }}
                      className="h-8 text-xs font-semibold"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Qiymati (ixtiyoriy):
                    </label>
                    <Input
                      placeholder="Masalan: @tilav_web, Boylik sari olg‘a..."
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          onAddChild(node.id);
                        }
                      }}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setActiveAddParentId(null)}
                    >
                      Bekor qilish
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs font-semibold gap-1"
                      onClick={() => onAddChild(node.id)}
                      disabled={!newLabel.trim()}
                    >
                      <Plus className="w-3 h-3" />
                      Qo‘shish
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Qalamcha (Tahrirlash) */}
            <button
              type="button"
              onClick={() => onEditNode({ id: node.id, label: node.label, value: node.value })}
              className="h-5 w-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title="Tahrirlash"
            >
              <Edit2 className="w-2.5 h-2.5" />
            </button>

            {/* "x" (O'chirish) */}
            <button
              type="button"
              onClick={() => onDeleteNode(node.id)}
              className="h-5 w-5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
              title="O‘chirish"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* O'ngga ulovchi chiziq (Agar bolalari bo'lsa) */}
      {hasChildren && <div className="w-6 h-0.5 bg-border/80 shrink-0" />}

      {/* Bolalar (Children) rekursiyasi */}
      {hasChildren && (
        <div className="flex flex-col gap-3 shrink-0">
          {node.children!.map((child, idx) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              isFirst={idx === 0}
              isLast={idx === node.children!.length - 1}
              totalSiblings={node.children!.length}
              readOnly={readOnly}
              activeAddParentId={activeAddParentId}
              setActiveAddParentId={setActiveAddParentId}
              newLabel={newLabel}
              setNewLabel={setNewLabel}
              newValue={newValue}
              setNewValue={setNewValue}
              onAddChild={onAddChild}
              onEditNode={onEditNode}
              onDeleteNode={onDeleteNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
