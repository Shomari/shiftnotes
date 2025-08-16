import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ClipboardText, User } from '@phosphor-icons/react'

export function LoginForm() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      await login(email, password)
    } finally {
      setIsLoading(false)
    }
  }

  const demoLogins = [
    { email: 'faculty@shiftnotes.com', role: 'Faculty', icon: User },
    { email: 'trainee@shiftnotes.com', role: 'Trainee', icon: User },
    { email: 'admin@shiftnotes.com', role: 'Admin', icon: User },
    { email: 'leadership@shiftnotes.com', role: 'Leadership', icon: User }
  ]

  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('demo')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-primary rounded-full p-3">
              <ClipboardText size={32} weight="bold" className="text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">ShiftNotes</h1>
          <p className="text-muted-foreground">Competency tracking made easy.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6">
              <Separator />
              <p className="text-sm text-muted-foreground text-center mt-4 mb-3">
                Demo Accounts - Click to auto-fill
              </p>
              <div className="grid grid-cols-2 gap-2">
                {demoLogins.map((demo) => (
                  <Button
                    key={demo.email}
                    variant="outline"
                    size="sm"
                    onClick={() => quickLogin(demo.email)}
                    className="text-xs"
                  >
                    {demo.role}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Password: "demo" for all accounts
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}