const HTML_TAG_RE = /<(html|head|body|div|span|p|br|hr|h[1-6]|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|pre|code|blockquote|a|img)\b/i;
const HTML_CLOSE_TAG_RE = /<\/(html|head|body|div|span|p|h[1-6]|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|pre|code|blockquote)\s*>/i;
const HTML_DOCTYPE_RE = /<!doctype\s+html/i;
const HTML_SELF_CLOSING_RE = /<(br|hr|img)\b[^>]*\/?>/i;

export const looksLikeHtml = (input: string): boolean => {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (HTML_DOCTYPE_RE.test(trimmed)) return true;
  if (/<html\b/i.test(trimmed)) return true;
  if (!HTML_TAG_RE.test(trimmed)) return false;
  if (HTML_CLOSE_TAG_RE.test(trimmed)) return true;
  if (HTML_SELF_CLOSING_RE.test(trimmed)) return true;
  return false;
};
