from flask import Flask, request, jsonify
from flask_cors import CORS

from litellm import completion
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

SYSTEM_PROMPT="""You are a friendly and expert coding assistant. 
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



@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message','')

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ]

        response = completion(
            model="gemini/gemini-1.5-flash",
            messages=messages,
            api_key=os.getenv("LITELLM_API_KEY")
        )

        ai_response = response['choices'][0]['message']['content']
        
        return jsonify({
            'response': ai_response
        })

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return jsonify({
            'error': 'Sorry, I encountered an error processing your request. Please try again.'
        }), 500
    
# @app.route('/health', methods=['GET'])
# def health_check():
#     return jsonify({'status': 'ok'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
