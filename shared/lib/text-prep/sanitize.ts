import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "br",
  "hr",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "blockquote",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "a",
  "img",
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "name", "target", "rel"],
  img: ["src", "alt", "title"],
  th: ["colspan", "rowspan", "align"],
  td: ["colspan", "rowspan", "align"],
  code: ["class"],
  pre: ["class"],
};

export const sanitizeHtmlToSafeHtml = (inputHtml: string): string =>
  sanitizeHtml(inputHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    disallowedTagsMode: "discard",
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
  });
