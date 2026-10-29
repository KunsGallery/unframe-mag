import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { getOptimizedImageUrl } from "../../lib/imageUrl";

const safeHref = (value) => {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
};
const hostOf = (value) => { try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return ""; } };

// A clickable preview card for an external page (title, description, image from its Open Graph tags).
// The data is stored on the node when it is inserted, so readers never fetch the other site.
export const UfLinkCard = Node.create({
  name: "ufLinkCard",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    const data = (name) => ({
      default: "",
      parseHTML: (element) => element.getAttribute(`data-${name}`) || "",
      renderHTML: () => ({}),
    });
    return { url: data("url"), title: data("title"), description: data("description"), image: data("image"), siteName: data("site-name") };
  },

  parseHTML() {
    return [{ tag: 'div[data-uf="link-card"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { url, title, description, image, siteName } = node.attrs;
    const href = safeHref(url);
    const imageSrc = safeHref(image);
    const host = hostOf(href);
    const body = ["span", { class: "uf-link-card__body" },
      ["strong", { class: "uf-link-card__title" }, title || host || "링크"],
      ...(description ? [["span", { class: "uf-link-card__desc" }, description]] : []),
      ["span", { class: "uf-link-card__site" }, [siteName, host].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" · ")],
    ];
    const media = imageSrc
      ? [["span", { class: "uf-link-card__media" }, ["img", { src: getOptimizedImageUrl(imageSrc, { width: 960 }), alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }]]]
      : [];
    return ["div", mergeAttributes(HTMLAttributes, {
      "data-uf": "link-card",
      class: `uf-link-card${imageSrc ? " has-image" : ""}`,
      "data-url": href, "data-title": title, "data-description": description, "data-image": imageSrc, "data-site-name": siteName,
    }), ["a", { href: href || "#", target: "_blank", rel: "noopener noreferrer", class: "uf-link-card__link" }, ...media, body]];
  },

  // While editing, a click selects the card instead of opening the link.
  addProseMirrorPlugins() {
    return [new Plugin({
      props: {
        handleDOMEvents: {
          click: (view, event) => {
            if (view.editable && event.target instanceof Element && event.target.closest(".uf-link-card__link")) event.preventDefault();
            return false;
          },
        },
      },
    })];
  },

  addCommands() {
    return {
      insertLinkCard: (attrs) => ({ commands }) => commands.insertContent({ type: this.name, attrs }),
    };
  },
});
