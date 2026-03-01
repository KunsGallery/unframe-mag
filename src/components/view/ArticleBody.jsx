import React, { forwardRef } from "react";
import { EditorContent } from "@tiptap/react";

const ArticleBody = forwardRef(function ArticleBody({ article, editor }, ref) {
  return (
    <div ref={ref} className="uf-article-content relative">
      {article.excerpt?.trim?.() ? (
        <div className="max-w-[760px] mx-auto mb-20">
          <p className="text-3xl md:text-4xl font-black italic text-[#004aad] leading-tight border-l-12 border-[#004aad] pl-12 py-4">
            "{article.excerpt}"
          </p>
        </div>
      ) : null}

      <EditorContent editor={editor} />
    </div>
  );
});

export default ArticleBody;