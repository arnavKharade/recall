
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { useAuth } from './context/AuthContext'
import MainLayout from './layouts/MainLayout'

import ProtectedRoute from './auth/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import Ask from './pages/Ask'
import Collections from './pages/Collections'
import Settings from './pages/Settings'

function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/ask" element={<Ask />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
