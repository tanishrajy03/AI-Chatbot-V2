import { NextResponse } from "next/server"

type Msg = { role: "user" | "assistant"; content: string }

export async function POST(req: Request) {
  try {
    const { input } = await req.json()
    const backend = process.env.BACKEND_URL
    if (!backend) {
      return NextResponse.json(
        { error: "Missing BACKEND_URL. Set it in Project Settings (e.g., http://localhost:5000)." },
        { status: 500 },
      )
    }

    const res = await fetch(`${backend.replace(/\/$/, "")}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Backend error: ${text}` }, { status: 500 })
    }

    const data = await res.json()
    // Flask returns { response: string }
    const reply = data?.response ?? ""
    return NextResponse.json({ reply })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}
