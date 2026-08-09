import re

def normalize(s: str) -> str:
    """Lowercase, strip everything but letters/digits."""
    return re.sub(r"[^a-z0-9]", "", s.lower())

BRANCH_ALIASES: dict[str, set[str]] = {
    "computerscience": {"cs", "cse", "computerscience", "computerscienceengineering"},
    "electricalengineering": {"ee", "eee", "electrical", "electricalengineering"},
    "mechanicalengineering": {"me", "mech", "mechanical", "mechanicalengineering"},
    "civilengineering": {"ce", "civil", "civilengineering"},
}


def resolve_branch(raw_input: str) -> str | None:
    """
    Resolve a user/LLM-provided branch string (any casing/spacing/abbreviation)
    to its canonical key, or None if it doesn't match anything known.
    """
    normalized = normalize(raw_input)

    for canonical, aliases in BRANCH_ALIASES.items():
        if normalized in aliases:
            return canonical

    # 2. Fallback: substring match against canonical keys directly
    for canonical in BRANCH_ALIASES:
        if normalized in canonical or canonical in normalized:
            return canonical

    return None