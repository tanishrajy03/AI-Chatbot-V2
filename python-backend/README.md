# Python Backend (Flask + LiteLLM)

This app was imported from your attachment and slightly documented for integration.

- Entry: `app.py`
- Endpoint: `POST /chat` with JSON: `{ "message": "..." }`
- CORS is enabled.

Run locally:
1. `pip install flask flask-cors python-dotenv litellm`
2. Set env: `LITELLM_API_KEY=your_key`
3. `python app.py` (defaults to port 5000)

Connect the frontend:
- In the v0 Project Settings, add env var `BACKEND_URL` = `http://localhost:5000` (or your deployed URL).
- The Next route `/api/chat` will proxy to `${BACKEND_URL}/chat`.

Attachments:
- The frontend sends a combined message that includes a summary of uploaded files and extracted PDF text.
- If you want native multimodal handling, modify `app.py` to accept an `attachments` array and pass it to LiteLLM accordingly.
