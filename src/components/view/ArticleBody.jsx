import React, { forwardRef, useRef, useImperativeHandle } from "react";
import { EditorContent } from "@tiptap/react";
import ImageDeliveryLayer from "./ImageDeliveryLayer";

const ArticleBody = forwardRef(function ArticleBody({ article, editor }, ref) {
  const excerpt = article.excerpt?.trim?.() || "";
  const rootRef = useRef(null);
  useImperativeHandle(ref, () => rootRef.current);

  return (
    <div ref={rootRef} className="uf-article-content relative">
      {excerpt ? (
        <div className="max-w-[760px] mx-auto mb-16">
          <p className="text-3xl md:text-4xl font-black italic text-[#004aad] leading-tight border-l-12 border-[#004aad] pl-12 py-4">
            "{excerpt}"
          </p>
        </div>
      ) : null}

      <EditorContent editor={editor} />
      <ImageDeliveryLayer rootRef={rootRef} revision={editor} />
    </div>
  );
});

export default ArticleBody;
