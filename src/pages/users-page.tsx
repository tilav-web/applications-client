import { Activity, Phone, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store';

export function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);

  const staff = [
    {
      id: currentUser?.id || '6c0e3916-7057-416a-a6cf-9b8071743aaa',
      username: currentUser?.username || 'admin',
      fullName:
        currentUser?.profile?.first_name || currentUser?.profile?.last_name
          ? `${currentUser.profile.first_name || ''} ${currentUser.profile.last_name || ''}`.trim()
          : 'Super Admin',
      role: currentUser?.role || 'SUPER_ADMIN',
      phone: currentUser?.profile?.phone_number || '+998901234567',
      status: 'Faol (Hozir tizimda)',
    },
    {
      id: 'USR-2026-002',
      username: 'inspector_yunusobod',
      fullName: 'Rustamov Alisher Nodirovich',
      role: 'INSPECTOR',
      phone: '+998909887766',
      status: 'Oflayn',
    },
    {
      id: 'USR-2026-003',
      username: 'operator_chilonzor',
      fullName: 'Xoliqova Nargiza Shuhratovna',
      role: 'OPERATOR',
      phone: '+998933332211',
      status: 'Oflayn',
    },
  ];

  return (
    <div className="w-full space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary mb-1">
          <Activity className="h-3.5 w-3.5" />
          <span>Foydalanuvchilar & Boshqaruv</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Foydalanuvchilar</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Arizalar bazasi tizimiga kirish huquqiga ega bo‘lgan barcha foydalanuvchilar va ularning
          rollari
        </p>
      </div>

      <div className="space-y-3">
        {staff.map((s) => (
          <Card key={s.id} className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">@{s.username}</span>
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-mono">
                    {s.role}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-border text-[10px] text-muted-foreground"
                  >
                    {s.status}
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <User className="h-4 w-4 text-primary" />
                  {s.fullName}
                </h3>
              </div>

              <div className="flex items-center gap-6 text-xs text-muted-foreground">
                <span className="font-mono flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  {s.phone}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/80 hidden md:inline">
                  UUID: {s.id.slice(0, 8)}...
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
