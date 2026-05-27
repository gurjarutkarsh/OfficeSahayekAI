import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def analyze_document(extracted_text):
    prompt = f"""
    You are an AI assistant developed by MS INDRAVIR.
    Return your answer in EXACTLY this format:
    SUMMARY:
    <summary>
    IMPORTANT_POINTS:
    <important points>
    HINDI_EXPLANATION:
    <hindi explanation>
    ACTIONS:
    <suggested actions>
    Document:
    {extracted_text}
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return {
        "ai_response": response.text
    }


def ask_document(question, extracted_text):
    prompt = f"""
    You are an AI assistant. Answer the user's question based ONLY on the document below.
    If the answer is not in the document, say "I could not find this information in the document."
    Be clear and simple. Answer in 2-4 sentences.

    Document:
    {extracted_text}

    Question: {question}
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return response.text

def translate_to_hindi(content: dict):
    prompt = f"""
    Translate the following document analysis to Hindi (Devanagari script).
    Keep the same structure. Return EXACTLY in this format:

    SUMMARY:
    <hindi summary>
    IMPORTANT_POINTS:
    <hindi points>
    HINDI_EXPLANATION:
    <hindi explanation>
    ACTIONS:
    <hindi actions>

    Content to translate:
    SUMMARY: {content.get('summary', '')}
    IMPORTANT_POINTS: {content.get('points', '')}
    HINDI_EXPLANATION: {content.get('hindi', '')}
    ACTIONS: {content.get('actions', '')}
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return response.text


    # testing bug
    # response = client.models.generate_content(
    #     model="gemini-2.5-flash",
    #     contents=prompt
    # )
    # print("RAW GEMINI RESPONSE:", response.text)  # add this
    # return {
    #     "ai_response": response.text
    # }