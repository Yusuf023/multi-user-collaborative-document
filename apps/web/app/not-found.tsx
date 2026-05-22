import { FileQuestion } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GradientIcon } from "@/components/ui/gradient-icon"

export default function GlobalNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <GradientIcon color="#737373" size="xl">
            <FileQuestion className="size-7 text-foreground" strokeWidth={1.75} />
          </GradientIcon>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            The page you&rsquo;re looking for doesn&rsquo;t exist.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">Go back home</Button>
        </Link>
      </div>
    </main>
  )
}
