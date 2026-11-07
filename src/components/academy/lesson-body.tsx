function Inline({ text }: { text: string }) {
  // Lesson text is only ever rendered as React text, so stored HTML can never run.
  return text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

/** Renders the small lesson format: "## " headings, "- " lists and **bold**. */
export function LessonBody({ body }: { body: string }) {
  return (
    <div className="space-y-4 leading-7">
      {body.split(/\n\s*\n/).map((block, index) => {
        const text = block.trim();

        if (text.startsWith("## ")) {
          return (
            <h2 key={index} className="pt-3 text-xl font-semibold">
              {text.slice(3)}
            </h2>
          );
        }

        const lines = text.split("\n");
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index} className="list-disc space-y-2 pl-5">
              {lines.map((line) => (
                <li key={line}>
                  <Inline text={line.slice(2)} />
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index}>
            <Inline text={text} />
          </p>
        );
      })}
    </div>
  );
}
