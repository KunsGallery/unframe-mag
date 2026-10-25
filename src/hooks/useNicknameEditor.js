import { useEffect, useMemo, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const NICK_MIN = 2;
const NICK_MAX = 20;

function validateNickname(name) {
  const v = String(name || "").trim();
  if (v.length < NICK_MIN) return `닉네임은 최소 ${NICK_MIN}자`;
  if (v.length > NICK_MAX) return `닉네임은 최대 ${NICK_MAX}자`;
  if (/\s/.test(v)) return "닉네임에는 공백을 넣을 수 없어요";
  return null;
}

export function useNicknameEditor({ user, profile, toast }) {
  const [nickname, setNickname] = useState("");
  const [savingNick, setSavingNick] = useState(false);
  const [err, setErr] = useState("");
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setNickname(profile.nickname || "");
  }, [profile?.nickname, profile]);

  useEffect(() => {
    if (!profile) return;
    if (profile.nicknameChanged === false) {
      const key = `uf_seen_nick_intro_${profile.uid}`;
      const seen = localStorage.getItem(key);
      if (!seen) {
        setShowIntro(true);
        localStorage.setItem(key, "1");
      }
    }
  }, [profile?.uid, profile?.nicknameChanged, profile]);

  const canChange = useMemo(() => {
    return !!user && !!profile && profile.nicknameChanged === false;
  }, [user, profile]);

  const saveNickname = async () => {
    setErr("");
    if (!user || !profile) return;

    if (!canChange) {
      setErr("닉네임은 1회만 변경할 수 있어요.");
      return;
    }

    const next = String(nickname || "").trim();
    const vErr = validateNickname(next);
    if (vErr) {
      setErr(vErr);
      return;
    }

    setSavingNick(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: next,
          name: next,
          nickname: next,
          nicknameChanged: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast("닉네임 변경 완료!");
      setShowIntro(false);
    } catch (e) {
      console.error(e);
      setErr("저장 실패(권한/규칙 확인)");
    } finally {
      setSavingNick(false);
    }
  };

  return {
    nickname,
    setNickname,
    savingNick,
    err,
    showIntro,
    setShowIntro,
    canChange,
    saveNickname,
  };
}
