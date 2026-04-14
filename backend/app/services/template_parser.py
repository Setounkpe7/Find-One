import pdfplumber
from docx import Document


def parse_pdf(file_path: str) -> str:
    text_parts = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            extracted = page.extract_text()
            if extracted:
                text_parts.append(extracted)
    return "\n".join(text_parts)


def parse_docx(file_path: str) -> str:
    doc = Document(file_path)
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())


def parse_template(file_path: str, file_type: str) -> str:
    if file_type == "pdf":
        return parse_pdf(file_path)
    if file_type == "docx":
        return parse_docx(file_path)
    raise ValueError(f"Unsupported file type: {file_type}")
