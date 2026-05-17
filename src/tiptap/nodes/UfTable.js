import { Table } from "@tiptap/extension-table";
import {
  getTableCellMinWidth,
  normalizeTableSize,
} from "../../constants/editorBlocks";

function readTableSizeFromElement(element) {
  const attrSize = element.getAttribute("data-table-size");
  if (attrSize) return normalizeTableSize(attrSize);

  if (element.classList.contains("is-small")) return "small";
  if (element.classList.contains("is-wide")) return "wide";
  if (element.classList.contains("is-full")) return "full";
  if (element.classList.contains("is-normal")) return "normal";

  return "normal";
}

export const UfTable = Table.extend({
  addAttributes() {
    return {
      tableSize: {
        default: "normal",
        parseHTML: (element) => readTableSizeFromElement(element),
        renderHTML: (attributes) => {
          const size = normalizeTableSize(attributes.tableSize);
          const isCompact = size === "small";

          return {
            "data-table-size": size,
            class: `uf-table is-${size}`,
            style: `--uf-table-cell-min-width: ${getTableCellMinWidth(
              size,
              "desktop"
            )}px; --uf-table-cell-min-width-mobile: ${getTableCellMinWidth(
              size,
              "mobile"
            )}px;${isCompact ? " width: fit-content; min-width: 0;" : ""}`,
          };
        },
      },
    };
  },
});
