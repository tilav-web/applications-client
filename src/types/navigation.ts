import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  title: string;
  path: string;
  icon: LucideIcon;
  category: 'main' | 'operations' | 'management' | 'system';
  badge?: string;
  allowedRoles: string[]; // ['*'] for all, or specific roles like ['SUPER_ADMIN', 'ADMIN']
  description?: string;
}
