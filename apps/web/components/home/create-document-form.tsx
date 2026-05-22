"use client"

import { documentResponseSchema } from "@collab/shared"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod/v4"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiPost } from "@/lib/api-client"
import { API_ROUTES } from "@/lib/api-routes"

const formSchema = z.object({
  email: z.email("Please enter a valid email address")
})

type FormData = z.infer<typeof formSchema>

interface CreateDocumentFormProps {
  onBack: () => void
}

export function CreateDocumentForm({ onBack }: CreateDocumentFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema)
  })

  const onSubmit = async (data: FormData) => {
    try {
      const result = await apiPost(
        API_ROUTES.documents.create,
        { ownerEmail: data.email },
        documentResponseSchema
      )
      if (result) {
        const normalizedEmail = data.email.trim().toLowerCase()
        router.push(
          `/${result.id}?email=${encodeURIComponent(normalizedEmail)}&token=${result.token}`
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create document")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Your email</Label>
        <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Creating..." : "Create"}
        </Button>
      </div>
    </form>
  )
}
