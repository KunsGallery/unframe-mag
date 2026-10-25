import { useEffect, useId, useRef, useState } from "react";
import { EDITOR_INPUT_EVENT, registerEditorInputHost } from "../../lib/editorInput";

export default function EditorInputDialog() {
  const dialog = useRef(null);
  const heading = useId();
  const hintId = useId();
  const [request, setRequest] = useState(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unregister = registerEditorInputHost();
    const open = (event) => {
      setRequest((current) => { current?.resolve(null); return event.detail; });
      setValue(event.detail.defaultValue || "");
      setError("");
    };
    window.addEventListener(EDITOR_INPUT_EVENT, open);
    return () => { unregister(); window.removeEventListener(EDITOR_INPUT_EVENT, open); };
  }, []);

  useEffect(() => {
    if (request && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [request]);

  if (!request) return null;
  const finish = (result) => { dialog.current?.close(); request.resolve(result); setRequest(null); };
  const submit = () => {
    const text = value.trim();
    if (!text && !request.allowEmpty) { setError("내용을 입력해 주세요."); return; }
    const message = text ? request.validate?.(text) : "";
    if (message) { setError(message); return; }
    finish(text);
  };
  return (
    <dialog ref={dialog} aria-labelledby={heading} className="uf-input-dialog" onCancel={(event) => { event.preventDefault(); finish(null); }}>
      <form method="dialog" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <h2 id={heading}>{request.title}</h2>
        <label>{request.label}
          <input autoFocus type="text" inputMode={request.inputMode || "text"} autoComplete="off" value={value} placeholder={request.placeholder || ""}
            aria-describedby={hintId} aria-invalid={!!error}
            onChange={(event) => { setValue(event.target.value); setError(""); }} />
        </label>
        <p id={hintId} role={error ? "alert" : undefined} className={error ? "is-error" : ""}>{error || request.hint || ""}</p>
        <footer>
          <button type="button" onClick={() => finish(null)}>취소</button>
          <button type="submit" className="uf-primary">{request.confirmLabel || "확인"}</button>
        </footer>
      </form>
    </dialog>
  );
}
