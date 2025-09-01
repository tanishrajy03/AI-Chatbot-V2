import { cn } from "@/lib/utils"

export function MessageItem({
  role,
  content,
}: {
  role: "user" | "assistant" | "system"
  content: string
}) {
  const isUser = role === "user"
  if (role === "system") return null

  return (
    <div className={cn("w-full flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
          isUser ? "bg-emerald-600 text-white" : "bg-muted text-foreground",
        )}
        aria-label={isUser ? "User message" : "Assistant message"}
      >
        {content}
      </div>
    </div>
  )
}
