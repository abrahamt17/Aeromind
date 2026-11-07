import { extractText, getDocumentProxy } from "unpdf";

/** Returns the text of a PDF, or an empty string for a scanned one with no text layer. */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const document = await getDocumentProxy(bytes);
  const { text } = await extractText(document, { mergePages: false });
  return (Array.isArray(text) ? text : [text]).join("\n\n").trim();
}
