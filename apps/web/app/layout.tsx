import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Collaborative Document",
  description: "Real-time multi-user collaborative document editor"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              unstyled: false,
              classNames: {
                toast:
                  "!bg-popover/80 dark:!bg-popover/60 !border !border-border !text-popover-foreground !backdrop-blur-md !shadow-md",
                title: "!text-popover-foreground",
                description: "!text-muted-foreground",
                actionButton: "!bg-primary !text-primary-foreground",
                cancelButton: "!bg-muted !text-muted-foreground",
                closeButton: "!bg-popover !text-popover-foreground !border-border"
              }
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
