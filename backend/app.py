import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
import re
import requests
from dotenv import load_dotenv
import json

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

app = Flask(__name__)
CORS(app)

# 1. PDF to text extraction
def extract_pdf_text(file):
    with pdfplumber.open(file) as pdf:
        text = "\n".join([page.extract_text() or "" for page in pdf.pages])
    return text

# 2. Simple split for topics
def split_into_topics(text):
    sections = re.split(r"(?:\n|^)\s*(?:Chapter|Section|[0-9]+\.)[^\n]*\n", text)
    topics = [t.strip() for t in sections if len(t.strip()) > 120]
    return topics

# JSON cleaning/parsing helpers
def clean_openrouter_output(txt):
    txt = txt.lstrip('` \n\t')
    if not txt.startswith("{"):
        first_brace = txt.find('{')
        if first_brace != -1:
            txt = txt[first_brace:]
        else:
            txt = "{" + txt
    if txt.count('{') > txt.count('}'):
        txt = txt + "}"
    last_brace = txt.rfind('}')
    if last_brace != -1 and last_brace < len(txt) - 1:
        txt = txt[:last_brace + 1]
    if "'" in txt and '"' not in txt:
        txt = txt.replace("'", '"')
    return txt.strip()

def parse_strict_json(txt):
    try:
        return json.loads(txt)
    except Exception as e:
        print("\nOpenRouter or JSON parse error:", e)
        print("Final JSON guess sent to parser:\n", txt, "\n-----END MODEL OUTPUT-----\n")
        return None

def openrouter_generate(topic_text, type_):
    if type_ == "flashcards":
        prompt = (
            f"Given the following text:\n\n{topic_text[:1500]}\n"
            "Create 8 to 15 flashcards from this text. "
            "IGNORE any information about the author, publisher, module numbers, institutes, table of contents, prefaces, copyright, or anything not related to the main subject matter. "
            "Do NOT create flashcards about headings, document structure, or generic book information. Only use real factual and conceptual content. "
            "Each flashcard should be a useful question (with keys: 'question', 'answer') for a student studying the IMPORT** of the passage. "
            'Return ONLY valid JSON: {"flashcards": [ ... ] } '
            "All keys and string values MUST be double-quoted. Do NOT add any text, comments, or explanations before or after the JSON."
    )

    elif type_ == "quiz":
       
        prompt = (
        f"Given the following text:\n\n{topic_text[:1500]}\n"
        "Your task is to create 4 to 8 multiple-choice quiz questions that test understanding of the FACTUAL and CONCEPTUAL content in the main teaching or subject matter of the passage. "
        "IGNORE and DO NOT create any quiz questions about the author, publisher, institute, module numbers, chapter/section titles, copyright notices, table of contents, or document structure. "
        "Exclude questions about who wrote the text, where it was written, or anything not related to subject facts or concepts. "
        "Each question must have:\n"
        " - a 'question' key (the MCQ),\n"
        " - an 'options' key (a list of 4 plausible answer choices),\n"
        " - an 'answer' key (the CORRECT answer string exactly matching one of the options).\n"
        "Return ONLY valid JSON: {\"quiz\": [ ... ] }\n"
        "All keys and string values MUST be double-quoted. Do NOT add any extra text, comments, explanations, or code block markers before or after the JSON."
    )

    else:  # summary (default)
        prompt = (
        f"Given the following text:\n\n{topic_text[:1500]}\n"
        "Write a clear multi-paragraph summary covering ONLY the main facts, important concepts, and substantive teaching points from the passage. "
        "IGNORE and DO NOT include anything about the author, publisher, copyright, module numbers, table of contents, document section headings, or preface/acknowledgement/institutional notes. "
        "Focus ONLY on summarizing the primary educational or subject matter content. "
        "Return ONLY valid JSON: {\"summary\": \"...\" }\n"
        "All keys and string values MUST be double-quoted. Do NOT add any extra text, comments, explanations, or code block markers before or after the JSON."
    )
    

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "meta-llama/llama-3.1-8b-instruct",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 1800,
        "temperature": 0.4,
    }
    response = requests.post(url, headers=headers, json=data)
    if response.status_code != 200:
        print("OpenRouter API error:", response.text)
        return {
            "summary": "",
            "flashcards": [],
            "quiz": [],
            "error": f"OpenRouter error: {response.status_code} {response.text}"
        }
    result = response.json()
    # Check output format
    reply = result["choices"][0]["message"]["content"]
    cleaned_txt = clean_openrouter_output(reply)
    data = parse_strict_json(cleaned_txt)
    if data:
        return data
    else:
        return {
            "summary": "Could not generate summary.",
            "flashcards": [],
            "quiz": [],
            "error": "OpenRouter output was not valid JSON. Please retry or check logs."
        }

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    type_ = request.form.get('type', 'flashcards')  # 'flashcards' or 'quiz' or 'summary'
    text = extract_pdf_text(file)
    topics = split_into_topics(text)
    results = []

    # Call generator based on type requested:
    for i, sec in enumerate(topics):
        ai = openrouter_generate(sec, type_)
        results.append({
            "title": f"Topic {i+1}",
            **ai  # will contain only flashcards or quiz or summary
        })

    return jsonify({
        "topics": results
    })


if __name__ == '__main__':
    app.run(port=8000, debug=True)
