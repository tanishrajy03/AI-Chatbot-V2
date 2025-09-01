from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from litellm import completion
from dotenv import load_dotenv
import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

# Load environment variables
load_dotenv()

# FastAPI setup
app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # adjust for security in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pinecone setup
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = "chat-memory"
index = pc.Index(index_name)

# Embedding model
embedder = SentenceTransformer("all-MiniLM-L6-v2")

SYSTEM_PROMPT = """You are a friendly and expert coding assistant. 
Always respond in a conversational, encouraging tone. 
Be empathetic, use natural language, and offer helpful suggestions. 
If the user seems stuck, reassure them and offer step-by-step guidance.

BEHAVIOR GUIDELINES:
1. Review your answer for clarity and completeness.
2. Structure responses with clear sections and headings.
3. Keep initial responses concise but comprehensive.
4. End with: "Need more details on any part? Just ask!"
5. Focus on coding problems, debugging, and project development.

RESPONSE FORMAT:
- Start with a brief, friendly summary.
- Provide essential code/steps only.
- Use clear headings when needed.
- Be precise, actionable, and supportive.

SPECIALTIES: Python, JavaScript, web development, debugging, project architecture, best practices.
"""

# Pydantic schema for request body
class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

# Helper to store message in Pinecone
def store_message(session_id: str, role: str, content: str):
    vector = embedder.encode(content).tolist()
    index.upsert([
        {
            "id": f"{session_id}-{role}-{os.urandom(4).hex()}",
            "values": vector,
            "metadata": {"role": role, "content": content, "session": session_id}
        }
    ])

# Helper to retrieve memory
def retrieve_memory(session_id: str, query: str, top_k: int = 5):
    vector = embedder.encode(query).tolist()
    results = index.query(
        vector=vector,
        top_k=top_k,
        filter={"session": {"$eq": session_id}},
        include_metadata=True
    )
    past_msgs = []
    for match in results.get("matches", []):
        meta = match["metadata"]
        past_msgs.append({"role": meta["role"], "content": meta["content"]})
    return past_msgs

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        user_message = request.message
        session_id = request.session_id

        if not user_message:
            return {"error": "No message provided"}

        # 🔹 Retrieve past memory
        memory = retrieve_memory(session_id, user_message)

        # 🔹 Build full conversation
        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + memory + [
            {"role": "user", "content": user_message}
        ]

        # 🔹 Get AI response
        response = completion(
            model="gemini/gemini-1.5-flash",
            messages=messages,
            api_key=os.getenv("LITELLM_API_KEY")
        )
        ai_response = response['choices'][0]['message']['content']

        # 🔹 Store conversation in Pinecone
        store_message(session_id, "user", user_message)
        store_message(session_id, "assistant", ai_response)

        return {"response": ai_response}

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return {"error": "Sorry, I encountered an error processing your request. Please try again."}

