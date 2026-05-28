"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarClock, Plus, Send, Trash2 } from "lucide-react"
import { type Resolver, useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod/v4"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

// Demo-only flow: nothing is actually sent. Validation is driven by a
// discriminated union on `schedule` — the date/time fields are only required
// (and only present) when scheduling is on.
const recipientsSchema = {
  to: z.array(z.object({ email: z.email("Invalid email") })).min(1, "Add at least one recipient"),
  cc: z.array(z.object({ email: z.email("Invalid email") })),
  subject: z.string().trim().min(1, "Subject is required")
}

const emailFormSchema = z.discriminatedUnion("schedule", [
  z.object({ ...recipientsSchema, schedule: z.literal(false) }),
  z.object({
    ...recipientsSchema,
    schedule: z.literal(true),
    scheduledDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Not a valid date"),
    scheduledTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)")
  })
])

// Flat shape for the form fields (RHF ergonomics); the resolver still validates
// against the discriminated union above.
interface EmailFormValues {
  to: { email: string }[]
  cc: { email: string }[]
  subject: string
  schedule: boolean
  scheduledDate: string
  scheduledTime: string
}

interface EmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const emptyEmail = (): EmailFormValues => ({
  to: [{ email: "" }],
  cc: [],
  subject: "",
  schedule: false,
  scheduledDate: "",
  scheduledTime: ""
})

export function EmailDialog({ open, onOpenChange }: EmailDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema) as Resolver<EmailFormValues>,
    defaultValues: emptyEmail()
  })

  const to = useFieldArray({ control, name: "to" })
  const cc = useFieldArray({ control, name: "cc" })
  const schedule = watch("schedule")

  const close = () => {
    onOpenChange(false)
    reset(emptyEmail())
  }

  const toggleSchedule = (checked: boolean) => {
    setValue("schedule", checked)
    if (!checked) {
      // Clear the now-hidden fields so stale values don't linger.
      setValue("scheduledDate", "")
      setValue("scheduledTime", "")
      clearErrors(["scheduledDate", "scheduledTime"])
    }
  }

  const onSubmit = (data: EmailFormValues) => {
    if (data.schedule) {
      toast.success(`Email scheduled for ${data.scheduledDate} at ${data.scheduledTime} (demo)`)
    } else {
      toast.success(`Email sent to ${data.to.length} recipient(s) (demo)`)
    }
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send email</DialogTitle>
          <DialogDescription>Compose the email for this communication.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <EmailRows
            label="To"
            rows={to.fields}
            register={register}
            name="to"
            errors={errors.to}
            onAdd={() => to.append({ email: "" })}
            onRemove={to.remove}
          />
          <EmailRows
            label="Cc"
            rows={cc.fields}
            register={register}
            name="cc"
            errors={errors.cc}
            onAdd={() => cc.append({ email: "" })}
            onRemove={cc.remove}
          />

          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input placeholder="Subject" {...register("subject")} />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
          </div>

          <div className="flex items-center gap-2 border-t pt-4">
            <Switch checked={schedule} onCheckedChange={toggleSchedule} />
            <Label className="text-sm">Schedule for later</Label>
          </div>

          <div
            className={cn(
              "grid grid-cols-2 gap-3 rounded-md border p-3 transition-opacity",
              schedule ? "opacity-100" : "pointer-events-none opacity-40"
            )}
          >
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input placeholder="YYYY-MM-DD" disabled={!schedule} {...register("scheduledDate")} />
              {errors.scheduledDate && (
                <p className="text-xs text-destructive">{errors.scheduledDate.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Time</Label>
              <Input placeholder="HH:MM" disabled={!schedule} {...register("scheduledTime")} />
              {errors.scheduledTime && (
                <p className="text-xs text-destructive">{errors.scheduledTime.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {schedule ? (
                <>
                  <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
                  Schedule
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Send
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// biome-ignore lint/suspicious/noExplicitAny: thin RHF passthrough for the demo form
function EmailRows({ label, rows, register, name, errors, onAdd, onRemove }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {rows.length === 0 && (
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add {label.toLowerCase()}
        </Button>
      )}
      {rows.map((field: { id: string }, index: number) => (
        <div key={field.id} className="space-y-1">
          <div className="flex items-center gap-2">
            <Input placeholder="email@example.com" {...register(`${name}.${index}.email`)} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onRemove(index)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {errors?.[index]?.email && (
            <p className="text-xs text-destructive">{errors[index].email.message}</p>
          )}
        </div>
      ))}
      {rows.length > 0 && (
        <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add another
        </Button>
      )}
    </div>
  )
}
