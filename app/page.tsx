"use client"

import { useState } from "react"

type Props = {
  sessionId: string
  onFirstUserMessage?: (title: string) => void
}

export default function ChatWindow({ sessionId, onFirstUserMessage }: Props) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState("")

  async function sendMessage() {
    if (!input.trim()) return

    // Add user message locally
    const userMsg = { role: "user", content: input }
    setMessages((prev) => [...prev, userMsg])

    try {
      // 🔹 Call FastAPI backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          session_id: sessionId,
        }),
      })

      const data = await res.json()

      const botMsg = { role: "assistant", content: data.response || "Error: no response" }
      setMessages((prev) => [...prev, botMsg])

      // If first user message → rename session
      if (messages.length === 0 && onFirstUserMessage) {
        onFirstUserMessage(input.slice(0, 30))
      }
    } catch (err) {
      console.error("Error sending message:", err)
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Error contacting server" }])
    }

    setInput("")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "text-right" : "text-left"}>
            <span
              className={`inline-block px-3 py-2 rounded-lg ${
                msg.role === "user" ? "bg-emerald-600 text-white" : "bg-gray-200 text-black"
              }`}
            >
              {msg.content}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 border rounded p-2"
          placeholder="Type your message..."
        />
        <button
          onClick={sendMessage}
          className="bg-emerald-600 text-white px-4 rounded hover:bg-emerald-700"
        >
          Send
        </button>
      </div>
    </div>
  )
}
