import sys
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from fastmcp import FastMCP
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(PROJECT_ROOT / ".env")

sys.path.insert(0, str(PROJECT_ROOT / "scrapper"))
from branch_aliases import resolve_branch  # noqa: E402

CHROMA_DIR = PROJECT_ROOT / "data" / "chroma_db"
COLLECTION_NAME = "program_structures"
EMBEDDING_MODEL = "gemini-embedding-001"
RELEVANCE_FLOOR = 0.5  # below this, treat as "no confident match"

embeddings = GoogleGenerativeAIEmbeddings(
    model=EMBEDDING_MODEL,
    task_type="RETRIEVAL_QUERY",
)

vectorstore = Chroma(
    collection_name=COLLECTION_NAME,
    embedding_function=embeddings,
    persist_directory=str(CHROMA_DIR),
)

mcp = FastMCP("academics-mcp-server")


@mcp.tool
def search_program_structure(
    query: str,
    branch: Optional[str] = None,
    year: Optional[int] = None,
    semester: Optional[str] = None,
) -> dict[str, Any]:
    """Search UG Programme Structure documents (semester-wise course lists)
    using semantic search. Optionally narrow results with exact filters:
    branch (accepts full names or common abbreviations, e.g. 'CS', 'computer
    science', 'CSE' all resolve the same way), year (1-4), and semester
    ('Autumn' or 'Spring'). Use filters whenever the question specifies a
    branch/year/semester explicitly — this gives far more reliable results
    than semantic search alone for this kind of structured, tabular data."""

    where_conditions: list[dict[str, Any]] = []

    if branch:
        resolved = resolve_branch(branch)
        if resolved is None:
            return {
                "error": f"Unknown branch '{branch}'. No confident match to any ingested branch.",
                "query": query,
            }
        where_conditions.append({"branch": resolved})

    if year:
        where_conditions.append({"year": year})

    if semester:
        where_conditions.append({"semester": semester.capitalize()})

    if len(where_conditions) == 0:
        where_filter = None
    elif len(where_conditions) == 1:
        where_filter = where_conditions[0]
    else:
        where_filter = {"$and": where_conditions}

    results = vectorstore.similarity_search_with_relevance_scores(
        query,
        k=5,
        filter=where_filter,
    )

    if not results:
        return {
            "query": query,
            "filtersApplied": where_filter,
            "matches": [],
            "note": "No documents matched the given filters.",
        }

    if where_filter is None:
        confident_matches = [
            {"text": doc.page_content, "metadata": doc.metadata, "relevanceScore": score}
            for doc, score in results
            if score >= RELEVANCE_FLOOR
        ]
    else:
        confident_matches = [
            {"text": doc.page_content, "metadata": doc.metadata, "relevanceScore": score}
            for doc, score in results
        ]

    if not confident_matches:
        return {
            "query": query,
            "filtersApplied": where_filter,
            "matches": [],
            "note": (
                "No sufficiently confident matches found (best result was below "
                f"the relevance threshold of {RELEVANCE_FLOOR}). Try rephrasing "
                "the query or checking the branch/year/semester filters."
            ),
        }

    return {
        "query": query,
        "filtersApplied": where_filter,
        "matches": confident_matches,
    }


if __name__ == "__main__":
    mcp.run(transport="http", host="127.0.0.1", port=5006, path="/mcp")