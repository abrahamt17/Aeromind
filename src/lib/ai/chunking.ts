/** No app imports here, so the indexing command can use this file directly. */

export const MAX_CHUNK_CHARACTERS = 1200;

function splitLongText(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARACTERS) return [text];

  const parts: string[] = [];
  let current = "";
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (current && current.length + sentence.length + 1 > MAX_CHUNK_CHARACTERS) {
      parts.push(current);
      current = "";
    }
    if (sentence.length > MAX_CHUNK_CHARACTERS) {
      for (let start = 0; start < sentence.length; start += MAX_CHUNK_CHARACTERS) {
        parts.push(sentence.slice(start, start + MAX_CHUNK_CHARACTERS));
      }
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * Splits text at headings and paragraphs, so each chunk stays a meaningful
 * section. Every chunk keeps its heading, which improves retrieval and citations.
 */
export function chunkText(title: string, text: string): string[] {
  const chunks: string[] = [];
  let heading = "";
  let current = "";

  const flush = () => {
    if (!current) return;
    const prefix = heading ? `${title}: ${heading}` : title;
    chunks.push(`${prefix}\n\n${current}`);
    current = "";
  };

  for (const rawBlock of text.split(/\n\s*\n/)) {
    const block = rawBlock.trim();
    if (!block) continue;

    if (block.startsWith("## ")) {
      flush();
      heading = block.slice(3);
      continue;
    }

    for (const part of splitLongText(block)) {
      if (current && current.length + part.length + 2 > MAX_CHUNK_CHARACTERS) flush();
      current = current ? `${current}\n\n${part}` : part;
    }
  }

  flush();
  return chunks;
}
