export async function sendMessage(message: string, sessionId = "default") {
  const res = await fetch("https://my-ai-chatbot-n93k.onrender.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch from backend");
  }

  const data = await res.json();
  return data.response;
}
