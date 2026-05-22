import { notFound } from "next/navigation"
import { documentPageParamsSchema, documentPageSearchParamsSchema } from "@/lib/schemas/params"
import { DocumentPageClient } from "./client"

interface DocumentPageProps {
  params: Promise<{ documentId: string }>
  searchParams: Promise<{ email?: string; token?: string }>
}

export default async function DocumentPage({ params, searchParams }: DocumentPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  // Validate route params
  const paramsResult = documentPageParamsSchema.safeParse(resolvedParams)
  if (!paramsResult.success) {
    return notFound()
  }

  // Validate search params
  const searchParamsResult = documentPageSearchParamsSchema.safeParse(resolvedSearchParams)
  if (!searchParamsResult.success) {
    return notFound()
  }

  const { documentId } = paramsResult.data
  const { email, token } = searchParamsResult.data
  const normalizedEmail = email.trim().toLowerCase()

  return <DocumentPageClient documentId={documentId} email={normalizedEmail} token={token} />
}
