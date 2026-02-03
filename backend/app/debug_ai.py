import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("OPENAI_API_KEY")
print(f"Testing Key: {key[:5]}...")

try:
    client = OpenAI(api_key=key)
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Say hello."}],
    )
    print(f"Response: {completion.choices[0].message.content}")
except Exception as e:
    print(f"Error: {e}")
