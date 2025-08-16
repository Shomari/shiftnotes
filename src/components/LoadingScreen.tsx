import { ClipboardText } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30">
      <Card className="p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="bg-primary rounded-full p-4 animate-pulse">
            <ClipboardText size={40} weight="bold" className="text-primary-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">ShiftNotes</h2>
          <p className="text-muted-foreground">Loading your assessment system...</p>
        </div>
        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse w-3/4"></div>
        </div>
      </Card>
    </div>
  )
}