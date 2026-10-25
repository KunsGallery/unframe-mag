import { CloudDownload, Upload } from "lucide-react";

export default function EditorConflictBanner({ conflict, disabled, onReload, onOverwrite }) {
  if (!conflict) return null;
  return (
    <section aria-label="편집 충돌" className="uf-recovery uf-conflict" role="alert">
      <div>
        <strong>{conflict.source === "remote" ? "다른 곳에서 이 글이 방금 수정됐어요." : "다른 곳에서 먼저 수정돼서 저장하지 않았어요."}</strong>
        <p>다른 탭이나 기기, 또는 다른 에디터가 같은 글을 저장했어요. 자동 저장은 멈춰 두었어요.</p>
      </div>
      <button type="button" disabled={disabled} onClick={onReload}><CloudDownload size={16} />최신본 불러오기</button>
      <button type="button" disabled={disabled} onClick={onOverwrite}><Upload size={16} />내 글로 덮어쓰기</button>
    </section>
  );
}
