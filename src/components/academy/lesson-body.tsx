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

        // AI answers can place a list straight after a line of text.
        const groups: { list: boolean; lines: string[] }[] = [];
        for (const line of text.split("\n").map((item) => item.trim())) {
          if (!line) continue;
          const list = line.startsWith("- ");
          const last = groups.at(-1);
          if (last?.list === list) last.lines.push(line);
          else groups.push({ list, lines: [line] });
        }

        return groups.map((group, position) =>
          group.list ? (
            <ul key={`${index}-${position}`} className="list-disc space-y-2 pl-5">
              {group.lines.map((line) => (
                <li key={line}>
                  <Inline text={line.slice(2)} />
                </li>
              ))}
            </ul>
          ) : (
            <p key={`${index}-${position}`}>
              <Inline text={group.lines.join(" ")} />
            </p>
          ),
        );
      })}
    </div>
  );
}
