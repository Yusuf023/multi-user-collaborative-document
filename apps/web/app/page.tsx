"use client"

import Image from "next/image"
import { useState } from "react"
import { CreateDocumentForm } from "@/components/home/create-document-form"
import { JoinDocumentForm } from "@/components/home/join-document-form"
import { Button } from "@/components/ui/button"
import { GradientIcon } from "@/components/ui/gradient-icon"

export default function HomePage() {
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle")

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <GradientIcon color="var(--color-foreground)" size="xl">
            <Image src="/logo.svg" alt="Logo" width={36} height={36} className="dark:invert" />
          </GradientIcon>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Collaborative Document</h1>
          <p className="text-sm text-muted-foreground">
            Create or join a real-time collaborative document with live editing, cursors, and
            comments.
          </p>
        </div>

        {mode === "idle" && (
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={() => setMode("create")}>
              Create a new document
            </Button>
            <Button size="lg" variant="outline" className="w-full" onClick={() => setMode("join")}>
              Join a collaboration
            </Button>
          </div>
        )}

        {mode === "create" && <CreateDocumentForm onBack={() => setMode("idle")} />}
        {mode === "join" && <JoinDocumentForm onBack={() => setMode("idle")} />}
      </div>
    </main>
  )
}
