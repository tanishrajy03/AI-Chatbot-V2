from flask import Flask, request, jsonify
from flask_cors import CORS
from litellm import completion
from dotenv import load_dotenv
import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

# Load environment variables
load_dotenv()

# Flask setup
app = Flask(__name__)
CORS(app)

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

# Helper to store message in Pinecone
def store_message(session_id, role, content):
    vector = embedder.encode(content).tolist()
    index.upsert([
        {
            "id": f"{session_id}-{role}-{os.urandom(4).hex()}",
            "values": vector,
            "metadata": {"role": role, "content": content, "session": session_id}
        }
    ])

# Helper to retrieve memory
def retrieve_memory(session_id, query, top_k=5):
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


@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        session_id = data.get('session_id', 'default')  # track user sessions

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

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

        return jsonify({'response': ai_response})

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return jsonify({
            'error': 'Sorry, I encountered an error processing your request. Please try again.'
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
