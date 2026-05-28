"use client"

import type { Collaborator, InvitableRole } from "@collab/shared"
import { INVITABLE_ROLES } from "@collab/shared"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Copy, Plus, Share2, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod/v4"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { apiPost, authHeaders } from "@/lib/api-client"
import { API_ROUTES } from "@/lib/api-routes"

// Remembers the user's "send invite email" choice across sessions.
const SEND_EMAIL_STORAGE_KEY = "collab:invite:sendEmail"

const inviteFormSchema = z.object({
  invites: z
    .array(
      z.object({
        email: z.email("Please enter a valid email"),
        role: z.enum(INVITABLE_ROLES)
      })
    )
    .min(1),
  sendEmail: z.boolean()
})

type InviteFormData = z.infer<typeof inviteFormSchema>

const collaboratorsResponseSchema = z.object({
  collaborators: z.array(
    z.object({
      email: z.string(),
      role: z.string(),
      color: z.string(),
      joinedAt: z.string()
    })
  )
})

interface InviteDialogProps {
  documentId: string
  token: string
  currentUser: Collaborator
  onInvited: (collaborators: Collaborator[]) => void
  // When set, the role selector is hidden and every invite uses this role.
  lockedRole?: InvitableRole
  // Controlled mode (used when opened from a menu). Omit for the default
  // self-triggered "Share" button.
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface InviteLink {
  email: string
  url: string
}

const emptyInvites = (role: InvitableRole): InviteFormData => ({
  invites: [{ email: "", role }],
  sendEmail: true
})

function buildInviteUrl(documentId: string, email: string, token: string): string {
  return `${window.location.origin}/${documentId}?email=${encodeURIComponent(email)}&token=${token}`
}

function CopyLinkRow({ email, url }: InviteLink) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  return (
    <div className="space-y-1 rounded-md border p-3">
      <p className="text-sm font-medium">{email}</p>
      <div className="flex items-center gap-2">
        <Input readOnly value={url} className="flex-1 text-xs" onFocus={(e) => e.target.select()} />
        <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}

export function InviteDialog({
  documentId,
  token,
  currentUser,
  onInvited,
  lockedRole,
  open,
  onOpenChange
}: InviteDialogProps) {
  const defaultRole: InvitableRole = lockedRole ?? "editor"
  const isControlled = open !== undefined
  const isApprovalRequest = lockedRole === "reviewer"

  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = isControlled ? open : internalOpen
  const [invitedLinks, setInvitedLinks] = useState<InviteLink[] | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: emptyInvites(defaultRole)
  })

  const { fields, append, remove } = useFieldArray({ control, name: "invites" })
  const sendEmail = watch("sendEmail")

  // Load the persisted send-email preference once on mount (localStorage is
  // client-only, so we read it in an effect rather than in defaultValues).
  useEffect(() => {
    const saved = localStorage.getItem(SEND_EMAIL_STORAGE_KEY)
    if (saved !== null) setValue("sendEmail", saved === "true")
  }, [setValue])

  const setSendEmail = (checked: boolean) => {
    setValue("sendEmail", checked)
    localStorage.setItem(SEND_EMAIL_STORAGE_KEY, String(checked))
  }

  const handleOpenChange = (next: boolean) => {
    if (isControlled) onOpenChange?.(next)
    else setInternalOpen(next)
    // Reset form + results whenever dialog closes so the next open is fresh
    if (!next) {
      reset(emptyInvites(defaultRole))
      setInvitedLinks(null)
    }
  }

  const startOver = () => {
    reset(emptyInvites(defaultRole))
    setInvitedLinks(null)
  }

  const onSubmit = async (data: InviteFormData) => {
    try {
      const result = await apiPost(
        API_ROUTES.documents.invite,
        { documentId, invites: data.invites, sendEmail: data.sendEmail },
        collaboratorsResponseSchema,
        { headers: authHeaders(currentUser.email, token) }
      )
      if (result) {
        onInvited(result.collaborators as Collaborator[])
        const sent = data.sendEmail
        toast.success(
          isApprovalRequest
            ? sent
              ? "Approval requested"
              : "Approval links created"
            : sent
              ? "Invitations sent"
              : "Invite links created"
        )
        setInvitedLinks(
          data.invites.map((i) => ({
            email: i.email,
            url: buildInviteUrl(documentId, i.email, token)
          }))
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitations")
    }
  }

  const title = isApprovalRequest ? "Request approval" : "Invite collaborators"
  const description = invitedLinks
    ? "Share these links with your collaborators."
    : isApprovalRequest
      ? "Invite reviewers to review and approve this document."
      : "Add people to collaborate on this document."
  const submitLabel = isSubmitting
    ? sendEmail
      ? "Sending..."
      : "Creating..."
    : isApprovalRequest
      ? sendEmail
        ? "Send request"
        : "Create links"
      : sendEmail
        ? "Send invites"
        : "Create links"

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger render={<Button size="sm" variant="outline" />}>
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          Share
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {invitedLinks ? (
          <div className="space-y-4">
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {invitedLinks.map((link) => (
                <CopyLinkRow key={link.email} email={link.email} url={link.url} />
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <Button type="button" variant="outline" size="sm" onClick={startOver}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {isApprovalRequest ? "Request more" : "Invite more"}
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="email@example.com"
                        {...register(`invites.${index}.email`)}
                      />
                      {errors.invites?.[index]?.email && (
                        <p className="text-xs text-destructive">
                          {errors.invites[index].email.message}
                        </p>
                      )}
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {!lockedRole && (
                    <RadioGroup
                      value={watch(`invites.${index}.role`)}
                      onValueChange={(val) =>
                        setValue(`invites.${index}.role`, val as InvitableRole)
                      }
                      className="flex gap-4"
                    >
                      {INVITABLE_ROLES.map((role) => (
                        <div key={role} className="flex items-center gap-1.5">
                          <RadioGroupItem value={role} id={`${field.id}-${role}`} />
                          <Label
                            htmlFor={`${field.id}-${role}`}
                            className="text-xs capitalize cursor-pointer"
                          >
                            {role}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ email: "", role: defaultRole })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add another
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => reset(emptyInvites(defaultRole))}
              >
                Clear
              </Button>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
                <Label className="text-sm">Send invite email</Label>
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {submitLabel}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
