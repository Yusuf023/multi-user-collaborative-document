import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DocumentNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">Document not found or invalid link.</p>
        <Link href="/">
          <Button variant="outline">Go back home</Button>
        </Link>
      </div>
    </div>
  )
}
