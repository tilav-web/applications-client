import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  CreditCard,
  FileText,
  LayoutDashboard,
  User,
  Users,
} from 'lucide-react';

import type { NavItem } from '@/types/navigation';

export const navigationConfig: NavItem[] = [
  // 1. Asosiy Bo'limlar
  {
    id: 'dashboard',
    title: 'Boshqaruv Markazi',
    path: '/',
    icon: LayoutDashboard,
    category: 'main',
    allowedRoles: ['*'],
    description: 'Umumiy ko‘rsatkichlar va tezkor monitoring',
  },
  {
    id: 'applications',
    title: 'Arizalar & Murojaatlar',
    path: '/applications',
    icon: FileText,
    category: 'main',
    allowedRoles: ['*'],
    description: 'Kelib tushgan fuqarolar arizalari ro‘yxati',
  },
  {
    id: 'citizens',
    title: 'Fuqarolar Bazasi',
    path: '/citizens',
    icon: Users,
    category: 'main',
    allowedRoles: ['*'],
    description: 'Ro‘yxatga olingan fuqarolar ma‘lumotlari',
  },
  {
    id: 'cards',
    title: 'Plastik Kartalar',
    path: '/cards',
    icon: CreditCard,
    category: 'main',
    allowedRoles: ['*'],
    description: 'Bank kartalari va ularning egalari',
  },
  {
    id: 'transfers',
    title: 'To‘lov O‘tkazmalari',
    path: '/transfers',
    icon: ArrowLeftRight,
    category: 'main',
    allowedRoles: ['*'],
    description: 'Tranzaksiyalar va to‘lov o‘tkazmalari',
  },

  // 2. Operativ & Ma'lumotnomalar
  {
    id: 'references',
    title: 'Ma‘lumotnomalar',
    path: '/references',
    icon: BookOpen,
    category: 'operations',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'INSPECTOR'],
    description: 'Tumanlar, jinoyat turlari, banklar va to‘lov tizimlari',
  },

  // 3. Tizim & Boshqaruv
  {
    id: 'users',
    title: 'Foydalanuvchilar',
    path: '/users',
    icon: Activity,
    category: 'management',
    badge: 'Admin',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
    description: 'Tizim foydalanuvchilari va rollar taqsimoti',
  },
  {
    id: 'profile',
    title: 'Mening Profilim',
    path: '/profile',
    icon: User,
    category: 'system',
    allowedRoles: ['*'],
    description: 'Shaxsiy profil va xavfsizlik sozlamalari',
  },
];
