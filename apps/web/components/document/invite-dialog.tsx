"use client"

import type { Collaborator, InvitableRole } from "@collab/shared"
import { INVITABLE_ROLES } from "@collab/shared"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Share2, Trash2 } from "lucide-react"
import { useState } from "react"
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
}

const emptyInvites = (): InviteFormData => ({
  invites: [{ email: "", role: "editor" }],
  sendEmail: true
})

export function InviteDialog({ documentId, token, currentUser, onInvited }: InviteDialogProps) {
  const [open, setOpen] = useState(false)

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
    defaultValues: emptyInvites()
  })

  const { fields, append, remove } = useFieldArray({ control, name: "invites" })
  const sendEmail = watch("sendEmail")

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    // Reset form whenever dialog closes so the next open is fresh
    if (!next) reset(emptyInvites())
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
        toast.success("Invitations sent successfully")
        reset(emptyInvites())
        setOpen(false)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitations")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Share2 className="mr-1.5 h-3.5 w-3.5" />
        Share
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite collaborators</DialogTitle>
          <DialogDescription>Add people to collaborate on this document.</DialogDescription>
        </DialogHeader>
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
                <RadioGroup
                  value={watch(`invites.${index}.role`)}
                  onValueChange={(val) => setValue(`invites.${index}.role`, val as InvitableRole)}
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
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ email: "", role: "editor" })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add another
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => reset(emptyInvites())}>
              Clear
            </Button>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={sendEmail}
                onCheckedChange={(checked) => setValue("sendEmail", checked)}
              />
              <Label className="text-sm">Send invite email</Label>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send invites"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
