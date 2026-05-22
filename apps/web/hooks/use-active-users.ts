"use client"

import { INACTIVITY_TIMEOUT_MS } from "@collab/shared"
import type { HocuspocusProvider } from "@hocuspocus/provider"
import { useEffect, useState } from "react"

interface AwarenessUser {
  name: string
  color: string
}

interface AwarenessState {
  user?: AwarenessUser
  lastActive?: number
}

export function useActiveUsers(provider: HocuspocusProvider | null) {
  const [activeEmails, setActiveEmails] = useState<string[]>([])

  useEffect(() => {
    if (!provider) return

    const awareness = provider.awareness
    if (!awareness) return

    const updateActiveUsers = () => {
      const now = Date.now()
      const states = awareness.getStates() as Map<number, AwarenessState>
      const active: string[] = []

      states.forEach((state) => {
        if (state.user?.name) {
          const lastActive = state.lastActive || now
          if (now - lastActive < INACTIVITY_TIMEOUT_MS) {
            active.push(state.user.name)
          }
        }
      })

      setActiveEmails(active)
    }

    // Update local awareness with activity timestamp
    const updateActivity = () => {
      awareness.setLocalStateField("lastActive", Date.now())
    }

    // Set initial activity
    updateActivity()

    // Track user activity
    const activityEvents = ["keydown", "mousemove", "mousedown", "touchstart", "scroll"]
    let activityTimeout: ReturnType<typeof setTimeout>

    const handleActivity = () => {
      clearTimeout(activityTimeout)
      activityTimeout = setTimeout(updateActivity, 1000) // Debounce 1s
    }

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Listen for awareness changes
    awareness.on("change", updateActiveUsers)

    // Poll active state every 30s to catch timeouts
    const pollInterval = setInterval(updateActiveUsers, 30000)

    // Initial update
    updateActiveUsers()

    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })
      awareness.off("change", updateActiveUsers)
      clearInterval(pollInterval)
      clearTimeout(activityTimeout)
    }
  }, [provider])

  return activeEmails
}
