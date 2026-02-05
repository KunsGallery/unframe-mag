import React from "react";
import ListPage from "./pages/ListPage";
import ViewPage from "./pages/ViewPage";
import EditorPage from "./pages/EditorPage";
import { getParam } from "./utils/router";

export default function App() {
  const mode = getParam("mode") || "list";
  const id = getParam("id"); // view/editor에서 사용 (글 번호)

  if (mode === "view") return <ViewPage id={id} />;
  if (mode === "editor") return <EditorPage id={id} />;
  return <ListPage />;
}
