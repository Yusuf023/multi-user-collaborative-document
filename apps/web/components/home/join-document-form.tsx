"use client"

import { documentDetailsSchema, TOKEN_LENGTH } from "@collab/shared"
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
  documentId: z.uuid("Please enter a valid document ID"),
  email: z.email("Please enter a valid email address"),
  token: z.string().length(TOKEN_LENGTH, `Token must be ${TOKEN_LENGTH} characters`)
})

type FormData = z.infer<typeof formSchema>

interface JoinDocumentFormProps {
  onBack: () => void
}

export function JoinDocumentForm({ onBack }: JoinDocumentFormProps) {
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
      await apiPost(API_ROUTES.documents.join, data, documentDetailsSchema)
      const normalizedEmail = data.email.trim().toLowerCase()
      router.push(
        `/${data.documentId}?email=${encodeURIComponent(normalizedEmail)}&token=${data.token}`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join document")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="documentId">Document ID</Label>
        <Input id="documentId" placeholder="Enter document ID" {...register("documentId")} />
        {errors.documentId && (
          <p className="text-sm text-destructive">{errors.documentId.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="join-email">Your email</Label>
        <Input id="join-email" type="email" placeholder="you@example.com" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="token">Token</Label>
        <Input
          id="token"
          placeholder="6-character token"
          maxLength={TOKEN_LENGTH}
          {...register("token")}
        />
        {errors.token && <p className="text-sm text-destructive">{errors.token.message}</p>}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Joining..." : "Join"}
        </Button>
      </div>
    </form>
  )
}
