"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { MessageSquare } from "lucide-react"
import { useForm } from "react-hook-form"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

const CHANNELS = ["#general", "#legal", "#comms-team", "#approvals", "#leadership"] as const
const PERIODS = [
  { value: "off", label: "Off (one-time)" },
  { value: "3h", label: "Every 3 hours" },
  { value: "6h", label: "Every 6 hours" },
  { value: "12h", label: "Every 12 hours" },
  { value: "daily", label: "Daily" }
] as const

const teamsFormSchema = z.object({
  channel: z.enum(CHANNELS, { message: "Select a channel" }),
  period: z.enum(["off", "3h", "6h", "12h", "daily"])
})

type TeamsFormData = z.infer<typeof teamsFormSchema>

interface TeamsChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TeamsChatDialog({ open, onOpenChange }: TeamsChatDialogProps) {
  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<TeamsFormData>({
    resolver: zodResolver(teamsFormSchema),
    defaultValues: { period: "off" }
  })

  const close = () => {
    onOpenChange(false)
    reset({ period: "off" })
  }

  const onSubmit = (data: TeamsFormData) => {
    const period = PERIODS.find((p) => p.value === data.period)?.label ?? "Off"
    toast.success(`Posted to ${data.channel} — ${period} (demo)`)
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send to Teams chat</DialogTitle>
          <DialogDescription>Share this communication to a Teams channel.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Channel</Label>
            <Select
              value={watch("channel") ?? ""}
              onValueChange={(v) => setValue("channel", v as (typeof CHANNELS)[number])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.channel && <p className="text-xs text-destructive">{errors.channel.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Periodic updates</Label>
            <Select
              value={watch("period")}
              onValueChange={(v) => setValue("period", v as TeamsFormData["period"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Off" />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Post to channel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
