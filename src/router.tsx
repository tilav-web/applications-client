import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { PublicRoute } from '@/components/auth/public-route';
import { AppLayout } from '@/components/layout/app-layout';
import { PageSkeleton } from '@/components/ui/page-skeletons';

// Code-splitting (har bir sahifa alohida yengil chunk sifatida yuklanadi — tez sahifa almashishi + skeleton)
const ApplicationCreatePage = lazy(() =>
  import('@/pages/application-create-page').then((m) => ({ default: m.ApplicationCreatePage })),
);
const ApplicationDetailPage = lazy(() =>
  import('@/pages/application-detail-page').then((m) => ({ default: m.ApplicationDetailPage })),
);
const ApplicationRelationsPage = lazy(() =>
  import('@/pages/application-relations-page').then((m) => ({
    default: m.ApplicationRelationsPage,
  })),
);
const ApplicationsPage = lazy(() =>
  import('@/pages/applications-page').then((m) => ({ default: m.ApplicationsPage })),
);
const AuditPage = lazy(() => import('@/pages/audit-page').then((m) => ({ default: m.AuditPage })));
const CardDossierPage = lazy(() =>
  import('@/pages/card-dossier-page').then((m) => ({ default: m.CardDossierPage })),
);
const CardsPage = lazy(() => import('@/pages/cards-page').then((m) => ({ default: m.CardsPage })));
const CitizenDossierPage = lazy(() =>
  import('@/pages/citizen-dossier-page').then((m) => ({ default: m.CitizenDossierPage })),
);
const CitizensPage = lazy(() =>
  import('@/pages/citizens-page').then((m) => ({ default: m.CitizensPage })),
);
const ClueDossierPage = lazy(() =>
  import('@/pages/clue-dossier-page').then((m) => ({ default: m.ClueDossierPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);
const FinancialFlowPage = lazy(() =>
  import('@/pages/financial-flow-page').then((m) => ({ default: m.FinancialFlowPage })),
);
const LoginPage = lazy(() => import('@/pages/login-page').then((m) => ({ default: m.LoginPage })));
const NotFoundPage = lazy(() =>
  import('@/pages/not-found-page').then((m) => ({ default: m.NotFoundPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/profile-page').then((m) => ({ default: m.ProfilePage })),
);
const ReferencesPage = lazy(() =>
  import('@/pages/references-page').then((m) => ({ default: m.ReferencesPage })),
);
const ReportsPage = lazy(() =>
  import('@/pages/reports-page').then((m) => ({ default: m.ReportsPage })),
);
const TemplatesPage = lazy(() =>
  import('@/pages/templates-page').then((m) => ({ default: m.TemplatesPage })),
);
const TransfersPage = lazy(() =>
  import('@/pages/transfers-page').then((m) => ({ default: m.TransfersPage })),
);
const UsersPage = lazy(() => import('@/pages/users-page').then((m) => ({ default: m.UsersPage })));

export const router = createBrowserRouter([
  // Public Login Route
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },

  // Protected Main Application Routes (Directly on Root '/')
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'applications',
            element: <ApplicationsPage />,
          },
          {
            path: 'applications/create',
            element: <ApplicationCreatePage />,
          },
          {
            path: 'applications/create/:id',
            element: <ApplicationCreatePage />,
          },
          {
            path: 'applications/edit/:id',
            element: <ApplicationCreatePage />,
          },
          {
            path: 'applications/:id/relations',
            element: <ApplicationRelationsPage />,
          },
          {
            path: 'applications/:id',
            element: <ApplicationDetailPage />,
          },
          {
            path: 'citizens',
            element: <CitizensPage />,
          },
          {
            path: 'citizens/:id',
            element: <CitizenDossierPage />,
          },
          {
            path: 'cards',
            element: <CardsPage />,
          },
          {
            path: 'cards/:id',
            element: <CardDossierPage />,
          },
          {
            path: 'dossier/:type/:id',
            element: <ClueDossierPage />,
          },
          {
            path: 'transfers',
            element: <TransfersPage />,
          },
          {
            path: 'financial-flow',
            element: <FinancialFlowPage />,
          },
          {
            path: 'reports',
            element: <ReportsPage />,
          },
          {
            path: 'references',
            element: <ReferencesPage />,
          },
          {
            path: 'templates',
            element: <TemplatesPage />,
          },
          // Redirect old routes to unified references page
          {
            path: 'districts',
            element: <Navigate to="/references?tab=districts" replace />,
          },
          {
            path: 'crimes',
            element: <Navigate to="/references?tab=crimes" replace />,
          },
          {
            path: 'users',
            element: <UsersPage />,
          },
          {
            path: 'audit',
            element: <AuditPage />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: '*',
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
]);
