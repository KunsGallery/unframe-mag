import React, { forwardRef } from "react";
import { EditorContent } from "@tiptap/react";

const ArticleBody = forwardRef(function ArticleBody({ article, editor }, ref) {
  const subtitle = article.subtitle?.trim?.() || "";
  const excerpt = article.excerpt?.trim?.() || "";

  return (
    <div ref={ref} className="uf-article-content relative">
      {(subtitle || excerpt) ? (
        <div className="max-w-[760px] mx-auto mb-16">
          {subtitle ? (
            <p className="mb-8 border-l-4 border-[#004aad] pl-5 text-base md:text-2xl font-light italic leading-7 md:leading-9 text-zinc-600 dark:text-zinc-300">
              {subtitle}
            </p>
          ) : null}

          {excerpt ? (
            <p className="text-3xl md:text-4xl font-black italic text-[#004aad] leading-tight border-l-12 border-[#004aad] pl-12 py-4">
              "{excerpt}"
            </p>
          ) : null}
        </div>
      ) : null}

      <EditorContent editor={editor} />
    </div>
  );
});

export default ArticleBody;
