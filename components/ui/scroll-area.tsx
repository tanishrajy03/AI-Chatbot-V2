import type * as React from "react"
import { cn } from "@/lib/utils"

export function ScrollArea({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn("overflow-auto", className)}>{children}</div>
}
