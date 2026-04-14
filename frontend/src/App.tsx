import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import JobDetail from './pages/JobDetail'
import JobSearch from './pages/JobSearch'
import Templates from './pages/Templates'
import Profile from './pages/Profile'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session)
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

export default function App() {
  useEffect(() => {
    useAuthStore.getState().loadSession().catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:id"
          element={
            <ProtectedRoute>
              <JobDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <JobSearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedRoute>
              <Templates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
