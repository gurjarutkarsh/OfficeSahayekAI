import os
from pdf2docx import Converter
from PIL import Image
import tempfile


def pdf_to_word(pdf_path: str) -> str:
    """Convert PDF to Word (.docx). Returns output file path."""
    output_path = pdf_path.replace(".pdf", ".docx")
    cv = Converter(pdf_path)
    cv.convert(output_path)
    cv.close()
    return output_path


def images_to_pdf(image_paths: list, output_path: str) -> str:
    """Convert one or more images to a single PDF. Returns output file path."""
    images = []
    for path in image_paths:
        img = Image.open(path).convert("RGB")
        images.append(img)
    if not images:
        raise ValueError("No images provided")
    images[0].save(
        output_path,
        save_all=True,
        append_images=images[1:],
        resolution=200
    )
    return output_path


def word_to_pdf(docx_path: str) -> str:
    """Convert Word (.docx) to PDF using LibreOffice. Returns output file path."""
    import subprocess
    output_dir = os.path.dirname(docx_path)
    result = subprocess.run(
        ["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", output_dir, docx_path],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"LibreOffice conversion failed: {result.stderr}")
    output_path = docx_path.replace(".docx", ".pdf")
    return output_path