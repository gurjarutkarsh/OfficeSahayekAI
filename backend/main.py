import os
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from services.ocr_service import extract_text
from services.ai_service import analyze_document, ask_document, translate_to_hindi
from services.doc_service import pdf_to_word, images_to_pdf, word_to_pdf
from services.db_service import (
    save_image, list_images, delete_image,
    save_recent, list_recent, delete_recent
)
from services.Auth_services import (
    create_user, authenticate_user, get_user_by_id,
    create_token, decode_token
)

app = FastAPI(title="OfficeSahayek AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174",
                   "http://127.0.0.1:5173", "http://172.20.10.5:5173","https://office-sahayek-ai.vercel.app/"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000").rstrip("/")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

security = HTTPBearer(auto_error=False)


# ── Auth dependency ───────────────────────────────────────
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = get_user_by_id(int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    return get_user_by_id(int(payload["sub"]))


# ── Pydantic Models ───────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class QuestionRequest(BaseModel):
    question: str
    text: str
    hindi: bool = False
    history: Optional[List[dict]] = []

class TranslateRequest(BaseModel):
    summary: str
    points: str
    hindi: str
    actions: str

class SaveImageRequest(BaseModel):
    name: str
    type: str
    data: str
    mime_type: str = "image/png"

class SaveRecentRequest(BaseModel):
    filename: str
    extracted_text: str
    ai_response: str = ""

class Message(BaseModel):
    question: str
    answer: str


# ── Health ────────────────────────────────────────────────
@app.get("/")
def home():
    return {"message": "OfficeSahayek AI backend is running"}


# ── Auth endpoints ────────────────────────────────────────
@app.post("/auth/register")
async def register(req: RegisterRequest):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user, error = create_user(req.email, req.name, req.password)
    if error:
        raise HTTPException(status_code=400, detail=error)
    token = create_token(user.id, user.email)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}

@app.post("/auth/login")
async def login(req: LoginRequest):
    user = authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user.id, user.email)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}

@app.get("/auth/me")
async def me(current_user=Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name}


# ── Document Analysis ─────────────────────────────────────
@app.post("/upload")
async def upload(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    file_path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}_{file.filename}")
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    extracted_text = extract_text(file_path)
    ai_response = analyze_document(extracted_text)
    try:
        save_recent(file.filename, extracted_text[:5000], str(ai_response), user_id=current_user.id)
    except:
        pass
    return {
        "filename": file.filename,
        "text": extracted_text[:3000],
        "ai_response": ai_response
    }

@app.post("/extract-text")
async def extract_text_only(file: UploadFile = File(...), current_user=Depends(get_current_user)):
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


# ── Q&A ───────────────────────────────────────────────────
@app.post("/ask")
async def ask(req: QuestionRequest, current_user=Depends(get_current_user)):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    history = req.history or []
    answer = ask_document(req.question, req.text, req.hindi, history)
    return {"question": req.question, "answer": answer}


# ── Translation ───────────────────────────────────────────
@app.post("/translate")
async def translate(req: TranslateRequest, current_user=Depends(get_current_user)):
    result = translate_to_hindi(req.dict())
    return {"translated": result}


# ── PDF to Images ─────────────────────────────────────────
@app.post("/convert/pdf-to-images")
async def pdf_to_images(file: UploadFile = File(...), current_user=Depends(get_current_user)):
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
            image_urls.append(f"{BASE_URL}/page-image/{img_filename}")
            BASE_URL = os.getenv("BASE_URL", "https://officesahayekai.onrender.com").rstrip("/")
        doc.close()
        return {"pages": image_urls, "total": len(image_urls)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)

@app.get("/page-image/{filename}")
async def get_page_image(filename: str):
    path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type="image/png")


# ── PDF to Word ───────────────────────────────────────────
@app.post("/convert/pdf-to-word")
async def convert_pdf_to_word(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file")
    file_id = str(uuid.uuid4())
    pdf_path = os.path.join(UPLOAD_FOLDER, f"{file_id}.pdf")
    with open(pdf_path, "wb") as f:
        f.write(await file.read())
    try:
        docx_path = pdf_to_word(pdf_path)
        return FileResponse(docx_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=file.filename.replace(".pdf", ".docx"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(pdf_path): os.remove(pdf_path)


# ── Word to PDF ───────────────────────────────────────────
@app.post("/convert/word-to-pdf")
async def convert_word_to_pdf(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Please upload a .docx file")
    file_id = str(uuid.uuid4())
    docx_path = os.path.join(UPLOAD_FOLDER, f"{file_id}.docx")
    with open(docx_path, "wb") as f:
        f.write(await file.read())
    try:
        pdf_path = word_to_pdf(docx_path)
        return FileResponse(pdf_path, media_type="application/pdf",
            filename=file.filename.replace(".docx", ".pdf"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(docx_path): os.remove(docx_path)


# ── Images to PDF ─────────────────────────────────────────
@app.post("/convert/images-to-pdf")
async def convert_images_to_pdf(files: List[UploadFile] = File(...), current_user=Depends(get_current_user)):
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
        return FileResponse(output_path, media_type="application/pdf", filename="converted.pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        for path in image_paths:
            if os.path.exists(path): os.remove(path)


# ── Library ───────────────────────────────────────────────
@app.post("/library/save-image")
async def api_save_image(req: SaveImageRequest, current_user=Depends(get_current_user)):
    return save_image(req.name, req.type, req.data, req.mime_type, user_id=current_user.id)

@app.get("/library/images")
async def api_list_images(type: str = None, current_user=Depends(get_current_user)):
    return list_images(type, user_id=current_user.id)

@app.delete("/library/images/{image_id}")
async def api_delete_image(image_id: int, current_user=Depends(get_current_user)):
    success = delete_image(image_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"deleted": True}

@app.post("/library/save-recent")
async def api_save_recent(req: SaveRecentRequest, current_user=Depends(get_current_user)):
    return save_recent(req.filename, req.extracted_text, req.ai_response, user_id=current_user.id)

@app.get("/library/recent")
async def api_list_recent(current_user=Depends(get_current_user)):
    return list_recent(user_id=current_user.id)

@app.delete("/library/recent/{doc_id}")
async def api_delete_recent(doc_id: int, current_user=Depends(get_current_user)):
    success = delete_recent(doc_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"deleted": True}