import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Phone,
  ShieldAlert,
  User,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import type { IGraphNode, LinkedApplicationInfo } from '@/types/models';

interface Props {
  node: IGraphNode;
  onClose: () => void;
}

const formatCurrency = (amount?: number | null, currency = 'UZS') => {
  if (amount === undefined || amount === null) return '—';
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(amount))} ${currency}`;
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatCardNumber = (val?: string | null) => {
  if (!val) return 'Raqam kiritilmagan';
  const clean = val.replace(/\D/g, '');
  if (clean.length === 16) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12, 16)}`;
  }
  return val;
};

export const NodeDetailsDrawer: React.FC<Props> = ({ node, onClose }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Karta raqami nusxalandi!");
    setTimeout(() => setCopied(false), 2000);
  };

  const isDropper = node.role === 'MULE_DROPPER' || (node.riskScore && node.riskScore >= 70);
  const isTransit = node.role === 'TRANSIT';
  const isVictim = node.role === 'VICTIM_SOURCE';

  const linkedApps = node.linkedApplications || [];

  return (
    <div className="absolute top-0 right-0 w-full sm:w-[460px] h-full z-30 bg-white border-l border-[#d2d6de] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 select-none">
      {/* Drawer Header */}
      <div className="p-4 bg-[#f8fafc] border-b border-[#d2d6de] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className={`h-9 w-9 rounded flex items-center justify-center shrink-0 ${
              isDropper
                ? 'bg-red-50 text-red-600 border border-red-200'
                : isTransit
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-blue-50 text-[#2874a6] border border-blue-200'
            }`}
          >
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight text-gray-900">
              Karta & Profil Tafsilotlari
            </h3>
            <p className="text-[11px] text-gray-500">
              Tarmoqda aniqlangan moliyaviy ob‘ekt
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 cursor-pointer text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          title="Yopish"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Card Number & Badges */}
        <div className="border border-[#d2d6de] bg-[#f8fafc] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-lg font-extrabold tracking-wider text-gray-900">
              {formatCardNumber(node.cardNumber)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(node.cardNumber.replace(/\s+/g, ''))}
              className="h-7 px-2.5 gap-1 text-xs cursor-pointer bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              title="Nusxa olish"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Nusxalandi' : 'Nusxa'}</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {node.bankName && (
              <Badge variant="outline" className="text-xs gap-1 font-normal bg-white border-gray-300 text-gray-700">
                <Building2 className="h-3 w-3 text-gray-500" />
                {node.bankName}
              </Badge>
            )}

            {isDropper ? (
              <Badge className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold gap-1 shadow-none">
                <ShieldAlert className="h-3 w-3" />
                Firibgar / Dropper
              </Badge>
            ) : isTransit ? (
              <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold shadow-none">
                Tranzit Vositachi
              </Badge>
            ) : isVictim ? (
              <Badge className="bg-blue-50 text-[#2874a6] border border-blue-200 text-xs font-medium shadow-none">
                Jabrlanuvchi
              </Badge>
            ) : null}

            {node.isUnknownDestination && (
              <Badge variant="secondary" className="text-xs text-amber-700 bg-amber-50 border border-amber-200">
                ❓ Noaniq manzil
              </Badge>
            )}
          </div>
        </div>

        {/* Owner Information */}
        {(node.ownerName || node.phone || node.passport || node.pinfl) && (
          <div className="border border-[#d2d6de] bg-white p-4 space-y-2.5 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[#2874a6]" />
              Karta Egasi & Shaxsiy Ma‘lumotlar
            </h4>

            {node.ownerName && (
              <p className="text-sm font-semibold text-gray-900">{node.ownerName}</p>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              {node.phone && (
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-500 uppercase block">Telefon</span>
                  <span className="font-mono text-gray-900 font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3 text-[#2874a6]" />+{node.phone.replace(/\D/g, '')}
                  </span>
                </div>
              )}

              {node.passport && (
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-500 uppercase block">Pasport</span>
                  <span className="font-mono text-gray-900 font-medium">{node.passport}</span>
                </div>
              )}

              {node.pinfl && (
                <div className="space-y-0.5 col-span-2">
                  <span className="text-[10px] text-gray-500 uppercase block">JSHSHIR (PINFL)</span>
                  <span className="font-mono text-gray-900 font-medium">{node.pinfl}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial Flow Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-[#d2d6de] bg-white p-3 space-y-1">
            <span className="text-[10px] uppercase font-medium text-gray-500 flex items-center gap-1">
              <ArrowDownLeft className="h-3 w-3 text-emerald-600" />
              Kiruvchi (Total In)
            </span>
            <span className="font-mono text-sm font-bold text-emerald-700 block">
              {formatCurrency(node.totalIn)}
            </span>
          </div>

          <div className="border border-[#d2d6de] bg-white p-3 space-y-1">
            <span className="text-[10px] uppercase font-medium text-gray-500 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-rose-600" />
              Chiquvchi (Total Out)
            </span>
            <span className="font-mono text-sm font-bold text-rose-600 block">
              {formatCurrency(node.totalOut)}
            </span>
          </div>
        </div>

        {/* Linked Applications Section */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[#2874a6]" />
              Bog‘langan Arizalar ({linkedApps.length})
            </h4>
            <span className="text-[11px] text-gray-500">
              Ushbu karta uchragan ishlar
            </span>
          </div>

          {linkedApps.length === 0 ? (
            <div className="border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500 bg-[#f8fafc]">
              Ushbu karta boshqa arizalarga bog‘lanmagan.
            </div>
          ) : (
            <div className="space-y-2">
              {linkedApps.map((appItem: LinkedApplicationInfo) => {
                const isItemReceiver = appItem.role_in_that_app === 'RECEIVER';
                return (
                  <div
                    key={appItem.id}
                    className="border border-[#d2d6de] bg-white hover:border-[#2874a6] transition-all cursor-pointer group p-3 space-y-2"
                    onClick={() => navigate(`/applications/${appItem.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#2874a6] group-hover:underline flex items-center gap-1">
                        № {appItem.application_number}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>

                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          isItemReceiver
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : 'bg-blue-50 text-[#2874a6] border-blue-200'
                        }`}
                      >
                        {isItemReceiver ? 'Qabul qiluvchi' : 'Jo‘natuvchi'}
                      </Badge>
                    </div>

                    {appItem.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {appItem.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                      <div>
                        {appItem.citizen_name && (
                          <span className="font-medium text-gray-900 block truncate max-w-[200px]">
                            {appItem.citizen_name}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                          <Calendar className="h-3 w-3" />
                          {formatDate(appItem.date)}
                        </span>
                      </div>

                      <div className="text-right">
                        {appItem.transfer_amount !== undefined && appItem.transfer_amount !== null && (
                          <span className="font-mono font-bold text-rose-600 text-xs block">
                            {formatCurrency(appItem.transfer_amount, appItem.currency)}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">
                          {appItem.status_label || 'Jarayonda'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/applications/${appItem.id}`);
                        }}
                        className="h-6 px-2 text-[11px] gap-1 text-[#2874a6] hover:bg-blue-50 cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Arizani ochish</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
