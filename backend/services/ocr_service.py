import fitz
from PIL import Image
import pytesseract

def extract_text(file_path):
    extracted_text = ""

    #pdf extraction
    if file_path.lower().endswith(".pdf"):
        pdf = fitz.open(file_path)

        for page in pdf:
            extracted_text += page.get_text()

        pdf.close()


    #Image OCR
    elif file_path.lower().endswith((".png", ".jpg", ".jpeg")):
        image = Image.open(file_path)
        extracted_text = pytesseract.image_to_string(
            Image,
            lang="eng",
        )
    else:
        extracted_text = "Unsupported file type"

    return extracted_text
