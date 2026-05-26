import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { SettingsProvider } from './contexts/SettingsProvider'
import { ConfirmModalProvider } from './contexts/ConfirmModalProvider'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { NewRoutinePage } from './pages/NewRoutinePage'
import { RoutinePage } from './pages/RoutinePage'
import { WorkoutSessionPage } from './pages/WorkoutSessionPage'

// Non-critical routes: lazy-loaded to keep the initial bundle small
const ExercisesPage = lazy(() =>
  import('./pages/ExercisesPage').then((m) => ({ default: m.ExercisesPage }))
)
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage }))
)
const HistoryDetailPage = lazy(() =>
  import('./pages/HistoryDetailPage').then((m) => ({ default: m.HistoryDetailPage }))
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)

function Protected({ element }) {
  return <ProtectedRoute>{element}</ProtectedRoute>
}

export function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ConfirmModalProvider>
          <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="home" element={<Protected element={<HomePage />} />} />
              <Route
                path="exercises"
                element={
                  <Protected
                    element={
                      <Suspense fallback={null}>
                        <ExercisesPage />
                      </Suspense>
                    }
                  />
                }
              />
              <Route
                path="routine/new"
                element={<Protected element={<NewRoutinePage />} />}
              />
              <Route
                path="routine/:id"
                element={<Protected element={<RoutinePage />} />}
              />
              <Route
                path="workout/:sessionId"
                element={<Protected element={<WorkoutSessionPage />} />}
              />
              <Route
                path="history"
                element={
                  <Protected
                    element={
                      <Suspense fallback={null}>
                        <HistoryPage />
                      </Suspense>
                    }
                  />
                }
              />
              <Route
                path="history/:sessionId"
                element={
                  <Protected
                    element={
                      <Suspense fallback={null}>
                        <HistoryDetailPage />
                      </Suspense>
                    }
                  />
                }
              />
              <Route
                path="settings"
                element={
                  <Protected
                    element={
                      <Suspense fallback={null}>
                        <SettingsPage />
                      </Suspense>
                    }
                  />
                }
              />
            </Route>
          </Routes>
          </BrowserRouter>
        </ConfirmModalProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}
