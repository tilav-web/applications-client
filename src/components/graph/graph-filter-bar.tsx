import { Boxes, Filter, Maximize2, Minimize2, RefreshCw, RotateCcw, Search } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  searchCard: string;
  onSearchChange: (val: string) => void;
  riskLevel: string;
  onRiskChange: (val: string) => void;
  minAmount: number;
  onMinAmountChange: (val: number) => void;
  clusteringEnabled: boolean;
  onToggleClustering: () => void;
  onResetFilters: () => void;
  onRefresh?: () => void;
  isFetching?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const GraphFilterBar: React.FC<Props> = ({
  searchCard,
  onSearchChange,
  riskLevel,
  onRiskChange,
  minAmount,
  onMinAmountChange,
  clusteringEnabled,
  onToggleClustering,
  onResetFilters,
  onRefresh,
  isFetching,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <div className="bg-white border border-[#d2d6de] p-2 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchCard}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Karta raqami yoki egasi bo‘yicha qidiruv..."
            className="w-full pl-9 pr-3 py-1.5 h-8 text-xs border border-gray-300 rounded-none focus-visible:ring-1 focus-visible:ring-[#2874a6] bg-white text-gray-800"
          />
        </div>

        {/* Risk select */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={riskLevel}
            onChange={(e) => onRiskChange(e.target.value)}
            className="text-xs border border-gray-300 px-3 py-1.5 h-8 focus:outline-none focus:border-[#2874a6] bg-white text-gray-700 cursor-pointer"
          >
            <option value="ALL">Barcha rollar</option>
            <option value="RED">🚨 Firibgar / Dropper</option>
            <option value="YELLOW">⚠️ Tranzit Vositachi</option>
            <option value="BLUE">🔷 Jabrlanuvchi</option>
          </select>
        </div>

        {/* Min amount */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>Min. summa:</span>
          <select
            value={minAmount}
            onChange={(e) => onMinAmountChange(Number(e.target.value))}
            className="text-xs border border-gray-300 px-2 py-1.5 h-8 focus:outline-none focus:border-[#2874a6] bg-white text-gray-700 cursor-pointer"
          >
            <option value={0}>Barchasi (0 UZS)</option>
            <option value={1000000}>1,000,000+ UZS</option>
            <option value={5000000}>5,000,000+ UZS</option>
            <option value={15000000}>15,000,000+ UZS</option>
            <option value={30000000}>30,000,000+ UZS</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleClustering}
            className={`h-8 px-2.5 text-xs font-medium border rounded-none cursor-pointer transition-colors ${
              clusteringEnabled
                ? 'bg-blue-50 border-blue-300 text-[#2874a6]'
                : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
            title="Jabrlanuvchi kartalarini guruhlash/ochish"
          >
            <Boxes className="w-3.5 h-3.5 mr-1" />
            <span>{clusteringEnabled ? 'Guruhlangan' : 'Guruhlash'}</span>
          </Button>

          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isFetching}
              className="h-8 px-2.5 text-xs font-medium border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-none cursor-pointer gap-1"
              title="Yangilash"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#2874a6]' : ''}`}
              />
              <span className="hidden sm:inline">Yangilash</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-8 px-2.5 text-xs font-medium text-gray-500 hover:text-gray-900 cursor-pointer rounded-none"
            title="Filtrlarni tozalash"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          {onToggleFullscreen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleFullscreen}
              className={`h-8 px-2.5 text-xs font-medium border rounded-none cursor-pointer gap-1 ${
                isFullscreen
                  ? 'bg-[#2874a6] text-white border-[#2874a6] hover:bg-[#1f5f8b]'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
              title={isFullscreen ? 'Kichraytirish (Esc)' : 'To‘liq ekranda ko‘rish'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isFullscreen ? 'Kichraytirish' : 'To‘liq ekran'}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
