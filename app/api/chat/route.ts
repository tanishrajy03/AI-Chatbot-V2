import { NextResponse } from "next/server"

type Msg = { role: "user" | "assistant"; content: string }

export async function POST(req: Request) {
  try {
    const accept = req.headers.get("accept") || ""
    const { input } = await req.json()
    const backend = process.env.BACKEND_URL
    if (!backend) {
      return NextResponse.json(
        { error: "Missing BACKEND_URL. Set it in Project Settings (e.g., http://localhost:5000)." },
        { status: 500 },
      )
    }

    const upstream = await fetch(`${backend.replace(/\/$/, "")}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    })

    if (accept.includes("text/event-stream")) {
      const encoder = new TextEncoder()
      const contentType = upstream.headers.get("content-type") || ""

      // If backend already streams SSE, pass it through.
      if (contentType.includes("text/event-stream") && upstream.body) {
        const reader = upstream.body.getReader()
        const stream = new ReadableStream({
          async pull(controller) {
            const { value, done } = await reader.read()
            if (done) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              controller.close()
              return
            }
            controller.enqueue(value)
          },
        })
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        })
      }

      // Otherwise, read JSON and simulate streaming tokens.
      if (!upstream.ok) {
        const text = await upstream.text()
        const errStream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(`Backend error: ${text}`)}\n\n`))
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          },
        })
        return new Response(errStream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
          status: 500,
        })
      }

      const data = await upstream.json()
      const full = (data?.reply as string) ?? data?.response ?? ""
      const tokens = full.match(/.{1,12}/g) || [] // small chunks

      const stream = new ReadableStream({
        start(controller) {
          let i = 0
          function push() {
            if (i < tokens.length) {
              controller.enqueue(encoder.encode(`data: ${tokens[i++]}\n\n`))
              setTimeout(push, 20)
            } else {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              controller.close()
            }
          }
          push()
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      })
    }

    // Fallback: non-stream JSON response as before.
    if (!upstream.ok) {
      const text = await upstream.text()
      return NextResponse.json({ error: `Backend error: ${text}` }, { status: 500 })
    }
    const data = await upstream.json()
    const reply = data?.reply ?? data?.response ?? ""
    return NextResponse.json({ reply })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}
