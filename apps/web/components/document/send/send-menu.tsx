"use client"

import type { Collaborator } from "@collab/shared"
import { ChevronDown, Mail, MessageSquare, Send, ShieldCheck, Sparkles } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { InviteDialog } from "../invite-dialog"
import { AiDialog } from "./ai-dialog"
import { EmailDialog } from "./email-dialog"
import { TeamsChatDialog } from "./teams-chat-dialog"

type ActiveDialog = "email" | "teams" | "approval" | "ai" | null

interface SendMenuProps {
  documentId: string
  token: string
  currentUser: Collaborator
  onInvited: (collaborators: Collaborator[]) => void
}

export function SendMenu({ documentId, token, currentUser, onInvited }: SendMenuProps) {
  const [active, setActive] = useState<ActiveDialog>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="sm" />}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Send
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setActive("email")}>
            Email
            <Mail className="text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActive("teams")}>
            Send to Teams chat
            <MessageSquare className="text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActive("ai")}>
            Integrate AI
            <Sparkles className="text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setActive("approval")}>
            Request for approval
            <ShieldCheck className="text-muted-foreground" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EmailDialog open={active === "email"} onOpenChange={(o) => setActive(o ? "email" : null)} />
      <TeamsChatDialog
        open={active === "teams"}
        onOpenChange={(o) => setActive(o ? "teams" : null)}
      />
      <AiDialog open={active === "ai"} onOpenChange={(o) => setActive(o ? "ai" : null)} />
      <InviteDialog
        documentId={documentId}
        token={token}
        currentUser={currentUser}
        onInvited={onInvited}
        lockedRole="reviewer"
        open={active === "approval"}
        onOpenChange={(o) => setActive(o ? "approval" : null)}
      />
    </>
  )
}
