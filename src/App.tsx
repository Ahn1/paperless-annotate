import { useEffect } from 'react'
import { createBrowserRouter, Navigate, RouterProvider, useLocation, useNavigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/app/queryClient'
import { useSession } from '@/stores/session'
import { AppShell } from '@/features/shell/AppShell'
import { UpdateBanner } from '@/features/shell/UpdateBanner'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { UnlockScreen } from '@/features/onboarding/UnlockScreen'
import { DocumentListPage } from '@/features/documents/DocumentListPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { CenteredSpinner } from '@/components/ui/misc'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DocumentDetailPage } from '@/features/documents/detail/DocumentDetailPage'
import { ManagePage } from '@/features/manage/ManagePage'
import { TrashPage } from '@/features/trash/TrashPage'
import { EditorPage } from '@/features/editor/EditorPage'
import { ReaderPage } from '@/features/reader/ReaderPage'
import { LandingPage } from '@/features/landing/LandingPage'

/** Leitet je nach Session-Zustand um (kein Profil → Landing Page, 401 → Onboarding). */
function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useSession((s) => s.status)
  const authError = useSession((s) => s.authError)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Noch kein Profil eingerichtet → Landing Page (statt direkt ins Setup)
    if (status === 'no-profile' && location.pathname !== '/welcome') {
      navigate('/welcome', { replace: true })
    }
    // Token ungültig geworden → zurück ins Onboarding zum erneuten Anmelden
    if (authError && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true })
    }
  }, [status, authError, location.pathname, navigate])

  if (status === 'loading') {
    return (
      <div className="flex h-dvh items-center justify-center">
        <CenteredSpinner />
      </div>
    )
  }
  if (status === 'locked') return <UnlockScreen />
  if (status !== 'ready') return null
  return <>{children}</>
}

// Data Router (statt BrowserRouter): nur er stellt useBlocker bereit, mit dem der
// Editor das Verlassen mit ungespeicherten Annotationen abfängt.
const router = createBrowserRouter([
  { path: '/welcome', element: <LandingPage /> },
  { path: '/onboarding', element: <OnboardingPage /> },
  {
    path: '/documents/:id/annotate',
    element: (
      <AuthGate>
        <EditorPage />
      </AuthGate>
    ),
  },
  {
    path: '/documents/:id/read',
    element: (
      <AuthGate>
        <ReaderPage />
      </AuthGate>
    ),
  },
  {
    element: (
      <AuthGate>
        <AppShell />
      </AuthGate>
    ),
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/documents', element: <DocumentListPage /> },
      { path: '/documents/:id', element: <DocumentDetailPage /> },
      { path: '/inbox', element: <DocumentListPage inboxOnly /> },
      { path: '/manage/*', element: <ManagePage /> },
      { path: '/trash', element: <TrashPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  const init = useSession((s) => s.init)
  useEffect(() => {
    void init()
  }, [init])

  return (
    <QueryClientProvider client={queryClient}>
      {/* Hosting braucht SPA-Fallback auf index.html (vite preview kann das; Caddy/nginx: try_files) */}
      <RouterProvider router={router} />
      <UpdateBanner />
    </QueryClientProvider>
  )
}
