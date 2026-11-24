import { Edit2, Search, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TableRowsSkeleton } from '@/components/ui/page-skeletons';
import { PaginationBar } from '@/components/ui/pagination-bar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import type { Bank, PaymentProvider, TransferChannel } from '@/types/models';

import type { ReferenceItem } from './reference-types';

interface PaginatedItems<T> {
  items: T[];
  meta?: {
    page: number;
    totalPages: number;
    total: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface ReferenceFinanceTabsProps {
  bankSearch: string;
  setBankSearch: (val: string) => void;
  setBankPage: (page: number) => void;
  banksData?: PaginatedItems<Bank>;
  isBanksLoading: boolean;
  providerSearch: string;
  setProviderSearch: (val: string) => void;
  setProviderPage: (page: number) => void;
  providersData?: PaginatedItems<PaymentProvider>;
  isProvidersLoading: boolean;
  transferChannelsData?: { items?: TransferChannel[] };
  isTransferChannelsLoading: boolean;
  pageSize: number;
  setPageSize: (limit: number) => void;
  openEditModal: (item: ReferenceItem) => void;
  openDeleteModal: (item: ReferenceItem) => void;
}

export function ReferenceFinanceTabs({
  bankSearch,
  setBankSearch,
  setBankPage,
  banksData,
  isBanksLoading,
  providerSearch,
  setProviderSearch,
  setProviderPage,
  providersData,
  isProvidersLoading,
  transferChannelsData,
  isTransferChannelsLoading,
  pageSize,
  setPageSize,
  openEditModal,
  openDeleteModal,
}: ReferenceFinanceTabsProps) {
  return (
    <>
      {/* 3. BANKS TAB */}
      <TabsContent value="banks" className="space-y-4 mt-0">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="relative max-w-md lg:max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Bank nomi, kodi yoki MFO bo'yicha qidiruv..."
                value={bankSearch}
                onChange={(e) => {
                  setBankSearch(e.target.value);
                  setBankPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Nomi</TableHead>
                <TableHead>Kodi</TableHead>
                <TableHead>MFO</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isBanksLoading ? (
                <TableRowsSkeleton rows={6} columns={5} />
              ) : banksData?.items?.length ? (
                banksData.items.map((bank: Bank) => (
                  <TableRow key={bank.id}>
                    <TableCell className="font-semibold text-foreground">
                      {bank.name || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {bank.code || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{bank.mfo || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          bank.is_active
                            ? 'border-emerald-500/40 text-emerald-400'
                            : 'text-muted-foreground'
                        }
                      >
                        {bank.is_active ? 'Faol' : 'Nofaol'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(bank)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(bank)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Hech qanday bank topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {banksData?.meta && (
            <PaginationBar
              page={banksData.meta.page}
              totalPages={banksData.meta.totalPages}
              total={banksData.meta.total}
              limit={pageSize}
              hasNextPage={banksData.meta.hasNextPage}
              hasPreviousPage={banksData.meta.hasPreviousPage}
              onPageChange={(p) => setBankPage(p)}
              onLimitChange={(newLimit) => {
                setPageSize(newLimit);
                setBankPage(1);
              }}
              isLoading={isBanksLoading}
            />
          )}
        </Card>
      </TabsContent>

      {/* 4. PAYMENT PROVIDERS TAB */}
      <TabsContent value="providers" className="space-y-4 mt-0">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="relative max-w-md lg:max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Provayder nomi yoki kodi bo'yicha qidiruv..."
                value={providerSearch}
                onChange={(e) => {
                  setProviderSearch(e.target.value);
                  setProviderPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provayder Nomi</TableHead>
                <TableHead>Tizim Kodi</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isProvidersLoading ? (
                <TableRowsSkeleton rows={6} columns={3} />
              ) : providersData?.items?.length ? (
                providersData.items.map((prov: PaymentProvider) => (
                  <TableRow key={prov.id}>
                    <TableCell className="font-semibold text-foreground">
                      {prov.name || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-primary font-bold">
                      {prov.code || '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(prov)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(prov)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Hech qanday provayder topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {providersData?.meta && (
            <PaginationBar
              page={providersData.meta.page}
              totalPages={providersData.meta.totalPages}
              total={providersData.meta.total}
              limit={pageSize}
              hasNextPage={providersData.meta.hasNextPage}
              hasPreviousPage={providersData.meta.hasPreviousPage}
              onPageChange={(p) => setProviderPage(p)}
              onLimitChange={(newLimit) => {
                setPageSize(newLimit);
                setProviderPage(1);
              }}
              isLoading={isProvidersLoading}
            />
          )}
        </Card>
      </TabsContent>

      {/* 4.1. TRANSFER EXIT CHANNELS TAB (Dinamik chiqish kanallari) */}
      <TabsContent value="transfer_channels" className="space-y-4 mt-0">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Kanal Nomi</TableHead>
                <TableHead>Kategoriya (Graf turi)</TableHead>
                <TableHead>Tezkor Variantlar (Presets)</TableHead>
                <TableHead className="w-[80px] text-center">Tartib</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTransferChannelsLoading ? (
                <TableRowsSkeleton rows={5} columns={5} />
              ) : transferChannelsData?.items?.length ? (
                transferChannelsData.items.map((ch: TransferChannel) => (
                  <TableRow key={ch.id} className="hover:bg-primary/[0.04]">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                          style={{ backgroundColor: `${ch.color || '#0891b2'}20` }}
                        >
                          {ch.icon || '🌐'}
                        </span>
                        <div>
                          <div className="font-semibold text-foreground">{ch.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {ch.code}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {ch.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ch.presets && ch.presets.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ch.presets.map((p) => (
                            <Badge key={p} variant="secondary" className="text-[10px] font-normal">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">{ch.sort_order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => openEditModal(ch)}
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        {ch.code !== 'CARD' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:text-destructive cursor-pointer"
                            onClick={() => openDeleteModal(ch)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Chiqish kanallari topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>
    </>
  );
}
