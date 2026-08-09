import time
from pathlib import Path

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from validate_chunks import RAW_PDF_DIR, parse_filename, extract_text, chunk_by_year_semester

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

CHROMA_DIR = PROJECT_ROOT / "data" / "chroma_db"
COLLECTION_NAME = "program_structures"
EMBEDDING_MODEL = "gemini-embedding-001"
DELAY_BETWEEN_CALLS_SECONDS = 4  # ~15 requests/minute, safely under free-tier RPM caps


def build_documents() -> list[Document]:
    pdf_files = sorted(RAW_PDF_DIR.glob("*.pdf"))
    if not pdf_files:
        raise RuntimeError(f"No PDFs found in {RAW_PDF_DIR}")

    documents = []
    for pdf_path in pdf_files:
        try:
            level, branch = parse_filename(pdf_path)
        except ValueError as e:
            print(f"!! SKIPPING {pdf_path.name}: {e}")
            continue

        full_text = extract_text(pdf_path)
        chunks = chunk_by_year_semester(full_text, level, branch)

        for c in chunks:
            documents.append(Document(page_content=c["text"], metadata=c["metadata"]))

        print(f"{branch} ({level}): {len(chunks)} chunks prepared")

    return documents


def main():
    documents = build_documents()
    print(f"\nTotal documents to embed: {len(documents)}")

    embeddings = GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        task_type="RETRIEVAL_DOCUMENT",
    )

    print(f"Embedding via {EMBEDDING_MODEL} and writing to {CHROMA_DIR} ...")

    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=str(CHROMA_DIR),
    )
    
    ids = [
        f"{d.metadata['level']}_{d.metadata['branch']}_{d.metadata['year']}_{d.metadata['semester']}"
        for d in documents
    ]
    
    for i, (doc, doc_id) in enumerate(zip(documents, ids), start=1):
        vectorstore.add_documents(documents=[doc], ids=[doc_id])
        print(f"  [{i}/{len(documents)}] Stored {doc_id}")
        if i < len(documents):
            time.sleep(DELAY_BETWEEN_CALLS_SECONDS)

    print(f"\nDone. Stored {len(documents)} chunks in Chroma collection '{COLLECTION_NAME}'.")


if __name__ == "__main__":
    main()