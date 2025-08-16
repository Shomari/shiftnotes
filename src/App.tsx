import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { LoginForm } from './components/auth/LoginForm'
import { Dashboard } from './components/Dashboard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from 'sonner'
import { LoadingScreen } from './components/LoadingScreen'

function AppContent() {
  const { isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Global error handler for unhandled promises and errors
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error)
      if (event.error?.message?.includes('Invalid time value')) {
        console.error('Date error detected:', event.error)
      }
    }
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      if (event.reason?.message?.includes('Invalid time value')) {
        console.error('Date-related promise rejection:', event.reason)
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated ? <Dashboard /> : <LoginForm />}
      <Toaster position="bottom-right" richColors />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App