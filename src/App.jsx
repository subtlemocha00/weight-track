import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { SettingsProvider } from './contexts/SettingsProvider'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { NewRoutinePage } from './pages/NewRoutinePage'
import { RoutinePage } from './pages/RoutinePage'
import { WorkoutSessionPage } from './pages/WorkoutSessionPage'
import { HistoryPage } from './pages/HistoryPage'
import { HistoryDetailPage } from './pages/HistoryDetailPage'
import { SettingsPage } from './pages/SettingsPage'

// Lazy-loaded so the bundled exercise dataset isn't pulled into the initial chunk.
const ExercisesPage = lazy(() =>
  import('./pages/ExercisesPage').then((m) => ({ default: m.ExercisesPage }))
)

function Protected({ element }) {
  return <ProtectedRoute>{element}</ProtectedRoute>
}

export function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
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
                element={<Protected element={<HistoryPage />} />}
              />
              <Route
                path="history/:sessionId"
                element={<Protected element={<HistoryDetailPage />} />}
              />
              <Route
                path="settings"
                element={<Protected element={<SettingsPage />} />}
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  )
}
