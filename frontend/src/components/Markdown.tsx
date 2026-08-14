/**
 * Minimal, dependency-free markdown renderer — the assistant's output is
 * plain prose with occasional bold/lists, not a full document. Handles
 * **bold**, "- " bullet lists, and line breaks. Nothing heavier needed.
 */
export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        const isList = lines.every((l) => l.trim().startsWith("- "));

        if (isList) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-4">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^-\s*/, ""))}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="leading-relaxed">
            {lines.map((l, j) => (
              <span key={j}>
                {renderInline(l)}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-medium text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
