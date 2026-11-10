import { createBrowserRouter, Navigate } from 'react-router-dom';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { PublicRoute } from '@/components/auth/public-route';
import { AppLayout } from '@/components/layout/app-layout';
import { ApplicationCreatePage } from '@/pages/application-create-page';
import { ApplicationDetailPage } from '@/pages/application-detail-page';
import { ApplicationRelationsPage } from '@/pages/application-relations-page';
import { ApplicationsPage } from '@/pages/applications-page';
import { CardsPage } from '@/pages/cards-page';
import { CitizensPage } from '@/pages/citizens-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { FinancialFlowPage } from '@/pages/financial-flow-page';
import { LoginPage } from '@/pages/login-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { ProfilePage } from '@/pages/profile-page';
import { ReferencesPage } from '@/pages/references-page';
import { ReportsPage } from '@/pages/reports-page';
import { TemplatesPage } from '@/pages/templates-page';
import { TransfersPage } from '@/pages/transfers-page';
import { UsersPage } from '@/pages/users-page';

export const router = createBrowserRouter([
  // Public Login Route
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
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
            path: 'cards',
            element: <CardsPage />,
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
            element: <Navigate to="/references" replace />,
          },
          {
            path: 'crimes',
            element: <Navigate to="/references" replace />,
          },
          {
            path: 'users',
            element: <UsersPage />,
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
