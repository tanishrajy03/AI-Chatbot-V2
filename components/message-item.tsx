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

  const base = "text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground"
  const userBubble =
    "inline-block max-w-[75ch] rounded-2xl px-3 py-2 bg-purple-600/20 border border-purple-500/30 shadow-sm"
  const assistantPlain = "max-w-[75ch]"

  return (
    <div className={cn("w-full flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(base, isUser ? userBubble : assistantPlain, isUser ? "ml-auto text-right" : "mr-auto text-left")}
        aria-label={isUser ? "User message" : "Assistant message"}
      >
        {content}
      </div>
    </div>
  )
}
