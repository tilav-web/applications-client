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
import { cn } from '@/lib/utils';
import type { SuspectTreeNode } from '@/types/models';

interface SuspectTreeBuilderProps {
  value: SuspectTreeNode[] | null | undefined;
  onChange?: (newTree: SuspectTreeNode[]) => void;
  readOnly?: boolean;
}

const ROOT_PRESET_CATEGORIES = [
  'Telegram',
  'Instagram',
  'Telefon',
  'Karta raqami',
  'Shaxs (F.I.Sh)',
  'Yashash manzili',
  'Kripto-hamyon',
  'Avtoraqam',
  'Boshqa',
];

const CHILD_PRESET_CATEGORIES = [
  'username',
  'bio',
  'telefon',
  'ID raqam',
  'havola (link)',
  'guruh / kanal',
  'f.i.sh',
  'pasport',
  'pinfl',
  'karta',
  'manzil',
  'izoh',
];

function renderNodeIcon(label: string, className = 'w-3.5 h-3.5') {
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
  if (l.includes('avto') || l.includes('mashina') || l.includes('avtoraqam'))
    return <Car className={className} />;
  return <Hash className={className} />;
}

export function SuspectTreeBuilder({ value, onChange, readOnly = false }: SuspectTreeBuilderProps) {
  const tree: SuspectTreeNode[] = useMemo(() => value || [], [value]);

  // Qaysi ota-tugunda yangi shoxobcha (inline input) ochiq: 'ROOT' yoki tugun ID si yoki null
  const [activeAddParentId, setActiveAddParentId] = useState<string | null | 'ROOT'>(null);
  const [addCategory, setAddCategory] = useState<string>('Telegram');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [addValue, setAddValue] = useState<string>('');

  // Tahrirlash holati
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');

  // O'chirish holati
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);

  // Daraxtdagi barcha tugunlar sonini hisoblash
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

  // Yangi shoxobcha qo'shishni boshlash
  const handleStartAdd = (parentId: string | 'ROOT', defaultPreset?: string) => {
    setActiveAddParentId(parentId);
    const initialCategory = defaultPreset || (parentId === 'ROOT' ? 'Telegram' : 'username');
    setAddCategory(initialCategory);
    setCustomCategory('');
    setAddValue('');
    setEditingNodeId(null);
  };

  // Yangi tugunni saqlash (Enter bosilganda yoki Saqlash tugmasida)
  const handleCommitAdd = (parentId: string | 'ROOT') => {
    const finalLabel = addCategory === 'CUSTOM' ? customCategory.trim() : addCategory.trim();
    if (!finalLabel) return;

    const newNode: SuspectTreeNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label: finalLabel,
      value: addValue.trim() || undefined,
      children: [],
    };

    if (parentId === 'ROOT') {
      onChange?.([...tree, newNode]);
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

    setActiveAddParentId(null);
    setAddValue('');
    setCustomCategory('');
  };

  const handleCancelAdd = () => {
    setActiveAddParentId(null);
    setAddValue('');
    setCustomCategory('');
  };

  // Tugunni tahrirlash
  const handleStartEdit = (node: SuspectTreeNode) => {
    setEditingNodeId(node.id);
    setEditLabel(node.label);
    setEditValue(node.value || '');
    setActiveAddParentId(null);
  };

  const handleCommitEdit = () => {
    if (!editingNodeId || !editLabel.trim()) return;

    const recurse = (nodes: SuspectTreeNode[]): SuspectTreeNode[] => {
      return nodes.map((n) => {
        if (n.id === editingNodeId) {
          return {
            ...n,
            label: editLabel.trim(),
            value: editValue.trim() || undefined,
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
    setEditingNodeId(null);
  };

  const handleCancelEdit = () => {
    setEditingNodeId(null);
  };

  // Tugunni o'chirish
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
    <div className="space-y-2">
      {/* Sarlavha & Yordamchi panel */}
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              2.1. Firibgar / Gumonlanuvchi ma'lumotlari daraxti
              {totalCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-mono">
                  {totalCount} ta belgi
                </Badge>
              )}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Chiziqlar bo‘ylab firibgarga tegishli nik, telefon, karta va boshqa ixtiyoriy
              belgilarni daraxt ko‘rinishida kiriting
            </p>
          </div>
        </div>

        {!readOnly && totalCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-6 text-[11px] text-muted-foreground hover:text-red-500 gap-1 px-2"
          >
            <Trash2 className="h-3 w-3" />
            Tozalash
          </Button>
        )}
      </div>

      {/* DARAХТ CHIZIQLARI MAYDONI (Line-based Decision Tree) */}
      <div className="relative rounded-lg border border-border/80 bg-card/40 p-3 overflow-x-auto min-h-[110px] flex items-center">
        {/* Orqa fon juda yengil panjarasi */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        />

        <div className="relative flex items-center py-1">
          {/* 1. ASOSIY ILDIZ (ROOT) */}
          <div className="flex items-center shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 shadow-2xs">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Firibgar / Gumonlanuvchi
              </span>
            </div>

            {/* Ildizdan chiquvchi asosiy gorizontal chiziq */}
            <div className="w-6 h-[2px] bg-red-400/50 shrink-0" />
          </div>

          {/* 2. ILDIZ TARMOQLARI (CHILDREN VA QO'SHISH CHIZIG'I) */}
          <div className="relative flex flex-col justify-center shrink-0">
            {/* Agar ildizda tugunlar bo'lsa ularni chizamiz */}
            {tree.map((node, index) => (
              <TreeLineNodeItem
                key={node.id}
                node={node}
                isFirst={index === 0}
                isLast={index === tree.length - 1 && activeAddParentId !== 'ROOT'}
                totalSiblings={tree.length + (activeAddParentId === 'ROOT' ? 1 : 0)}
                readOnly={readOnly}
                activeAddParentId={activeAddParentId}
                addCategory={addCategory}
                setAddCategory={setAddCategory}
                customCategory={customCategory}
                setCustomCategory={setCustomCategory}
                addValue={addValue}
                setAddValue={setAddValue}
                onStartAdd={handleStartAdd}
                onCommitAdd={handleCommitAdd}
                onCancelAdd={handleCancelAdd}
                editingNodeId={editingNodeId}
                editLabel={editLabel}
                setEditLabel={setEditLabel}
                editValue={editValue}
                setEditValue={setEditValue}
                onStartEdit={handleStartEdit}
                onCommitEdit={handleCommitEdit}
                onCancelEdit={handleCancelEdit}
                onDeleteNode={(id) => setNodeToDelete(id)}
              />
            ))}

            {/* ILDIZGA YANGI MA'LUMOT QO'SHISH CHIZIG'I (----------------------------------+) */}
            {!readOnly && (
              <div className="relative flex items-center shrink-0 py-1">
                {/* Chap tomondagi ulovchi chiziq */}
                <div className="absolute -left-6 top-1/2 w-6 h-[2px] bg-border/80" />

                {/* Vertikal orqa ulovchi chiziq agar avvalgi tugunlar bo'lsa */}
                {tree.length > 0 && (
                  <div className="absolute -left-6 top-0 bottom-1/2 w-[2px] bg-border/80" />
                )}

                {activeAddParentId === 'ROOT' ? (
                  /* CHIZIQ INPUTGA AYLANISHI (SEAMLESS INLINE INPUT) */
                  <InlineLineInput
                    categories={ROOT_PRESET_CATEGORIES}
                    category={addCategory}
                    setCategory={setAddCategory}
                    customCategory={customCategory}
                    setCustomCategory={setCustomCategory}
                    value={addValue}
                    setValue={setAddValue}
                    placeholder="Masalan: @nik, +99890..., 8600..."
                    onCommit={() => handleCommitAdd('ROOT')}
                    onCancel={handleCancelAdd}
                  />
                ) : (
                  /* ----------------------------------+ CHIZIQLI TUGMA */
                  <DashedAddLine
                    label={
                      tree.length === 0 ? "Yangi ma'lumot kiritish" : 'Yana yo‘nalish qo‘shish'
                    }
                    onClick={() => handleStartAdd('ROOT')}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* O'CHIRISHNI TASDIQLASH DIALOGI */}
      <ConfirmDialog
        open={!!nodeToDelete}
        onOpenChange={(open) => !open && setNodeToDelete(null)}
        title="Belgini o‘chirish"
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
// CHIZIQLI DARAXT TUGUNI (TREE LINE NODE ITEM)
// ============================================================================
interface TreeLineNodeItemProps {
  node: SuspectTreeNode;
  isFirst: boolean;
  isLast: boolean;
  totalSiblings: number;
  readOnly: boolean;
  activeAddParentId: string | null | 'ROOT';
  addCategory: string;
  setAddCategory: (val: string) => void;
  customCategory: string;
  setCustomCategory: (val: string) => void;
  addValue: string;
  setAddValue: (val: string) => void;
  onStartAdd: (parentId: string, defaultPreset?: string) => void;
  onCommitAdd: (parentId: string) => void;
  onCancelAdd: () => void;
  editingNodeId: string | null;
  editLabel: string;
  setEditLabel: (val: string) => void;
  editValue: string;
  setEditValue: (val: string) => void;
  onStartEdit: (node: SuspectTreeNode) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDeleteNode: (id: string) => void;
}

function TreeLineNodeItem({
  node,
  isFirst,
  isLast,
  totalSiblings,
  readOnly,
  activeAddParentId,
  addCategory,
  setAddCategory,
  customCategory,
  setCustomCategory,
  addValue,
  setAddValue,
  onStartAdd,
  onCommitAdd,
  onCancelAdd,
  editingNodeId,
  editLabel,
  setEditLabel,
  editValue,
  setEditValue,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onDeleteNode,
}: TreeLineNodeItemProps) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isAddingChildHere = activeAddParentId === node.id;
  const isEditingThis = editingNodeId === node.id;

  return (
    <div className="relative flex items-center shrink-0 py-1">
      {/* Chap tomondagi ulovchi chiziq (Parentdan keluvchi horizontal connector) */}
      <div className="absolute -left-6 top-1/2 w-6 h-[2px] bg-border/80" />

      {/* Vertikal orqa ulovchi chiziq (Spine) */}
      {totalSiblings > 1 && (
        <div
          className={cn(
            'absolute -left-6 w-[2px] bg-border/80',
            isFirst && 'top-1/2 bottom-0',
            isLast && 'top-0 bottom-1/2',
            !isFirst && !isLast && 'top-0 bottom-0',
          )}
        />
      )}

      {/* TUGUN ELEMENTI (CHIZIQLI, KARTASIZ) */}
      <div className="group relative flex items-center shrink-0">
        {isEditingThis ? (
          /* INLINE EDIT REJIMI */
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-primary bg-background shadow-xs">
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="h-6 text-xs font-semibold bg-transparent border-0 border-b border-primary/50 focus:outline-none w-20 text-foreground"
              placeholder="Nomi..."
              autoFocus
            />
            <span className="text-muted-foreground text-xs font-bold">:</span>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCommitEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="h-6 text-xs font-mono font-bold bg-transparent border-0 border-b border-primary/50 focus:outline-none min-w-[120px] text-primary"
              placeholder="Qiymat..."
            />
            <button
              type="button"
              onClick={onCommitEdit}
              className="h-5 w-5 rounded bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center cursor-pointer ml-1"
              title="Saqlash (Enter)"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="h-5 w-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              title="Bekor qilish (Esc)"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          /* ODDY KO'RINISH: Chiziqdagi yorliq va qiymat */
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all select-none',
              node.value
                ? 'bg-background hover:bg-muted/50 border-border/80 hover:border-primary/50 text-foreground shadow-2xs'
                : 'bg-muted/40 hover:bg-muted border-border/60 text-foreground',
            )}
          >
            <span className="text-primary shrink-0">{renderNodeIcon(node.label, 'w-3 h-3')}</span>
            <span className="text-xs font-semibold">{node.label}</span>

            {node.value && (
              <>
                <span className="text-muted-foreground text-[10px] font-bold">:</span>
                <span className="text-xs font-mono font-bold text-primary px-1.5 py-0.2 rounded bg-primary/10 select-all">
                  {node.value}
                </span>
              </>
            )}

            {!readOnly && (
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-1 pl-1 border-l border-border/60 transition-opacity">
                <button
                  type="button"
                  onClick={() => onStartEdit(node)}
                  className="h-4 w-4 rounded hover:bg-primary/15 text-muted-foreground hover:text-primary flex items-center justify-center cursor-pointer transition-colors"
                  title="Tahrirlash"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteNode(node.id)}
                  className="h-4 w-4 rounded hover:bg-red-500/15 text-muted-foreground hover:text-red-500 flex items-center justify-center cursor-pointer transition-colors"
                  title="O‘chirish"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* O'ng tomonga chiquvchi chiziq (Horizontal continuation line) */}
        {!hasChildren && !isAddingChildHere ? (
          /* Bolasi yo'q bo'lsa: ----------------------------------+ chizig'i */
          !readOnly && (
            <div className="flex items-center">
              <div className="w-6 h-[2px] bg-border/80" />
              <button
                type="button"
                onClick={() => onStartAdd(node.id)}
                className="h-4.5 w-4.5 rounded-full border border-dashed border-muted-foreground/60 hover:border-primary hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground transition-all cursor-pointer shadow-2xs"
                title="Ichki tarmoq qo‘shish"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          )
        ) : (
          /* Bolasi bo'lsa yoki qo'shilayotgan bo'lsa: ulovchi chiziq */
          <div className="w-6 h-[2px] bg-border/80 shrink-0" />
        )}
      </div>

      {/* BOLALAR VA YANGI ICHKI TARMOQ CHIZIG'I (RECURSIVE CHILDREN) */}
      {(hasChildren || isAddingChildHere) && (
        <div className="relative flex flex-col justify-center shrink-0">
          {node.children?.map((child, idx) => (
            <TreeLineNodeItem
              key={child.id}
              node={child}
              isFirst={idx === 0}
              isLast={idx === node.children!.length - 1 && !isAddingChildHere}
              totalSiblings={node.children!.length + (isAddingChildHere ? 1 : 0)}
              readOnly={readOnly}
              activeAddParentId={activeAddParentId}
              addCategory={addCategory}
              setAddCategory={setAddCategory}
              customCategory={customCategory}
              setCustomCategory={setCustomCategory}
              addValue={addValue}
              setAddValue={setAddValue}
              onStartAdd={onStartAdd}
              onCommitAdd={onCommitAdd}
              onCancelAdd={onCancelAdd}
              editingNodeId={editingNodeId}
              editLabel={editLabel}
              setEditLabel={setEditLabel}
              editValue={editValue}
              setEditValue={setEditValue}
              onStartEdit={onStartEdit}
              onCommitEdit={onCommitEdit}
              onCancelEdit={onCancelEdit}
              onDeleteNode={onDeleteNode}
            />
          ))}

          {/* YANGI ICHKI SHОХOBCHA CHIZIG'I (----------------------------------+) */}
          {!readOnly && (
            <div className="relative flex items-center shrink-0 py-1">
              <div className="absolute -left-6 top-1/2 w-6 h-[2px] bg-border/80" />
              {hasChildren && (
                <div className="absolute -left-6 top-0 bottom-1/2 w-[2px] bg-border/80" />
              )}

              {isAddingChildHere ? (
                <InlineLineInput
                  categories={CHILD_PRESET_CATEGORIES}
                  category={addCategory}
                  setCategory={setAddCategory}
                  customCategory={customCategory}
                  setCustomCategory={setCustomCategory}
                  value={addValue}
                  setValue={setAddValue}
                  placeholder="Masalan: username, bio, telefon..."
                  onCommit={() => onCommitAdd(node.id)}
                  onCancel={onCancelAdd}
                />
              ) : (
                <DashedAddLine
                  label="Ichki belgi qo‘shish"
                  onClick={() => onStartAdd(node.id)}
                  compact
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DASHED CHIZIQLI TUGMA: ----------------------------------+
// ============================================================================
function DashedAddLine({
  label,
  onClick,
  compact = false,
}: {
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-1.5 py-1 px-1 transition-all cursor-pointer text-left',
        compact ? 'min-w-[120px]' : 'min-w-[160px]',
      )}
      title="Yozish uchun bosing"
    >
      {/* Uzun chiziqchalar ------------------------ */}
      <div className="flex-1 border-b-2 border-dashed border-border/70 group-hover:border-primary/70 transition-colors w-16" />

      {/* Chiziq oxiridagi [+] belgisi */}
      <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/60 group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-muted-foreground transition-all shrink-0">
        <Plus className="w-3 h-3" />
      </div>

      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors select-none">
        {label}
      </span>
    </button>
  );
}

// ============================================================================
// CHIZIQNING O'ZIGA BIRLASHIB KETGAN INLINE INPUT (SEAMLESS INLINE INPUT)
// ============================================================================
function InlineLineInput({
  categories,
  category,
  setCategory,
  customCategory,
  setCustomCategory,
  value,
  setValue,
  placeholder,
  onCommit,
  onCancel,
}: {
  categories: string[];
  category: string;
  setCategory: (val: string) => void;
  customCategory: string;
  setCustomCategory: (val: string) => void;
  value: string;
  setValue: (val: string) => void;
  placeholder: string;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const isCustom = category === 'CUSTOM';
  const effectiveLabel = isCustom ? customCategory : category;
  const canCommit = effectiveLabel.trim().length > 0;

  return (
    <div className="flex flex-col gap-1 py-1 px-1 bg-background/90 rounded border border-primary/40 shadow-xs animate-in fade-in slide-in-from-left-2 duration-150">
      {/* 1. Asosiy Chiziqli Qator: [ Kategoriya ▼ ] : [ Qiymat ------------------ ] [✓] [✕] */}
      <div className="flex items-center gap-1.5">
        {/* Kategoriya selektori */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-6 text-xs font-semibold px-1.5 rounded bg-primary/10 text-primary border-0 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="CUSTOM">+ Boshqa...</option>
        </select>

        {isCustom && (
          <input
            type="text"
            placeholder="Nomi..."
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            className="h-6 text-xs font-semibold bg-transparent border-0 border-b-2 border-primary focus:outline-none px-1 w-24 text-foreground"
            autoFocus
          />
        )}

        <span className="text-muted-foreground text-xs font-bold">:</span>

        {/* Chiziqqa to'liq birlashgan qiymat kiritish maydoni */}
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (canCommit) onCommit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          className="h-6 text-xs font-mono font-medium bg-transparent border-0 border-b-2 border-primary focus:outline-none px-1 w-44 md:w-56 text-foreground placeholder:text-muted-foreground/60 placeholder:font-sans"
          autoFocus={!isCustom}
        />

        {/* Saqlash va Bekor qilish tugmalari */}
        <button
          type="button"
          onClick={onCommit}
          disabled={!canCommit}
          className="h-5.5 px-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 shrink-0"
          title="Saqlash (Enter)"
        >
          <Check className="w-3 h-3" />
          <span>Saqlash</span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="h-5.5 w-5.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors shrink-0"
          title="Bekor qilish (Esc)"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* 2. Tezkor tavsiya toifalari (Chiplar) */}
      <div className="flex items-center gap-1 flex-wrap pt-0.5">
        <span className="text-[10px] text-muted-foreground font-medium">Tezkor:</span>
        {categories.slice(0, 7).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              'text-[10px] px-1.5 py-0.2 rounded border transition-all cursor-pointer',
              category === c
                ? 'bg-primary text-primary-foreground border-primary font-bold'
                : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60',
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
