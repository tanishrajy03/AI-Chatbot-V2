"use client"

import { useEffect, useState } from "react"
import ChatWindow from "@/components/chat-window"
import ChatSidebar from "@/components/chat-sidebar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

type Session = { id: string; title: string; createdAt: number }

function loadSessions(): Session[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem("chat:sessions") || "[]") as Session[]
  } catch {
    return []
  }
}

function saveSessions(sessions: Session[]) {
  if (typeof window === "undefined") return
  localStorage.setItem("chat:sessions", JSON.stringify(sessions))
}

export default function Page() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const s = loadSessions()
    setSessions(s)
    setActiveId(s[0]?.id ?? null)
  }, [])

  function handleNewChat() {
    const id = crypto.randomUUID()
    const newSession: Session = { id, title: "New chat", createdAt: Date.now() }
    const next = [newSession, ...sessions]
    setSessions(next)
    saveSessions(next)
    setActiveId(id)
  }

  function handleSelectSession(id: string) {
    setActiveId(id)
  }

  function handleRenameSession(id: string, title: string) {
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, title } : s))
      saveSessions(next)
      return next
    })
  }

  return (
    <main className="h-dvh w-full bg-background text-foreground">
      <div className="flex h-full">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-72 shrink-0 border-r border-border">
          <ChatSidebar
            sessions={sessions}
            activeId={activeId ?? ""}
            onNewChat={handleNewChat}
            onSelectSession={handleSelectSession}
          />
        </aside>

        {/* Mobile header + sheet sidebar */}
        <div className="flex md:hidden w-full flex-col">
          <header className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open sidebar">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <ChatSidebar
                    sessions={sessions}
                    activeId={activeId ?? ""}
                    onNewChat={handleNewChat}
                    onSelectSession={handleSelectSession}
                  />
                </SheetContent>
              </Sheet>
              <span className="font-medium">Chat</span>
            </div>
          </header>
          <section className="flex-1">
            {activeId && (
              <ChatWindow
                key={activeId}
                sessionId={activeId}
                onFirstUserMessage={(title) => handleRenameSession(activeId, title)}
              />
            )}
          </section>
        </div>

        {/* Main chat area for md+ */}
        <section className="hidden md:block flex-1">
          {activeId ? (
            <ChatWindow
              key={activeId}
              sessionId={activeId}
              onFirstUserMessage={(title) => handleRenameSession(activeId, title)}
            />
          ) : (
            <div className="h-full grid place-items-center px-6">
              <Button onClick={handleNewChat} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Start your first chat
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
