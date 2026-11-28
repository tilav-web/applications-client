import { Edit2, Search, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TableRowsSkeleton } from '@/components/ui/page-skeletons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import { matchesLatinSearch } from '@/lib/transliterate';
import type {
  ApplicationSource,
  DecisionType,
  DepartmentService,
  RejectionReason,
} from '@/types/models';

import type { ReferenceItem } from './reference-types';

interface ReferenceProceduralTabsProps {
  sourceSearch: string;
  setSourceSearch: (val: string) => void;
  allSourcesList: ApplicationSource[];
  isSourcesLoading: boolean;
  deptServiceSearch: string;
  setDeptServiceSearch: (val: string) => void;
  allDeptServicesList: DepartmentService[];
  isDeptServicesLoading: boolean;
  decisionSearch: string;
  setDecisionSearch: (val: string) => void;
  allDecisionTypesList: DecisionType[];
  isDecisionTypesLoading: boolean;
  rejectionSearch: string;
  setRejectionSearch: (val: string) => void;
  allRejectionReasonsList: RejectionReason[];
  isRejectionReasonsLoading: boolean;
  openEditModal: (item: ReferenceItem) => void;
  openDeleteModal: (item: ReferenceItem) => void;
}

export function ReferenceProceduralTabs({
  sourceSearch,
  setSourceSearch,
  allSourcesList,
  isSourcesLoading,
  deptServiceSearch,
  setDeptServiceSearch,
  allDeptServicesList,
  isDeptServicesLoading,
  decisionSearch,
  setDecisionSearch,
  allDecisionTypesList,
  isDecisionTypesLoading,
  rejectionSearch,
  setRejectionSearch,
  allRejectionReasonsList,
  isRejectionReasonsLoading,
  openEditModal,
  openDeleteModal,
}: ReferenceProceduralTabsProps) {
  const filteredSources = useMemo(
    () => allSourcesList.filter((s) => matchesLatinSearch(s.name, sourceSearch)),
    [allSourcesList, sourceSearch],
  );

  const filteredDeptServices = useMemo(
    () =>
      allDeptServicesList.filter(
        (d) =>
          matchesLatinSearch(d.name, deptServiceSearch) ||
          (d.short_name && matchesLatinSearch(d.short_name, deptServiceSearch)),
      ),
    [allDeptServicesList, deptServiceSearch],
  );

  const filteredDecisionTypes = useMemo(
    () => allDecisionTypesList.filter((d) => matchesLatinSearch(d.name, decisionSearch)),
    [allDecisionTypesList, decisionSearch],
  );

  const filteredRejectionReasons = useMemo(
    () => allRejectionReasonsList.filter((r) => matchesLatinSearch(r.name, rejectionSearch)),
    [allRejectionReasonsList, rejectionSearch],
  );

  return (
    <>
      {/* 8. SOURCES TAB */}
      <TabsContent value="sources" className="space-y-4 mt-0">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Murojaat manbasi bo‘yicha qidiruv (102, 112, Ishonch telefoni)..."
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Murojaat Manbasi Nomi</TableHead>
                <TableHead>Kodi / Raqami</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isSourcesLoading ? (
                <TableRowsSkeleton rows={6} columns={4} />
              ) : filteredSources.length ? (
                filteredSources.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-foreground">{item.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.code || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.is_active !== false
                            ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]'
                            : 'border-slate-500/30 text-slate-500 bg-slate-500/10 text-[10px]'
                        }
                      >
                        {item.is_active !== false ? 'Faol' : 'Nofaol'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(item)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(item)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Murojaat manbalari topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      {/* 9. DEPARTMENT SERVICES TAB */}
      <TabsContent value="department_services" className="space-y-4 mt-0">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sohaviy xizmat nomi yoki qisqartmasi (UYOKK, JQK, TQK)..."
                value={deptServiceSearch}
                onChange={(e) => setDeptServiceSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sohaviy Xizmat To‘liq Nomi</TableHead>
                <TableHead>Qisqartmasi (Abbreviatura)</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDeptServicesLoading ? (
                <TableRowsSkeleton rows={6} columns={4} />
              ) : filteredDeptServices.length ? (
                filteredDeptServices.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-foreground">{item.name}</TableCell>
                    <TableCell>
                      <Badge className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                        {item.short_name || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.is_active !== false
                            ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]'
                            : 'border-slate-500/30 text-slate-500 bg-slate-500/10 text-[10px]'
                        }
                      >
                        {item.is_active !== false ? 'Faol' : 'Nofaol'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(item)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(item)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Sohaviy xizmatlar topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      {/* 10. DECISION TYPES TAB */}
      <TabsContent value="decision_types" className="space-y-4 mt-0">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Qaror turi bo‘yicha qidiruv..."
                value={decisionSearch}
                onChange={(e) => setDecisionSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Qaror Turi</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDecisionTypesLoading ? (
                <TableRowsSkeleton rows={6} columns={3} />
              ) : filteredDecisionTypes.length ? (
                filteredDecisionTypes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-foreground">{item.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.is_active !== false
                            ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]'
                            : 'border-slate-500/30 text-slate-500 bg-slate-500/10 text-[10px]'
                        }
                      >
                        {item.is_active !== false ? 'Faol' : 'Nofaol'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(item)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(item)}
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
                    Qaror turlari topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      {/* 11. REJECTION REASONS TAB */}
      <TabsContent value="rejection_reasons" className="space-y-4 mt-0">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rad etish sababi bo‘yicha qidiruv..."
                value={rejectionSearch}
                onChange={(e) => setRejectionSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rad Etish Sababi Nomi</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isRejectionReasonsLoading ? (
                <TableRowsSkeleton rows={6} columns={3} />
              ) : filteredRejectionReasons.length ? (
                filteredRejectionReasons.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-foreground">{item.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.is_active !== false
                            ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]'
                            : 'border-slate-500/30 text-slate-500 bg-slate-500/10 text-[10px]'
                        }
                      >
                        {item.is_active !== false ? 'Faol' : 'Nofaol'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(item)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(item)}
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
                    Rad etish sabablari topilmadi
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
