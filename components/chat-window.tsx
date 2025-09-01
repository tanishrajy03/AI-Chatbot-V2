"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, Send, Paperclip, X } from "lucide-react"
import { MessageItem } from "./message-item"

type ChatMessage = { role: "user" | "assistant"; content: string }

async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/build/pdf")
    // @ts-ignore
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js"
    const arrayBuffer = await file.arrayBuffer()
    // @ts-ignore
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
    let text = ""
    const maxPages = Math.min(pdf.numPages, 10)
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ") + "\n"
      if (text.length > 20000) break
    }
    return text.trim()
  } catch {
    return ""
  }
}

function loadMessages(sessionId: string): ChatMessage[] {
  try {
    return JSON.parse(localStorage.getItem(`chat:messages:${sessionId}`) || "[]")
  } catch {
    return []
  }
}

function saveMessages(sessionId: string, msgs: ChatMessage[]) {
  localStorage.setItem(`chat:messages:${sessionId}`, JSON.stringify(msgs))
}

export default function ChatWindow({
  sessionId,
  onFirstUserMessage,
}: {
  sessionId: string
  onFirstUserMessage?: (title: string) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const m = loadMessages(sessionId)
    setMessages(m)
  }, [sessionId])

  useEffect(() => {
    saveMessages(sessionId, messages)
    if (messages.length === 1 && messages[0].role === "user" && onFirstUserMessage) {
      const title = messages[0].content.slice(0, 40)
      onFirstUserMessage(title)
    }
  }, [messages, sessionId, onFirstUserMessage])

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  function onAttachClick() {
    fileInputRef.current?.click()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length) {
      setFiles((prev) => [...prev, ...selected])
    }
    e.currentTarget.value = ""
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const content = input.trim()
    if ((!content && files.length === 0) || isLoading) return

    // 🔹 Build file context
    let attachmentContext = ""
    const pdfs = files.filter((f) => f.type === "application/pdf")
    if (pdfs.length) {
      const pdfExtracts = await Promise.all(
        pdfs.map(async (pdf) => {
          const txt = await extractPdfText(pdf)
          return `PDF: ${pdf.name}\n${
            txt ? txt.slice(0, 8000) : "[Text extraction unavailable]"
          }`
        })
      )
      attachmentContext += pdfExtracts.map((s) => `\n\n${s}`).join("")
    }
    const images = files.filter((f) => f.type.startsWith("image/"))
    if (images.length) {
      attachmentContext += `\n\nImages attached: ${images.map((f) => f.name).join(", ")}`
    }

    const mergedUserContent =
      (content ? content : "Please analyze the attached files.") +
      (attachmentContext ? `\n\nAttachments:\n${attachmentContext}` : "")

    const draft = [...messages, { role: "user", content: mergedUserContent }]
    setMessages(draft)
    setInput("")
    setFiles([])
    setIsLoading(true)

    try {
      // 🔹 Call FastAPI backend
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: mergedUserContent, session_id: sessionId }),
        }
      )

      const data = await res.json()
      const reply = data?.response ?? "No response."

      setMessages((prev) => [...prev, { role: "assistant", content: reply }])
    } catch (err) {
      console.error("Chat error:", err)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Sorry, something went wrong. Please try again." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const isEmpty = messages.length === 0
  const hasFiles = files.length > 0
  const fileChips = useMemo(
    () =>
      files.map((f) => (
        <span
          key={f.name}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
          title={f.name}
        >
          {f.name}
          <button
            type="button"
            aria-label={`Remove ${f.name}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={() => removeFile(f.name)}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )),
    [files]
  )

  return (
    <div className="flex h-full flex-col">
      {isEmpty ? (
        <div className="flex-1 grid place-items-center px-4">
          <div className="text-center max-w-xl">
            <h1 className="mb-6 text-2xl md:text-3xl font-semibold">Where should we begin?</h1>
            <form
              onSubmit={sendMessage}
              className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                hidden
                multiple
                accept="image/*,application/pdf"
                onChange={onFileChange}
              />
              <Button type="button" variant="ghost" size="icon" onClick={onAttachClick}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything"
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent"
              />
              <Button
                type="submit"
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={(!!input.trim() === false && !hasFiles) || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {hasFiles && <div className="mt-3 flex flex-wrap justify-center gap-2">{fileChips}</div>}
          </div>
        </div>
      ) : (
        <>
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">
            {messages.map((m, i) => (
              <MessageItem key={i} role={m.role} content={m.content} />
            ))}
          </div>

          <div className="px-3 md:px-8 py-3 border-t border-border bg-background">
            <form
              onSubmit={sendMessage}
              className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                hidden
                multiple
                accept="image/*,application/pdf"
                onChange={onFileChange}
              />
              <Button type="button" variant="ghost" size="icon" onClick={onAttachClick}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                id="composer-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Send a message"
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent"
              />
              <Button
                type="submit"
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={(!!input.trim() === false && !hasFiles) || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {hasFiles && <div className="mt-2 flex flex-wrap gap-2">{fileChips}</div>}
            <p className="mt-2 text-xs text-muted-foreground">
              AI may produce inaccuracies. Don’t share sensitive info.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
