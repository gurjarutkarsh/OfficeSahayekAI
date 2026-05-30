import os
import base64
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "library.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class SavedImage(Base):
    __tablename__ = "saved_images"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(200), nullable=False)
    type       = Column(String(50), nullable=False)  # signature | seal | letterhead
    data       = Column(Text, nullable=False)         # base64 encoded image
    mime_type  = Column(String(50), default="image/png")
    created_at = Column(DateTime, default=datetime.utcnow)


class RecentDocument(Base):
    __tablename__ = "recent_documents"
    id           = Column(Integer, primary_key=True, index=True)
    filename     = Column(String(200), nullable=False)
    extracted_text = Column(Text, nullable=True)
    ai_response  = Column(Text, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


# ── Saved Images ──────────────────────────────────────────
def save_image(name: str, image_type: str, data: str, mime_type: str = "image/png"):
    db = SessionLocal()
    try:
        img = SavedImage(name=name, type=image_type, data=data, mime_type=mime_type)
        db.add(img)
        db.commit()
        db.refresh(img)
        return {"id": img.id, "name": img.name, "type": img.type, "created_at": str(img.created_at)}
    finally:
        db.close()


def list_images(image_type: str = None):
    db = SessionLocal()
    try:
        q = db.query(SavedImage)
        if image_type:
            q = q.filter(SavedImage.type == image_type)
        items = q.order_by(SavedImage.created_at.desc()).all()
        return [{"id": i.id, "name": i.name, "type": i.type,
                 "data": i.data, "mime_type": i.mime_type,
                 "created_at": str(i.created_at)} for i in items]
    finally:
        db.close()


def delete_image(image_id: int):
    db = SessionLocal()
    try:
        img = db.query(SavedImage).filter(SavedImage.id == image_id).first()
        if img:
            db.delete(img)
            db.commit()
            return True
        return False
    finally:
        db.close()


# ── Recent Documents ──────────────────────────────────────
def save_recent(filename: str, extracted_text: str, ai_response: str):
    db = SessionLocal()
    try:
        # Keep only last 10
        count = db.query(RecentDocument).count()
        if count >= 10:
            oldest = db.query(RecentDocument).order_by(RecentDocument.created_at.asc()).first()
            if oldest:
                db.delete(oldest)

        doc = RecentDocument(
            filename=filename,
            extracted_text=extracted_text[:5000],  # limit size
            ai_response=ai_response
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return {"id": doc.id, "filename": doc.filename, "created_at": str(doc.created_at)}
    finally:
        db.close()


def list_recent():
    db = SessionLocal()
    try:
        docs = db.query(RecentDocument).order_by(RecentDocument.created_at.desc()).all()
        return [{"id": d.id, "filename": d.filename,
                 "extracted_text": d.extracted_text,
                 "ai_response": d.ai_response,
                 "created_at": str(d.created_at)} for d in docs]
    finally:
        db.close()


def delete_recent(doc_id: int):
    db = SessionLocal()
    try:
        doc = db.query(RecentDocument).filter(RecentDocument.id == doc_id).first()
        if doc:
            db.delete(doc)
            db.commit()
            return True
        return False
    finally:
        db.close()