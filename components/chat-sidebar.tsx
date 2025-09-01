"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { useMemo, useState } from "react"

type Session = { id: string; title: string; createdAt: number }

export default function ChatSidebar({
  sessions = [],
  activeId,
  onNewChat,
  onSelectSession,
}: {
  sessions: Session[]
  activeId: string
  onNewChat: () => void
  onSelectSession: (id: string) => void
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return sessions.filter((s) => s.title.toLowerCase().includes(q)).sort((a, b) => b.createdAt - a.createdAt)
  }, [sessions, query])

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <div className="p-3 border-b border-border">
        <Button
          onClick={onNewChat}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          aria-label="Start new chat"
        >
          <Plus className="mr-2 h-4 w-4" />
          New chat
        </Button>
      </div>

      <div className="p-3">
        <label htmlFor="search" className="sr-only">
          Search chats
        </label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Search"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <ul className="space-y-1">
          {filtered.map((s) => (
            <li key={s.id}>
              <Button
                variant="ghost"
                className={`w-full justify-start text-left font-normal ${activeId === s.id ? "bg-muted" : ""}`}
                title={s.title}
                onClick={() => onSelectSession(s.id)}
              >
                <span className="line-clamp-1">{s.title}</span>
              </Button>
            </li>
          ))}
          {filtered.length === 0 && <li className="px-2 py-1 text-xs text-muted-foreground">No chats found</li>}
        </ul>
      </nav>

      <div className="mt-auto p-3 border-t border-border text-xs text-muted-foreground">Free</div>
    </div>
  )
}
