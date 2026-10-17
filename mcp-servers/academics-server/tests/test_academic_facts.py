"""Tests for the static academic facts JSON — shape only, no network/model deps."""
import json
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "academic_facts.json"


def test_academic_facts_file_exists():
    assert DATA_PATH.is_file(), f"missing {DATA_PATH}"


def test_academic_facts_is_valid_json_object():
    with DATA_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    assert isinstance(data, dict)
    # Minimal shape expectations — the tool returns this verbatim to the LLM,
    # so at least some content should be present.
    assert len(data) > 0
