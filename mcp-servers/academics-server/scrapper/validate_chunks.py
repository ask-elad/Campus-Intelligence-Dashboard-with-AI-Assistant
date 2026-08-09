import re
from pathlib import Path

import pdfplumber

from branch_aliases import normalize

RAW_PDF_DIR = Path(__file__).resolve().parent.parent / "data" / "raw_pdfs"

YEAR_HEADER_RE = re.compile(r"Year\s*:\s*(I{1,3}|IV)\b")
SEMESTER_MARKER_RE = re.compile(r"\((Autumn|Spring)\)")
ROMAN_TO_INT = {"I": 1, "II": 2, "III": 3, "IV": 4}


def parse_filename(pdf_path: Path) -> tuple[str, str]:
    """UG_ComputerScience.pdf -> ('UG', 'computerscience')"""
    stem = pdf_path.stem
    if "_" not in stem:
        raise ValueError(f"Filename '{pdf_path.name}' doesn't match <LEVEL>_<BranchName>.pdf")
    level, raw_branch_name = stem.split("_", 1)
    return level.upper(), normalize(raw_branch_name)


def extract_text(pdf_path: Path) -> str:
    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text_parts.append(page.extract_text() or "")
    return "\n".join(text_parts)


def chunk_by_year_semester(full_text: str, level: str, branch: str) -> list[dict]:
    chunks = []
    year_splits = list(YEAR_HEADER_RE.finditer(full_text))

    for i, match in enumerate(year_splits):
        year_num = ROMAN_TO_INT.get(match.group(1))
        block_start = match.end()
        block_end = year_splits[i + 1].start() if i + 1 < len(year_splits) else len(full_text)
        year_block_text = full_text[block_start:block_end]

        sem_splits = list(SEMESTER_MARKER_RE.finditer(year_block_text))
        if not sem_splits:
            chunks.append(
                {
                    "text": f"{branch} — Year {year_num}: {year_block_text.strip()}",
                    "metadata": {"level": level, "branch": branch, "year": year_num, "semester": "Unknown"},
                }
            )
            continue

        for j, sem_match in enumerate(sem_splits):
            semester = sem_match.group(1)
            sem_start = sem_match.end()
            sem_end = sem_splits[j + 1].start() if j + 1 < len(sem_splits) else len(year_block_text)
            sem_text = year_block_text[sem_start:sem_end].strip()
            if not sem_text:
                continue
            chunks.append(
                {
                    "text": f"{branch} — Year {year_num}, {semester} semester courses: {sem_text}",
                    "metadata": {"level": level, "branch": branch, "year": year_num, "semester": semester},
                }
            )

    return chunks


def main():
    pdf_files = sorted(RAW_PDF_DIR.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDFs found in {RAW_PDF_DIR}")
        return

    total_chunks = 0
    for pdf_path in pdf_files:
        try:
            level, branch = parse_filename(pdf_path)
        except ValueError as e:
            print(f"\n!! SKIPPING {pdf_path.name}: {e}")
            continue

        full_text = extract_text(pdf_path)
        chunks = chunk_by_year_semester(full_text, level, branch)
        total_chunks += len(chunks)

        print(f"\n{'=' * 60}")
        print(f"{branch} ({level}) — {len(chunks)} chunks   [from {pdf_path.name}]")
        print(f"{'=' * 60}")

        expected = 8  # 4 years x 2 semesters
        if len(chunks) != expected:
            print(f"  !! WARNING: expected ~{expected} chunks, got {len(chunks)} — inspect this PDF's layout")

        for c in chunks:
            preview = c["text"][:150].replace("\n", " ")
            print(f"  [{c['metadata']['year']}-{c['metadata']['semester']}] {preview}...")

    print(f"\n{'=' * 60}")
    print(f"TOTAL: {total_chunks} chunks across {len(pdf_files)} branches")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()