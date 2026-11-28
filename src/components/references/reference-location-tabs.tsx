import { Edit2, Search, Trash2 } from 'lucide-react';

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
import type { District, Neighborhood, Region } from '@/types/models';

import { formatCoordPair } from './reference-cache.util';
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

interface ReferenceLocationTabsProps {
  regionSearch: string;
  setRegionSearch: (val: string) => void;
  setRegionPage: (page: number) => void;
  regionsData?: PaginatedItems<Region>;
  isRegionsLoading: boolean;
  allRegionsList: Region[];
  districtSearch: string;
  setDistrictSearch: (val: string) => void;
  selectedRegionFilter: string;
  setSelectedRegionFilter: (val: string) => void;
  setDistrictPage: (page: number) => void;
  districtsData?: PaginatedItems<District>;
  isDistrictsLoading: boolean;
  neighborhoodSearch: string;
  setNeighborhoodSearch: (val: string) => void;
  setNeighborhoodPage: (page: number) => void;
  neighborhoodsData?: PaginatedItems<Neighborhood>;
  isNeighborhoodsLoading: boolean;
  pageSize: number;
  setPageSize: (limit: number) => void;
  openEditModal: (item: ReferenceItem) => void;
  openDeleteModal: (item: ReferenceItem) => void;
}

export function ReferenceLocationTabs({
  regionSearch,
  setRegionSearch,
  setRegionPage,
  regionsData,
  isRegionsLoading,
  allRegionsList,
  districtSearch,
  setDistrictSearch,
  selectedRegionFilter,
  setSelectedRegionFilter,
  setDistrictPage,
  districtsData,
  isDistrictsLoading,
  neighborhoodSearch,
  setNeighborhoodSearch,
  setNeighborhoodPage,
  neighborhoodsData,
  isNeighborhoodsLoading,
  pageSize,
  setPageSize,
  openEditModal,
  openDeleteModal,
}: ReferenceLocationTabsProps) {
  return (
    <>
      {/* 0. REGIONS TAB */}
      <TabsContent value="regions" className="space-y-4 mt-0">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="relative max-w-md lg:max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Viloyat nomi yoki kodi bo'yicha qidiruv..."
                value={regionSearch}
                onChange={(e) => {
                  setRegionSearch(e.target.value);
                  setRegionPage(1);
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
                <TableHead>Viloyat Nomi</TableHead>
                <TableHead>Kodi</TableHead>
                <TableHead>Koordinatalar (Lat, Lng)</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isRegionsLoading ? (
                <TableRowsSkeleton rows={4} columns={4} />
              ) : regionsData?.items?.length ? (
                regionsData.items.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell className="font-medium text-foreground">
                      {region.name || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-primary font-semibold">
                      {region.code || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatCoordPair(region.latitude, region.longitude)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(region)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(region)}
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
                    Hech qanday viloyat topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {regionsData?.meta && (
            <PaginationBar
              page={regionsData.meta.page}
              totalPages={regionsData.meta.totalPages}
              total={regionsData.meta.total}
              limit={pageSize}
              hasNextPage={regionsData.meta.hasNextPage}
              hasPreviousPage={regionsData.meta.hasPreviousPage}
              onPageChange={(p) => setRegionPage(p)}
              onLimitChange={(newLimit) => {
                setPageSize(newLimit);
                setRegionPage(1);
              }}
              isLoading={isRegionsLoading}
            />
          )}
        </Card>
      </TabsContent>

      {/* 1. DISTRICTS TAB */}
      <TabsContent value="districts" className="space-y-4 mt-0">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md lg:max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tuman nomi bo'yicha qidiruv..."
                value={districtSearch}
                onChange={(e) => {
                  setDistrictSearch(e.target.value);
                  setDistrictPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <select
              value={selectedRegionFilter}
              onChange={(e) => {
                setSelectedRegionFilter(e.target.value);
                setDistrictPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium min-w-[200px]"
            >
              <option value="">Barcha viloyatlar</option>
              {allRegionsList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tuman / Bo&apos;lim Nomi</TableHead>
                <TableHead>Viloyat</TableHead>
                <TableHead>Koordinatalar (Lat, Lng)</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDistrictsLoading ? (
                <TableRowsSkeleton rows={6} columns={4} />
              ) : districtsData?.items?.length ? (
                districtsData.items.map((district) => (
                  <TableRow key={district.id}>
                    <TableCell className="font-medium text-foreground">
                      {district.name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {district.region?.name || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatCoordPair(district.latitude, district.longitude)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(district)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(district)}
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
                    Hech qanday tuman topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {districtsData?.meta && (
            <PaginationBar
              page={districtsData.meta.page}
              totalPages={districtsData.meta.totalPages}
              total={districtsData.meta.total}
              limit={pageSize}
              hasNextPage={districtsData.meta.hasNextPage}
              hasPreviousPage={districtsData.meta.hasPreviousPage}
              onPageChange={(p) => setDistrictPage(p)}
              onLimitChange={(newLimit) => {
                setPageSize(newLimit);
                setDistrictPage(1);
              }}
              isLoading={isDistrictsLoading}
            />
          )}
        </Card>
      </TabsContent>

      {/* 1.1. NEIGHBORHOODS (MAHALLAS) TAB */}
      <TabsContent value="neighborhoods" className="space-y-4 mt-0">
        <Card className="py-0 gap-0 border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="relative max-w-md lg:max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Mahalla nomi bo'yicha qidiruv..."
                value={neighborhoodSearch}
                onChange={(e) => {
                  setNeighborhoodSearch(e.target.value);
                  setNeighborhoodPage(1);
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
                <TableHead>Mahalla Nomi</TableHead>
                <TableHead>Tegishli Tuman</TableHead>
                <TableHead>Koordinatalar (Lat, Lng)</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isNeighborhoodsLoading ? (
                <TableRowsSkeleton rows={6} columns={4} />
              ) : neighborhoodsData?.items?.length ? (
                neighborhoodsData.items.map((neighborhood) => (
                  <TableRow key={neighborhood.id}>
                    <TableCell className="font-medium text-foreground">
                      {neighborhood.name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {neighborhood.district?.name || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatCoordPair(neighborhood.latitude, neighborhood.longitude)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(neighborhood)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(neighborhood)}
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
                    Hech qanday mahalla topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {neighborhoodsData?.meta && (
            <PaginationBar
              page={neighborhoodsData.meta.page}
              totalPages={neighborhoodsData.meta.totalPages}
              total={neighborhoodsData.meta.total}
              limit={pageSize}
              hasNextPage={neighborhoodsData.meta.hasNextPage}
              hasPreviousPage={neighborhoodsData.meta.hasPreviousPage}
              onPageChange={(p) => setNeighborhoodPage(p)}
              onLimitChange={(newLimit) => {
                setPageSize(newLimit);
                setNeighborhoodPage(1);
              }}
              isLoading={isNeighborhoodsLoading}
            />
          )}
        </Card>
      </TabsContent>
    </>
  );
}
