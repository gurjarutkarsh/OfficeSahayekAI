# 🏢 Office Sahayak AI

> **Automate office work for non-tech users — no technical knowledge required.**

🌐 **Live Demo:** [office-sahayek-ai.vercel.app](https://office-sahayek-ai.vercel.app)

---

## What is Office Sahayak AI?

Office Sahayak AI is a full-stack, AI-powered document assistant built for India's government and business users who deal with complex paperwork daily — but lack the technical skills to process it efficiently.

Upload a PDF or image, and the app handles everything: summarisation, Q&A, Hindi translation, voice interaction, and document generation — all in one place.

---

## Features

- 📄 **Document Analysis** — Upload PDFs or images; get instant summaries and key insights
- 🤖 **AI Q&A** — Ask questions about your document in plain language (powered by Gemini AI)
- 🌐 **Hindi Translation** — Translate document content to Hindi for regional accessibility
- 🎙️ **Voice Interaction** — Speak your queries; get spoken responses via text-to-speech
- 📝 **Letterhead Generation** — Auto-generate official letterheads from document content
- ✍️ **PDF Signature & Seal Insertion** — Add digital signatures and official seals to documents
- 🔄 **File Format Conversion** — Convert between PDF, DOCX, and image formats
- 🌍 **Multilingual Interface** — Designed for non-technical users across India

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, CSS3 |
| Backend | FastAPI (Python) |
| AI / LLM | Google Gemini AI |
| OCR | Tesseract OCR, PaddleOCR |
| PDF Processing | PyMuPDF, pdf2docx |
| Deployment | Vercel (frontend), Docker |

---

## Project Structure

```
OfficeSahayekAI/
├── frontend/          # React.js frontend
├── backend/           # FastAPI backend
├── main.py            # App entry point
├── requirments.txt    # Python dependencies
└── docker-compose.yml # Docker setup
```

---

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- Tesseract OCR installed on your system ([install guide](https://github.com/tesseract-ocr/tesseract))
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

### 1. Clone the repo

```bash
git clone https://github.com/gurjarutkarsh/OfficeSahayekAI.git
cd OfficeSahayekAI
```

### 2. Set up the backend

```bash
pip install -r requirments.txt
```

Create a `.env` file in the root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the backend:

```bash
uvicorn main:app --reload
```

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Or run with Docker

```bash
docker-compose up --build
```

The app will be available at `http://localhost:5173` (frontend) and `http://localhost:8000` (backend API).

---

## Why This Project?

India has millions of government and small business workers who handle complex documents daily — land records, official letters, NOCs, licences — but struggle with language barriers and lack of digital tools. Office Sahayak AI bridges that gap by bringing AI document processing to users who need it most, in the language they understand.

---

## Author

**Utkarsh Gurjar**
[LinkedIn](https://www.linkedin.com/in/utkarsh-gurjar-7a92591b4/) · [GitHub](https://github.com/gurjarutkarsh)