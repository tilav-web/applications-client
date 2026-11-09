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
  if (l.includes('avto') || l.includes('mashina') || l.includes('avtoraqam'))
    return <Car className={className} />;
  return <Hash className={className} />;
}

// Vertikal ulovchi chiziq (Spine segment)
function SpineSegment({
  isFirst,
  isLast,
  singleItem,
}: {
  isFirst: boolean;
  isLast: boolean;
  singleItem: boolean;
}) {
  if (singleItem) return null;
  return (
    <div
      className={cn(
        'absolute left-0 w-[2px] bg-border/80 pointer-events-none',
        isFirst && 'top-1/2 bottom-0',
        isLast && 'top-0 bottom-1/2',
        !isFirst && !isLast && 'top-0 bottom-0',
      )}
    />
  );
}

export function SuspectTreeBuilder({ value, onChange, readOnly = false }: SuspectTreeBuilderProps) {
  const tree: SuspectTreeNode[] = useMemo(() => value || [], [value]);

  // Qaysi tugunda inline input ochiq: 'ROOT' yoki tugun ID si yoki null
  const [activeAddParentId, setActiveAddParentId] = useState<string | null | 'ROOT'>(null);
  const [inputText, setInputText] = useState<string>('');

  // Tahrirlash
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  // O'chirish
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);

  // Daraxtdagi barcha tugunlar soni
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

  // Yangi shoxobcha kiritishni boshlash
  const handleStartAdd = (parentId: string | 'ROOT') => {
    setActiveAddParentId(parentId);
    setInputText('');
    setEditingNodeId(null);
  };

  // Yangi tugunni saqlash
  const handleCommitAdd = (parentId: string | 'ROOT') => {
    const text = inputText.trim();
    if (!text) return;

    const newNode: SuspectTreeNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label: text,
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

    setInputText('');
    setActiveAddParentId(null);
  };

  const handleCancelAdd = () => {
    setActiveAddParentId(null);
    setInputText('');
  };

  // Tahrirlash
  const handleStartEdit = (node: SuspectTreeNode) => {
    setEditingNodeId(node.id);
    setEditText(node.label);
    setActiveAddParentId(null);
  };

  const handleCommitEdit = () => {
    const text = editText.trim();
    if (!editingNodeId || !text) return;

    const recurse = (nodes: SuspectTreeNode[]): SuspectTreeNode[] => {
      return nodes.map((n) => {
        if (n.id === editingNodeId) {
          return {
            ...n,
            label: text,
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

  // O'chirish
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

  // Asosiy ildizdagi barcha elementlar soni (daraxt elementlari + add line)
  const totalRootItems = tree.length + (readOnly ? 0 : 1);

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
              Firibgar maʼlumotlarini zanjir kabi shoxobchalarga bo‘lib kiriting (masalan: telegram
              → username → tilav_web, bio → pul topish)
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

      {/* DARAХТ CHIZIQLARI MAYDONI (Qizil boksiz, to'liq toza chiziqli) */}
      <div className="relative rounded-lg border border-border/80 bg-card/30 p-4 overflow-x-auto min-h-[90px] flex items-center">
        {/* Yengil panjara foni */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        />

        <div className="relative flex items-center py-2">
          {/* ASOSIY DARAХТ TARMOG'I (ROOT LEVEL) */}
          <div className="relative flex flex-col justify-center shrink-0">
            {tree.map((node, index) => (
              <SimpleTreeLineNode
                key={node.id}
                node={node}
                isFirst={index === 0}
                isLast={readOnly && index === tree.length - 1}
                singleItem={totalRootItems === 1}
                readOnly={readOnly}
                activeAddParentId={activeAddParentId}
                inputText={inputText}
                setInputText={setInputText}
                onStartAdd={handleStartAdd}
                onCommitAdd={handleCommitAdd}
                onCancelAdd={handleCancelAdd}
                editingNodeId={editingNodeId}
                editText={editText}
                setEditText={setEditText}
                onStartEdit={handleStartEdit}
                onCommitEdit={handleCommitEdit}
                onCancelEdit={handleCancelEdit}
                onDeleteNode={(id) => setNodeToDelete(id)}
              />
            ))}

            {/* ILDIZGA YANGI ASOSIY TARMOQ QO'SHISH (----------------------------------+) */}
            {!readOnly && (
              <div className="relative flex items-center shrink-0 py-1.5 pl-6">
                {/* Chap tomondagi ulovchi gorizontal chiziq */}
                <div className="absolute left-0 top-1/2 w-6 h-[2px] bg-border/80 pointer-events-none" />

                {/* Vertikal ulovchi orqa chiziq segmenti */}
                <SpineSegment
                  isFirst={tree.length === 0}
                  isLast={true}
                  singleItem={totalRootItems === 1}
                />

                {activeAddParentId === 'ROOT' ? (
                  <SimpleLineInput
                    value={inputText}
                    setValue={setInputText}
                    placeholder="Masalan: telegram, telefon, karta..."
                    onCommit={() => handleCommitAdd('ROOT')}
                    onCancel={handleCancelAdd}
                  />
                ) : (
                  <SimpleDashedAddLine
                    label={tree.length === 0 ? 'Yozish uchun bosing' : 'Yangi tarmoq'}
                    onClick={() => handleStartAdd('ROOT')}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* O'CHIRISHNI TASDIQLASH */}
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
// ODDIY CHIZIQLI DARAXT TUGUNI (SIMPLE TREE LINE NODE)
// ============================================================================
interface SimpleTreeLineNodeProps {
  node: SuspectTreeNode;
  isFirst: boolean;
  isLast: boolean;
  singleItem: boolean;
  readOnly: boolean;
  activeAddParentId: string | null | 'ROOT';
  inputText: string;
  setInputText: (val: string) => void;
  onStartAdd: (parentId: string) => void;
  onCommitAdd: (parentId: string) => void;
  onCancelAdd: () => void;
  editingNodeId: string | null;
  editText: string;
  setEditText: (val: string) => void;
  onStartEdit: (node: SuspectTreeNode) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDeleteNode: (id: string) => void;
}

function SimpleTreeLineNode({
  node,
  isFirst,
  isLast,
  singleItem,
  readOnly,
  activeAddParentId,
  inputText,
  setInputText,
  onStartAdd,
  onCommitAdd,
  onCancelAdd,
  editingNodeId,
  editText,
  setEditText,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onDeleteNode,
}: SimpleTreeLineNodeProps) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isAddingChildHere = activeAddParentId === node.id;
  const isEditingThis = editingNodeId === node.id;

  // Bolalar soni (mavjud bolalar + qo'shish qatori)
  const totalChildItems = (node.children?.length || 0) + (readOnly ? 0 : 1);

  return (
    <div className="relative flex items-center shrink-0 py-1.5 pl-6">
      {/* Chap tomondagi gorizontal ulovchi chiziq (Spinedan tugun pillga keladi) */}
      <div className="absolute left-0 top-1/2 w-6 h-[2px] bg-border/80 pointer-events-none" />

      {/* Vertikal ulovchi orqa chiziq segmenti */}
      <SpineSegment isFirst={isFirst} isLast={isLast} singleItem={singleItem} />

      {/* TUGUN YOZUVI (CHIZIQDA) */}
      <div className="group relative flex items-center shrink-0">
        {isEditingThis ? (
          /* TAHRIRLASH INPUTI */
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-primary bg-background shadow-xs">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCommitEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="h-6 text-xs font-semibold bg-transparent border-0 border-b border-primary/50 focus:outline-none min-w-[120px] text-foreground"
              autoFocus
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
          /* ODDIY CHIZIQDAGI MATN */
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/80 hover:border-primary/50 bg-background hover:bg-muted/50 text-foreground transition-all shadow-2xs select-none">
            <span className="text-primary/70 shrink-0">
              {renderNodeIcon(node.label, 'w-3 h-3')}
            </span>
            <span className="text-xs font-semibold">{node.label}</span>

            {node.value && (
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded select-all">
                {node.value}
              </span>
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

        {/* O'ngga chiquvchi gorizontal chiziq */}
        {!hasChildren && !isAddingChildHere ? (
          /* Bolasi yo'q bo'lsa: o'ng tomonga chiziq va [+] tugmasi */
          !readOnly && (
            <div className="flex items-center">
              <div className="w-6 h-[2px] bg-border/80" />
              <button
                type="button"
                onClick={() => onStartAdd(node.id)}
                className="h-4.5 w-4.5 rounded-full border border-dashed border-muted-foreground/60 hover:border-primary hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground transition-all cursor-pointer shadow-2xs"
                title="Ichki tarmoq qo‘shish (+)"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          )
        ) : (
          /* Bolasi bo'lsa: bolalar konteyneriga ulovchi bitta toza chiziq */
          <div className="w-6 h-[2px] bg-border/80 shrink-0" />
        )}
      </div>

      {/* BOLALAR TARMOQLARI (RECURSION) */}
      {(hasChildren || isAddingChildHere) && (
        <div className="relative flex flex-col justify-center shrink-0">
          {node.children?.map((child, idx) => (
            <SimpleTreeLineNode
              key={child.id}
              node={child}
              isFirst={idx === 0}
              isLast={readOnly && idx === node.children!.length - 1}
              singleItem={totalChildItems === 1}
              readOnly={readOnly}
              activeAddParentId={activeAddParentId}
              inputText={inputText}
              setInputText={setInputText}
              onStartAdd={onStartAdd}
              onCommitAdd={onCommitAdd}
              onCancelAdd={onCancelAdd}
              editingNodeId={editingNodeId}
              editText={editText}
              setEditText={setEditText}
              onStartEdit={onStartEdit}
              onCommitEdit={onCommitEdit}
              onCancelEdit={onCancelEdit}
              onDeleteNode={onDeleteNode}
            />
          ))}

          {/* YANGI ICHKI SHОХOBCHA QO'SHISH (----------------------------------+) */}
          {!readOnly && (
            <div className="relative flex items-center shrink-0 py-1.5 pl-6">
              {/* Chap tomondagi ulovchi gorizontal chiziq */}
              <div className="absolute left-0 top-1/2 w-6 h-[2px] bg-border/80 pointer-events-none" />

              {/* Vertikal ulovchi orqa chiziq segmenti */}
              <SpineSegment
                isFirst={(node.children?.length || 0) === 0}
                isLast={true}
                singleItem={totalChildItems === 1}
              />

              {isAddingChildHere ? (
                <SimpleLineInput
                  value={inputText}
                  setValue={setInputText}
                  placeholder="Yozing va Enter bosing..."
                  onCommit={() => onCommitAdd(node.id)}
                  onCancel={onCancelAdd}
                />
              ) : (
                <SimpleDashedAddLine label="Qo‘shish" onClick={() => onStartAdd(node.id)} compact />
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
function SimpleDashedAddLine({
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
        compact ? 'min-w-[90px]' : 'min-w-[140px]',
      )}
      title="Yozish uchun bosing"
    >
      <div className="flex-1 border-b-2 border-dashed border-border/70 group-hover:border-primary/70 transition-colors w-12" />

      <div className="h-4.5 w-4.5 rounded-full border border-dashed border-muted-foreground/60 group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-muted-foreground transition-all shrink-0">
        <Plus className="w-2.5 h-2.5" />
      </div>

      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors select-none">
        {label}
      </span>
    </button>
  );
}

// ============================================================================
// SHUNCHAKI CHIZIQNING O'ZIGA BIRLASHGAN ODDIY INPUT
// ============================================================================
function SimpleLineInput({
  value,
  setValue,
  placeholder,
  onCommit,
  onCancel,
}: {
  value: string;
  setValue: (val: string) => void;
  placeholder: string;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const canCommit = value.trim().length > 0;

  return (
    <div className="flex items-center gap-1 py-0.5 animate-in fade-in slide-in-from-left-2 duration-100">
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
        className="h-6.5 text-xs font-semibold bg-transparent border-0 border-b-2 border-primary focus:outline-none px-1 w-44 md:w-56 text-foreground placeholder:text-muted-foreground/50 placeholder:font-normal"
        autoFocus
      />

      <button
        type="button"
        onClick={onCommit}
        disabled={!canCommit}
        className="h-5.5 px-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-40 shrink-0"
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
  );
}
