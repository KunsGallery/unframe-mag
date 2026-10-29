import { useEffect, useId, useRef } from "react";
import { BookOpen, X } from "lucide-react";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? "⌘" : "Ctrl";
const SHIFT = isMac ? "⇧" : "Shift";
const ALT = isMac ? "⌥" : "Alt";

const GROUPS = [
  ["작업", [
    ["저장", [MOD, "S"]], ["찾기·바꾸기", [MOD, "F"]], ["블록 추가 메뉴", ["/"]],
    ["실행 취소 / 다시 실행", [MOD, "Z"], [MOD, SHIFT, "Z"]], ["단축키 보기", [MOD, "/"]],
  ]],
  ["글자", [
    ["굵게", [MOD, "B"]], ["기울임", [MOD, "I"]], ["밑줄", [MOD, "U"]], ["취소선", [MOD, SHIFT, "S"]],
    ["글자 크게 / 작게", [MOD, SHIFT, "."], [MOD, SHIFT, ","]], ["링크", [MOD, "K"]], ["위 첨자", [MOD, "."]],
  ]],
  ["블록", [
    ["블록 위로 / 아래로 옮기기", [MOD, SHIFT, "↑"], [MOD, SHIFT, "↓"]], ["블록 복제", [MOD, "D"]],
  ]],
  ["문단", [
    ["대제목 / 중제목", [MOD, ALT, "2"], [MOD, ALT, "3"]], ["인용문", [MOD, SHIFT, "B"]],
    ["글머리 목록 / 번호 목록", [MOD, SHIFT, "8"], [MOD, SHIFT, "7"]], ["표·컬럼 밖으로 나가기", [MOD, "Enter"]],
  ]],
  ["빠른 입력 (줄 맨 앞에서)", [
    ["대제목", ["##", "Space"]], ["중제목", ["###", "Space"]], ["인용문", [">", "Space"]],
    ["글머리 목록", ["-", "Space"]], ["번호 목록", ["1.", "Space"]],
  ]],
  ["창 안에서", [
    ["다음 / 이전 찾기 결과", ["Enter"], [SHIFT, "Enter"]], ["각주 저장", [MOD, "Enter"]], ["닫기", ["Esc"]],
  ]],
];

const Keys = ({ keys }) => <span className="uf-keys">{keys.map((key) => <kbd key={key}>{key}</kbd>)}</span>;

export default function EditorShortcutsDialog({ open, onClose, onOpenGuide }) {
  const dialog = useRef(null);
  const heading = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return (
    <dialog ref={dialog} aria-labelledby={heading} className="uf-shortcuts" onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <header>
        <h2 id={heading}>단축키</h2>
        <button type="button" aria-label="단축키 닫기" title="닫기 (Esc)" onClick={onClose}><X size={18} /></button>
      </header>
      <div className="uf-shortcuts__groups">
        {GROUPS.map(([title, rows]) => <section key={title}>
          <h3>{title}</h3>
          <dl>{rows.map(([label, ...combos]) => <div key={label}><dt>{label}</dt><dd>{combos.map((keys, index) => <Keys key={index} keys={keys} />)}</dd></div>)}</dl>
        </section>)}
      </div>
      <footer><button type="button" onClick={() => { onClose(); onOpenGuide(); }}><BookOpen size={16} />편집 가이드 다시 보기</button></footer>
    </dialog>
  );
}
