export async function sendMessage(message: string, sessionId = "default") {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!res.ok) throw new Error("Failed to fetch from backend");

  const data = await res.json();
  return data.response;
}
