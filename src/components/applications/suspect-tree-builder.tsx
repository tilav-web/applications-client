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

interface ActiveAddState {
  type: 'child' | 'sibling';
  targetId: string;
  parentId: string | 'ROOT';
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

// Vertikal magistral (spine) segmenti
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

  // Bo'sh daraxt uchun birinchi elementni qo'shish holati
  const [isAddingInitial, setIsAddingInitial] = useState(false);

  // Faol yangi shoxobcha qo'shish (child yoki sibling)
  const [activeAdd, setActiveAdd] = useState<ActiveAddState | null>(null);
  const [addText, setAddText] = useState<string>('');

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

  // 1. Dastlabki birinchi elementni saqlash (daraxt bo'sh bo'lganda)
  const handleCommitInitial = () => {
    const text = addText.trim();
    if (!text) return;

    const newNode: SuspectTreeNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label: text,
      children: [],
    };

    onChange?.([newNode]);
    setAddText('');
    setIsAddingInitial(false);
  };

  // 2. Bola (Child / o'ngga) qo'shishni boshlash
  const handleStartAddChild = (nodeId: string, parentId: string | 'ROOT') => {
    setActiveAdd({ type: 'child', targetId: nodeId, parentId });
    setAddText('');
    setEditingNodeId(null);
  };

  // 3. Ildizdosh (Sibling / pastga) qo'shishni boshlash
  const handleStartAddSibling = (targetId: string, parentId: string | 'ROOT') => {
    setActiveAdd({ type: 'sibling', targetId, parentId });
    setAddText('');
    setEditingNodeId(null);
  };

  // 4. Qo'shishni bekor qilish
  const handleCancelAdd = () => {
    setActiveAdd(null);
    setAddText('');
  };

  // 5. Yangi qo'shilgan tugunni saqlash
  const handleCommitAdd = () => {
    const text = addText.trim();
    if (!text || !activeAdd) return;

    const newNode: SuspectTreeNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label: text,
      children: [],
    };

    if (activeAdd.type === 'child') {
      // activeAdd.targetId ning bolalari ro'yxatiga qo'shish
      const recurse = (nodes: SuspectTreeNode[]): SuspectTreeNode[] => {
        return nodes.map((n) => {
          if (n.id === activeAdd.targetId) {
            return {
              ...n,
              children: [...(n.children || []), newNode],
            };
          }
          if (n.children && n.children.length > 0) {
            return { ...n, children: recurse(n.children) };
          }
          return n;
        });
      };
      onChange?.(recurse(tree));
    } else if (activeAdd.type === 'sibling') {
      // activeAdd.targetId dan keyin o'sha darajaga joylashtirish
      if (activeAdd.parentId === 'ROOT') {
        const idx = tree.findIndex((n) => n.id === activeAdd.targetId);
        const next = [...tree];
        if (idx !== -1) {
          next.splice(idx + 1, 0, newNode);
        } else {
          next.push(newNode);
        }
        onChange?.(next);
      } else {
        const recurse = (nodes: SuspectTreeNode[]): SuspectTreeNode[] => {
          return nodes.map((n) => {
            if (n.id === activeAdd.parentId) {
              const children = [...(n.children || [])];
              const idx = children.findIndex((c) => c.id === activeAdd.targetId);
              if (idx !== -1) {
                children.splice(idx + 1, 0, newNode);
              } else {
                children.push(newNode);
              }
              return { ...n, children };
            }
            if (n.children && n.children.length > 0) {
              return { ...n, children: recurse(n.children) };
            }
            return n;
          });
        };
        onChange?.(recurse(tree));
      }
    }

    setActiveAdd(null);
    setAddText('');
  };

  // 6. Tahrirlash
  const handleStartEdit = (node: SuspectTreeNode) => {
    setEditingNodeId(node.id);
    setEditText(node.label);
    setActiveAdd(null);
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

  // 7. O'chirish
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
      {/* Sarlavha & Boshqaruv paneli */}
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            2.1. Firibgar / Gumonlanuvchi ma'lumotlari daraxti
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-mono">
                {totalCount} ta belgi
              </Badge>
            )}
          </h4>
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

      {/* DARAХТ CHIZIQLARI MAYDONI */}
      <div className="relative rounded-lg border border-border/80 bg-card/30 p-4 overflow-x-auto min-h-[90px] flex items-center">
        {/* Yengil fon panjarasi */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        />

        {tree.length === 0 ? (
          /* BO'SH HOLAT: Dastlabki birinchi ma'lumotni kiritish (chapda keraksiz chiziqsiz) */
          !readOnly && (
            <div className="py-2">
              {isAddingInitial ? (
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg border border-primary bg-background shadow-xs animate-in fade-in duration-100">
                  <input
                    type="text"
                    placeholder="Masalan: telegram, telefon, karta..."
                    value={addText}
                    onChange={(e) => setAddText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCommitInitial();
                      if (e.key === 'Escape') setIsAddingInitial(false);
                    }}
                    className="h-7 text-xs font-semibold bg-transparent border-0 border-b-2 border-primary focus:outline-none px-2 w-56 text-foreground"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCommitInitial}
                    disabled={!addText.trim()}
                    className="h-6 px-2.5 rounded bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-40"
                  >
                    <Check className="w-3 h-3" />
                    <span>Qo‘shish</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingInitial(false)}
                    className="h-6 w-6 rounded hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingInitial(true);
                    setAddText('');
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 text-primary text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:scale-[1.01]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Daraxtga birinchi maʼlumotni kiritish</span>
                </button>
              )}
            </div>
          )
        ) : (
          /* MAVJUD DARAХТ (ROOT LEVEL) */
          <div className="relative flex items-center py-2">
            <TreeLevelBranch
              nodes={tree}
              parentId="ROOT"
              readOnly={readOnly}
              activeAdd={activeAdd}
              addText={addText}
              setAddText={setAddText}
              onStartAddChild={handleStartAddChild}
              onStartAddSibling={handleStartAddSibling}
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
          </div>
        )}
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
// BIR DARAJADAGI ELEMENTLAR RO'YXATI (TREE LEVEL BRANCH)
// ============================================================================
interface TreeLevelBranchProps {
  nodes: SuspectTreeNode[];
  parentId: string | 'ROOT';
  readOnly: boolean;
  activeAdd: ActiveAddState | null;
  addText: string;
  setAddText: (val: string) => void;
  onStartAddChild: (nodeId: string, parentId: string | 'ROOT') => void;
  onStartAddSibling: (targetId: string, parentId: string | 'ROOT') => void;
  onCommitAdd: () => void;
  onCancelAdd: () => void;
  editingNodeId: string | null;
  editText: string;
  setEditText: (val: string) => void;
  onStartEdit: (node: SuspectTreeNode) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDeleteNode: (id: string) => void;
}

function TreeLevelBranch({
  nodes,
  parentId,
  readOnly,
  activeAdd,
  addText,
  setAddText,
  onStartAddChild,
  onStartAddSibling,
  onCommitAdd,
  onCancelAdd,
  editingNodeId,
  editText,
  setEditText,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onDeleteNode,
}: TreeLevelBranchProps) {
  // Ko'rsatiladigan elementlar ketma-ketligini yig'amiz: mavjud tugunlar + agar sibling qo'shilayotgan bo'lsa uning inputi
  type BranchItem = { type: 'node'; node: SuspectTreeNode } | { type: 'input'; targetId: string };

  const items = useMemo(() => {
    const list: BranchItem[] = [];
    for (const n of nodes) {
      list.push({ type: 'node', node: n });
      if (
        activeAdd &&
        activeAdd.type === 'sibling' &&
        activeAdd.parentId === parentId &&
        activeAdd.targetId === n.id
      ) {
        list.push({ type: 'input', targetId: n.id });
      }
    }
    return list;
  }, [nodes, activeAdd, parentId]);

  return (
    <div className="relative flex flex-col justify-center shrink-0">
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        const singleItem = items.length === 1;

        if (item.type === 'input') {
          return (
            <div
              key="inline-sibling-input"
              className="relative flex items-center shrink-0 py-1.5 pl-6"
            >
              {/* Ulovchi chiziqlar */}
              <div className="absolute left-0 top-1/2 w-6 h-[2px] bg-border/80 pointer-events-none" />
              <SpineSegment isFirst={isFirst} isLast={isLast} singleItem={singleItem} />

              {/* Inline input */}
              <div className="flex items-center gap-1 py-0.5 animate-in fade-in slide-in-from-left-2 duration-100">
                <input
                  type="text"
                  placeholder="Yozing va Enter bosing..."
                  value={addText}
                  onChange={(e) => setAddText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onCommitAdd();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      onCancelAdd();
                    }
                  }}
                  className="h-6.5 text-xs font-semibold bg-transparent border-0 border-b-2 border-primary focus:outline-none px-1 w-44 md:w-56 text-foreground placeholder:text-muted-foreground/50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={onCommitAdd}
                  disabled={!addText.trim()}
                  className="h-5.5 px-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-40 shrink-0"
                  title="Saqlash (Enter)"
                >
                  <Check className="w-3 h-3" />
                  <span>Saqlash</span>
                </button>
                <button
                  type="button"
                  onClick={onCancelAdd}
                  className="h-5.5 w-5.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  title="Bekor qilish (Esc)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        }

        const node = item.node;
        const isEditing = editingNodeId === node.id;
        const hasChildren = Boolean(node.children && node.children.length > 0);
        const isAddingChildHere = activeAdd?.type === 'child' && activeAdd.targetId === node.id;

        return (
          <div key={node.id} className="relative flex items-center shrink-0 py-1.5 pl-6">
            {/* Chap tomondagi gorizontal chiziq (Spinedan tugun pillga keladi) */}
            <div className="absolute left-0 top-1/2 w-6 h-[2px] bg-border/80 pointer-events-none" />

            {/* Vertikal ulovchi orqa chiziq */}
            <SpineSegment isFirst={isFirst} isLast={isLast} singleItem={singleItem} />

            {/* TUGUN ELEMENTI VA HOVER TUGMALARI */}
            <div className="group/node relative flex items-center shrink-0">
              {isEditing ? (
                /* TAHRIRLASH REJIMI */
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
                /* ASOSIY TUGUN PILL */
                <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/80 hover:border-primary/60 bg-background hover:bg-muted/40 text-foreground transition-all shadow-2xs select-none">
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
                    <div className="opacity-0 group-hover/node:opacity-100 flex items-center gap-0.5 ml-1 pl-1 border-l border-border/60 transition-opacity">
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

                  {/* HOVER QILGANDA PASTIDAN CHIQADIGAN TO'RTBURCHAK '+' TUGMASI (SIBLING) */}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onStartAddSibling(node.id, parentId)}
                      className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-20 h-5 w-5 rounded-[4px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 flex items-center justify-center opacity-0 translate-y-1 group-hover/node:opacity-100 group-hover/node:translate-y-0 scale-90 group-hover/node:scale-100 transition-all duration-150 cursor-pointer"
                      title="Pastidan yangi tarmoq qo‘shish (+)"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  )}

                  {/* HOVER QILGANDA O'NGIDAN CHIQADIGAN TO'RTBURCHAK '+' TUGMASI (CHILD) agar bolasi bo'lmasa */}
                  {!readOnly && !hasChildren && !isAddingChildHere && (
                    <button
                      type="button"
                      onClick={() => onStartAddChild(node.id, parentId)}
                      className="absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 h-5 w-5 rounded-[4px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 flex items-center justify-center opacity-0 -translate-x-1 group-hover/node:opacity-100 group-hover/node:translate-x-0 scale-90 group-hover/node:scale-100 transition-all duration-150 cursor-pointer"
                      title="Ichki tarmoq (bola) qo‘shish (+)"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              )}

              {/* O'NGGA CHIZIQ (Agar bolalari bo'lsa yoki bola qo'shilayotgan bo'lsa) */}
              {(hasChildren || isAddingChildHere) && (
                <div className="w-6 h-[2px] bg-border/80 shrink-0 pointer-events-none" />
              )}
            </div>

            {/* BOLALAR TARMOG'I (RECURSION) */}
            {(hasChildren || isAddingChildHere) && (
              <div className="relative flex flex-col justify-center shrink-0">
                {/* Mavjud bolalar va faol qo'shilayotgan bola inputi */}
                <TreeLevelBranch
                  nodes={node.children || []}
                  parentId={node.id}
                  readOnly={readOnly}
                  activeAdd={activeAdd}
                  addText={addText}
                  setAddText={setAddText}
                  onStartAddChild={onStartAddChild}
                  onStartAddSibling={onStartAddSibling}
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

                {/* Agar aynan shu tugunga YANGI BOLA (child) kiritilayotgan bo'lsa va uning bolalari ro'yxatida bo'lmasa */}
                {isAddingChildHere && (!node.children || node.children.length === 0) && (
                  <div className="relative flex items-center shrink-0 py-1.5 pl-6">
                    <div className="absolute left-0 top-1/2 w-6 h-[2px] bg-border/80 pointer-events-none" />
                    <div className="flex items-center gap-1 py-0.5 animate-in fade-in slide-in-from-left-2 duration-100">
                      <input
                        type="text"
                        placeholder="Masalan: username, bio, telefon..."
                        value={addText}
                        onChange={(e) => setAddText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onCommitAdd();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            onCancelAdd();
                          }
                        }}
                        className="h-6.5 text-xs font-semibold bg-transparent border-0 border-b-2 border-primary focus:outline-none px-1 w-44 md:w-56 text-foreground placeholder:text-muted-foreground/50"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={onCommitAdd}
                        disabled={!addText.trim()}
                        className="h-5.5 px-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-40 shrink-0"
                        title="Saqlash (Enter)"
                      >
                        <Check className="w-3 h-3" />
                        <span>Saqlash</span>
                      </button>
                      <button
                        type="button"
                        onClick={onCancelAdd}
                        className="h-5.5 w-5.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors shrink-0"
                        title="Bekor qilish (Esc)"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
