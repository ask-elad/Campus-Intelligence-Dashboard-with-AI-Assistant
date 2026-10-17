"""Unit tests for the branch alias resolver — pure function, no network/model deps."""
from scrapper.branch_aliases import resolve_branch, normalize


def test_normalize_strips_punctuation_and_lowercases():
    assert normalize("Computer Science!") == "computerscience"
    assert normalize("  CS-E  ") == "cse"


def test_resolve_direct_aliases():
    assert resolve_branch("CS") == "computerscience"
    assert resolve_branch("cse") == "computerscience"
    assert resolve_branch("EE") == "electricalengineering"
    assert resolve_branch("mech") == "mechanicalengineering"
    assert resolve_branch("civil") == "civilengineering"


def test_resolve_case_and_spacing_insensitive():
    assert resolve_branch("Computer Science") == "computerscience"
    assert resolve_branch("ELECTRICAL ENGINEERING") == "electricalengineering"


def test_resolve_substring_fallback():
    # Longer phrases that embed the canonical key should still resolve.
    assert resolve_branch("mechanical engineering branch") == "mechanicalengineering"


def test_resolve_unknown_returns_none():
    assert resolve_branch("quantum alchemy") is None
    assert resolve_branch("") is None
