import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Radar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { detectedCrimesApi } from '@/lib/api';

export function CitizenDetectedCrimesCard({ citizenId }: { citizenId: string }) {
  const navigate = useNavigate();
  const { data: items } = useQuery({
    queryKey: ['citizen-detected-crimes', citizenId],
    queryFn: () => detectedCrimesApi.getByCitizen(citizenId),
    enabled: Boolean(citizenId),
  });

  if (!items || items.length === 0) return null;

  return (
    <Card className="border-rose-500/35 bg-rose-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-600">
          <Radar className="h-4 w-4" />
          Aniqlangan Jinoyatlar / MJTK Tarixi ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/detected-crimes/${item.id}`)}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/20 bg-background/80 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="font-mono text-primary">{item.case_number || '—'}</span>
                <span className="truncate">{item.title}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(item.detected_at).toLocaleDateString('uz-UZ')} •{' '}
                {item.crime_article || item.mjtk_article || 'Modda ko‘rsatilmagan'} •{' '}
                {item.district_name || '—'}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="text-[10px]">
                {item.qualification_type === 'CRIMINAL'
                  ? 'JK'
                  : item.qualification_type === 'ADMINISTRATIVE'
                    ? 'MJTK'
                    : 'Tekshiruvda'}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {item.role_in_crime}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
