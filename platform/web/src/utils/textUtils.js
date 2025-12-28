export const cleanText = (text) => {
  if (!text) return '';

  // 1. Collapse multiple spaces into one
  let cleaned = text.replace(/\s+/g, ' ');

  // 2. Fix spacing around math delimiters
  // Example: " $ x $ " -> "$x$"
  cleaned = cleaned.replace(/\s*\$\s*/g, '$');

  // Replace \( and \) with $
  cleaned = cleaned.replace(/\\\(/g, '$').replace(/\\\)/g, '$');
  cleaned = cleaned.replace(/\\\[/g, '$$').replace(/\\\]/g, '$$');

  // 3. Fix spacing around LaTeX commands if needed (basic heuristics)
  // Ensure space after comma in text mode, but maybe not in math?
  // For now, let's stick to safe whitespace collapsing.

  // 4. Remove empty paragraphs or excessive newlines if it was HTML-like
  // (This might be handled by the renderer, but good to clean source)

  return cleaned.trim();
};

export const cleanHtml = (html) => {
  if (!html) return '';
  // Basic HTML cleaning if needed, but usually we trust the source HTML structure
  // mostly just want to fix the weird spacing in text nodes if possible.
  // For HTML, we might just return as is, or do a light pass.
  return html;
};
