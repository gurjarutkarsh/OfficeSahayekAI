import os
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
from services.ocr_service import extract_text
from services.ai_service import analyze_document, ask_document, translate_to_hindi
from services.doc_service import pdf_to_word, images_to_pdf, word_to_pdf

app = FastAPI(title="MS-INDRAVIR")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ── Pydantic Models ───────────────────────────────────────
class QuestionRequest(BaseModel):
    question: str
    text: str

class TranslateRequest(BaseModel):
    summary: str
    points: str
    hindi: str
    actions: str


# ── Health ────────────────────────────────────────────────
@app.get("/")
def home():
    return {"message": "AI backend is running"}


# ── Document Analysis ─────────────────────────────────────
@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    extracted_text = extract_text(file_path)
    ai_response = analyze_document(extracted_text)
    return {
        "filename": file.filename,
        "text": extracted_text[:3000],
        "ai_response": ai_response
    }


# ── Extract Text Only (no AI) ─────────────────────────────
@app.post("/extract-text")
async def extract_text_only(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower()
    file_path = os.path.join(UPLOAD_FOLDER, f"{file_id}{ext}")
    with open(file_path, "wb") as f:
        f.write(await file.read())
    try:
        text = extract_text(file_path)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


# ── PDF to Images ─────────────────────────────────────────
@app.post("/convert/pdf-to-images")
async def pdf_to_images(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    pdf_path = os.path.join(UPLOAD_FOLDER, f"{file_id}.pdf")
    with open(pdf_path, "wb") as f:
        f.write(await file.read())
    try:
        import fitz
        doc = fitz.open(pdf_path)
        image_urls = []
        for page in doc:
            mat = fitz.Matrix(2, 2)
            pix = page.get_pixmap(matrix=mat)
            img_filename = f"{file_id}_page_{page.number}.png"
            img_path = os.path.join(UPLOAD_FOLDER, img_filename)
            pix.save(img_path)
            image_urls.append(f"http://127.0.0.1:8000/page-image/{img_filename}")
        doc.close()
        return {"pages": image_urls, "total": len(image_urls)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)


# ── Serve Page Images ─────────────────────────────────────
@app.get("/page-image/{filename}")
async def get_page_image(filename: str):
    path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type="image/png")


# ── Q&A ───────────────────────────────────────────────────
@app.post("/ask")
async def ask(req: QuestionRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    answer = ask_document(req.question, req.text)
    return {"question": req.question, "answer": answer}


# ── Translation ───────────────────────────────────────────
@app.post("/translate")
async def translate(req: TranslateRequest):
    result = translate_to_hindi(req.dict())
    return {"translated": result}


# ── PDF to Word ───────────────────────────────────────────
@app.post("/convert/pdf-to-word")
async def convert_pdf_to_word(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file")
    file_id = str(uuid.uuid4())
    pdf_path = os.path.join(UPLOAD_FOLDER, f"{file_id}.pdf")
    with open(pdf_path, "wb") as f:
        f.write(await file.read())
    try:
        docx_path = pdf_to_word(pdf_path)
        return FileResponse(
            docx_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=file.filename.replace(".pdf", ".docx")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)


# ── Word to PDF ───────────────────────────────────────────
@app.post("/convert/word-to-pdf")
async def convert_word_to_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Please upload a .docx file")
    file_id = str(uuid.uuid4())
    docx_path = os.path.join(UPLOAD_FOLDER, f"{file_id}.docx")
    with open(docx_path, "wb") as f:
        f.write(await file.read())
    try:
        pdf_path = word_to_pdf(docx_path)
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=file.filename.replace(".docx", ".pdf")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(docx_path):
            os.remove(docx_path)


# ── Images to PDF ─────────────────────────────────────────
@app.post("/convert/images-to-pdf")
async def convert_images_to_pdf(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one image")
    file_id = str(uuid.uuid4())
    image_paths = []
    for i, file in enumerate(files):
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png"]:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
        img_path = os.path.join(UPLOAD_FOLDER, f"{file_id}_{i}{ext}")
        with open(img_path, "wb") as f:
            f.write(await file.read())
        image_paths.append(img_path)
    output_path = os.path.join(UPLOAD_FOLDER, f"{file_id}_output.pdf")
    try:
        images_to_pdf(image_paths, output_path)
        return FileResponse(
            output_path,
            media_type="application/pdf",
            filename="converted.pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        for path in image_paths:
            if os.path.exists(path):
                os.remove(path)