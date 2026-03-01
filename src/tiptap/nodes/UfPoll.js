import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import UfPollNodeView from "../../components/poll/UfPollNodeView";

function makePollKey() {
  return `poll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeParseJSON(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export const UfPoll = Node.create({
  name: "ufPoll",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      pollKey: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-poll-key") || null,
        renderHTML: (attrs) =>
          attrs.pollKey ? { "data-poll-key": String(attrs.pollKey) } : {},
      },

      question: {
        default: "투표",
        parseHTML: (el) => el.getAttribute("data-question") || "투표",
        renderHTML: (attrs) => ({
          "data-question": String(attrs.question ?? "투표"),
        }),
      },

      // ✅ 핵심: options는 JSON으로 data-options에 저장
      options: {
        default: [],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-options");
          const v = raw ? safeParseJSON(raw, []) : [];
          return Array.isArray(v) ? v : [];
        },
        renderHTML: (attrs) => ({
          "data-options": JSON.stringify(Array.isArray(attrs.options) ? attrs.options : []),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-uf="poll"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // ✅ atom(leaf) 노드라 content hole(0) 금지
    return ["div", mergeAttributes(HTMLAttributes, { "data-uf": "poll" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UfPollNodeView);
  },

  addCommands() {
    return {
      insertUfPoll:
        () =>
        ({ commands }) => {
          const pollKey = makePollKey();
          return commands.insertContent({
            type: this.name,
            attrs: {
              pollKey,
              question: "당신의 선택은?",
              options: [
                { id: "a", text: "옵션 1" },
                { id: "b", text: "옵션 2" },
              ],
            },
          });
        },
    };
  },
});