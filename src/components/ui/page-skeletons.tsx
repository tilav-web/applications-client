import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

export function TableRowsSkeleton({
  rows = 8,
  columns = 6,
  nativeTr = false,
}: {
  rows?: number;
  columns?: number;
  nativeTr?: boolean;
}) {
  const widths = ['w-24', 'w-36', 'w-28', 'w-44', 'w-20', 'w-32', 'w-16'];

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) =>
        nativeTr ? (
          <tr key={rowIdx} className="border-b border-border/60">
            {Array.from({ length: columns }).map((__, colIdx) => (
              <td key={colIdx} className="px-3 py-3">
                <Skeleton
                  className={`h-4 ${widths[(rowIdx + colIdx) % widths.length]} max-w-full`}
                />
              </td>
            ))}
          </tr>
        ) : (
          <TableRow key={rowIdx} className="border-b border-border/60">
            {Array.from({ length: columns }).map((__, colIdx) => (
              <TableCell key={colIdx} className="py-3">
                <Skeleton
                  className={`h-4 ${widths[(rowIdx + colIdx) % widths.length]} max-w-full`}
                />
              </TableCell>
            ))}
          </TableRow>
        ),
      )}
    </>
  );
}

export function PageSkeleton() {
  return (
    <div className="w-full space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3.5 w-80 max-w-[70vw]" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3.5 flex flex-wrap gap-2.5">
          <Skeleton className="h-9 flex-1 min-w-[200px]" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="divide-y divide-border/60">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className="px-4 py-3.5 flex items-center gap-4">
                <Skeleton className="h-4 w-8 shrink-0" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28 hidden sm:block" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-20 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="w-full space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-[380px] w-full rounded-xl" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
