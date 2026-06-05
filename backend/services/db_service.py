import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./library.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SavedImage(Base):
    __tablename__ = "saved_images"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(200), nullable=False)
    type       = Column(String(50), nullable=False)
    data       = Column(Text, nullable=False)
    mime_type  = Column(String(50), default="image/png")
    user_id    = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RecentDocument(Base):
    __tablename__ = "recent_documents"
    id             = Column(Integer, primary_key=True, index=True)
    filename       = Column(String(200), nullable=False)
    extracted_text = Column(Text, nullable=True)
    ai_response    = Column(Text, nullable=True)
    user_id        = Column(Integer, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


# ── Saved Images ──────────────────────────────────────────
def save_image(name: str, image_type: str, data: str, mime_type: str = "image/png", user_id: int = None):
    db = SessionLocal()
    try:
        img = SavedImage(name=name, type=image_type, data=data, mime_type=mime_type, user_id=user_id)
        db.add(img)
        db.commit()
        db.refresh(img)
        return {"id": img.id, "name": img.name, "type": img.type, "created_at": str(img.created_at)}
    finally:
        db.close()


def list_images(image_type: str = None, user_id: int = None):
    db = SessionLocal()
    try:
        q = db.query(SavedImage)
        if user_id:
            q = q.filter(SavedImage.user_id == user_id)
        if image_type:
            q = q.filter(SavedImage.type == image_type)
        items = q.order_by(SavedImage.created_at.desc()).all()
        return [{"id": i.id, "name": i.name, "type": i.type,
                 "data": i.data, "mime_type": i.mime_type,
                 "created_at": str(i.created_at)} for i in items]
    finally:
        db.close()


def delete_image(image_id: int, user_id: int = None):
    db = SessionLocal()
    try:
        q = db.query(SavedImage).filter(SavedImage.id == image_id)
        if user_id:
            q = q.filter(SavedImage.user_id == user_id)
        img = q.first()
        if img:
            db.delete(img)
            db.commit()
            return True
        return False
    finally:
        db.close()


# ── Recent Documents ──────────────────────────────────────
def save_recent(filename: str, extracted_text: str, ai_response: str, user_id: int = None):
    db = SessionLocal()
    try:
        q = db.query(RecentDocument)
        if user_id:
            q = q.filter(RecentDocument.user_id == user_id)
        count = q.count()
        if count >= 10:
            oldest = q.order_by(RecentDocument.created_at.asc()).first()
            if oldest:
                db.delete(oldest)
        doc = RecentDocument(
            filename=filename,
            extracted_text=extracted_text[:5000],
            ai_response=ai_response,
            user_id=user_id
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return {"id": doc.id, "filename": doc.filename, "created_at": str(doc.created_at)}
    finally:
        db.close()


def list_recent(user_id: int = None):
    db = SessionLocal()
    try:
        q = db.query(RecentDocument)
        if user_id:
            q = q.filter(RecentDocument.user_id == user_id)
        docs = q.order_by(RecentDocument.created_at.desc()).all()
        return [{"id": d.id, "filename": d.filename,
                 "extracted_text": d.extracted_text,
                 "ai_response": d.ai_response,
                 "created_at": str(d.created_at)} for d in docs]
    finally:
        db.close()


def delete_recent(doc_id: int, user_id: int = None):
    db = SessionLocal()
    try:
        q = db.query(RecentDocument).filter(RecentDocument.id == doc_id)
        if user_id:
            q = q.filter(RecentDocument.user_id == user_id)
        doc = q.first()
        if doc:
            db.delete(doc)
            db.commit()
            return True
        return False
    finally:
        db.close()