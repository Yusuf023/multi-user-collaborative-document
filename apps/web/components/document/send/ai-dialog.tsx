"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Sparkles } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"

const MODELS = ["Claude Opus 4.7", "Claude Sonnet 4.6", "GPT-4o", "Gemini 2.5 Pro"] as const

const aiFormSchema = z.object({
  model: z.enum(MODELS, { message: "Select a model" }),
  prompt: z.string().trim().min(1, "Enter a prompt")
})

type AiFormData = z.infer<typeof aiFormSchema>

interface AiDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AiDialog({ open, onOpenChange }: AiDialogProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<AiFormData>({
    resolver: zodResolver(aiFormSchema)
  })

  const close = () => {
    onOpenChange(false)
    reset({ model: undefined, prompt: "" })
  }

  const onSubmit = (data: AiFormData) => {
    toast.success(`Sent to ${data.model} (demo)`)
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Integrate AI</DialogTitle>
          <DialogDescription>Run an AI model against this communication.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Model</Label>
            <Select
              value={watch("model") ?? ""}
              onValueChange={(v) => setValue("model", v as (typeof MODELS)[number])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Prompt</Label>
            <Textarea
              placeholder="e.g. Summarise this draft and suggest edits…"
              {...register("prompt")}
            />
            {errors.prompt && <p className="text-xs text-destructive">{errors.prompt.message}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Run
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
