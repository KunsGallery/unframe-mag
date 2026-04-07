import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "a",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
]);

function unwrapElement(el) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function cleanNode(node) {
  if (!node) return;

  if (node.nodeType === Node.TEXT_NODE) {
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    node.parentNode?.removeChild(node);
    return;
  }

  const el = node;
  const tag = el.tagName.toLowerCase();

  if (["script", "style", "meta", "link"].includes(tag)) {
    el.remove();
    return;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    const children = Array.from(el.childNodes);
    children.forEach(cleanNode);
    unwrapElement(el);
    return;
  }

  el.removeAttribute("class");
  el.removeAttribute("style");
  el.removeAttribute("id");
  el.removeAttribute("dir");

  if (tag === "a") {
    const href = el.getAttribute("href");
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name !== "href") el.removeAttribute(attr.name);
    });

    if (!href || !/^https?:|^mailto:|^tel:/i.test(href)) {
      unwrapElement(el);
      return;
    }
  } else {
    Array.from(el.attributes).forEach((attr) => {
      el.removeAttribute(attr.name);
    });
  }

  Array.from(el.childNodes).forEach(cleanNode);
}

function normalizeHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;

  Array.from(body.childNodes).forEach(cleanNode);

  const normalized = [];
  Array.from(body.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        const p = doc.createElement("p");
        p.textContent = text;
        normalized.push(p);
      }
    } else {
      normalized.push(node);
    }
  });

  if (normalized.length !== body.childNodes.length) {
    body.innerHTML = "";
    normalized.forEach((n) => body.appendChild(n));
  }

  return body.innerHTML;
}

export const PasteSanitizer = Extension.create({
  name: "pasteSanitizer",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          transformPastedHTML: (html) => {
            try {
              return normalizeHTML(html);
            } catch (e) {
              console.error("[PasteSanitizer] failed:", e);
              return html;
            }
          },
        },
      }),
    ];
  },
});