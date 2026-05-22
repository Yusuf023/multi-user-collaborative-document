"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GradientIcon } from "@/components/ui/gradient-icon"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <GradientIcon color="#ef4444" size="xl">
            <AlertTriangle className="size-7 text-foreground" strokeWidth={1.75} />
          </GradientIcon>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Go home
          </Button>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </main>
  )
}
