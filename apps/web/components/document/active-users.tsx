"use client"

import type { Collaborator } from "@collab/shared"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, getInitials } from "@/lib/utils"

interface ActiveUsersProps {
  collaborators: Collaborator[]
  currentUserEmail: string
  activeEmails?: string[]
}

export function ActiveUsers({
  collaborators,
  currentUserEmail,
  activeEmails = []
}: ActiveUsersProps) {
  const maxVisible = 2
  const visible = collaborators.slice(0, maxVisible)
  const overflow = collaborators.slice(maxVisible)

  const isActive = (email: string) => activeEmails.includes(email) || email === currentUserEmail

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((collaborator) => (
        <Tooltip key={collaborator.email}>
          <TooltipTrigger>
            <Avatar
              className="border-2 border-background"
              style={{
                opacity: isActive(collaborator.email) ? 1 : 0.5
              }}
            >
              <AvatarFallback style={{ backgroundColor: collaborator.color, color: "#fff" }}>
                {getInitials(collaborator.email)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-medium">{collaborator.email}</p>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="capitalize">{collaborator.role}</span>
                <span aria-hidden>&middot;</span>
                <span
                  className={cn(
                    "inline-block size-1.5 rounded-full",
                    isActive(collaborator.email) ? "bg-success" : "bg-muted-foreground/50"
                  )}
                />
                <span>{isActive(collaborator.email) ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}

      {overflow.length > 0 && (
        <HoverCard>
          <HoverCardTrigger>
            <Avatar className="border-2 border-background cursor-pointer">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                +{overflow.length}
              </AvatarFallback>
            </Avatar>
          </HoverCardTrigger>
          <HoverCardContent className="w-72">
            <div className="space-y-3">
              <p className="text-sm font-medium">Other collaborators</p>
              {overflow.map((collaborator) => (
                <div key={collaborator.email} className="flex items-center gap-2">
                  <Avatar
                    className="h-6 w-6"
                    style={{ opacity: isActive(collaborator.email) ? 1 : 0.5 }}
                  >
                    <AvatarFallback
                      className="text-[10px]"
                      style={{ backgroundColor: collaborator.color, color: "#fff" }}
                    >
                      {getInitials(collaborator.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{collaborator.email}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="capitalize">{collaborator.role}</span>
                      <span aria-hidden>&middot;</span>
                      <span
                        className={cn(
                          "inline-block size-1.5 rounded-full",
                          isActive(collaborator.email) ? "bg-success" : "bg-muted-foreground/50"
                        )}
                      />
                      <span>{isActive(collaborator.email) ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  )
}
