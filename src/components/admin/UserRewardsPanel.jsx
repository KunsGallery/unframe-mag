import React, { useEffect, useMemo, useState } from "react";
import { useAdminUsers } from "../../hooks/useAdminUsers";
import { STICKERS } from "../../data/stickers";
import { ACHIEVEMENTS } from "../../data/achievements";
import { TIERS } from "../../data/tiers";
import { calcLevelFromXP, calcTierFromXP } from "../../lib/tierUtils";
import {
  grantSticker,
  revokeSticker,
  grantAchievement,
  revokeAchievement,
  setUserTier,
  setUserXP,
} from "../../hooks/useUserRewards";

import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";

export default function UserRewardsPanel({
  isAdmin,
  adminEmail,
  isDarkMode,
  onToast,
}) {
  const toast = (m) => (onToast ? onToast(m) : console.log(m));
  const { users, loading } = useAdminUsers({ enabled: isAdmin });

  const [q, setQ] = useState("");
  const [selectedUid, setSelectedUid] = useState(null);
  const [roleSaving, setRoleSaving] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;

    return users.filter((u) => {
      const nick = String(u.nickname || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      const role = String(u.role || "").toLowerCase();

      return (
        nick.includes(t) ||
        email.includes(t) ||
        role.includes(t) ||
        String(u.uid || "").includes(t)
      );
    });
  }, [users, q]);

  const selected = useMemo(
    () => filtered.find((u) => u.uid === selectedUid) || null,
    [filtered, selectedUid]
  );

  useEffect(() => {
    setBio(selected?.bio || "");
    setPhotoURL(selected?.photoURL || "");
  }, [selected?.uid, selected?.bio, selected?.photoURL]);

  const setUserRole = async (uid, nextRole) => {
    if (!uid) return;
    if (!isAdmin) {
      toast("관리자만 변경할 수 있어요.");
      return;
    }

    setRoleSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        role: nextRole,
        updatedAt: serverTimestamp(),
        updatedBy: adminEmail || null,
      });
      toast(`Role 변경: ${nextRole}`);
    } catch (e) {
      console.error(e);
      toast("Role 변경 실패");
    } finally {
      setRoleSaving(false);
    }
  };

  const saveEditorProfile = async () => {
    if (!selected?.uid) return;

    setProfileSaving(true);
    try {
      await updateDoc(doc(db, "users", selected.uid), {
        bio: String(bio || "").trim(),
        photoURL: String(photoURL || "").trim() || null,
        updatedAt: serverTimestamp(),
        updatedBy: adminEmail || null,
      });
      toast("에디터 프로필 저장 완료");
    } catch (e) {
      console.error(e);
      toast("에디터 프로필 저장 실패");
    } finally {
      setProfileSaving(false);
    }
  };

  const onGrantSticker = async (stickerId) => {
    if (!selected) return;
    try {
      await grantSticker({ uid: selected.uid, stickerId, adminEmail });
      toast(`스티커 지급: ${stickerId}`);
    } catch (e) {
      console.error(e);
      toast("스티커 지급 실패");
    }
  };

  const onRevokeSticker = async (stickerId) => {
    if (!selected) return;
    try {
      await revokeSticker({ uid: selected.uid, stickerId });
      toast(`스티커 회수: ${stickerId}`);
    } catch (e) {
      console.error(e);
      toast("스티커 회수 실패");
    }
  };

  const onGrantAchievement = async (achievementId) => {
    if (!selected) return;
    try {
      await grantAchievement({ uid: selected.uid, achievementId, adminEmail });
      toast(`업적 지급: ${achievementId}`);
    } catch (e) {
      console.error(e);
      toast("업적 지급 실패");
    }
  };

  const onRevokeAchievement = async (achievementId) => {
    if (!selected) return;
    try {
      await revokeAchievement({ uid: selected.uid, achievementId });
      toast(`업적 회수: ${achievementId}`);
    } catch (e) {
      console.error(e);
      toast("업적 회수 실패");
    }
  };

  const onAutoTier = async () => {
    if (!selected) return;

    const xp = Number(selected.xp || 0);
    const tier = calcTierFromXP(xp);
    const level = calcLevelFromXP(xp);

    try {
      await setUserTier({
        uid: selected.uid,
        tierKey: tier.key,
        tierLabel: tier.label,
        tierColor: tier.color,
        level,
      });
      toast("XP 기반 등급/레벨 반영 완료");
    } catch (e) {
      console.error(e);
      toast("등급 반영 실패");
    }
  };

  const onSetXP = async (xp) => {
    if (!selected) return;
    try {
      await setUserXP({ uid: selected.uid, xp });
      toast("XP 업데이트");
    } catch (e) {
      console.error(e);
      toast("XP 업데이트 실패");
    }
  };

  const roleLabel = (r) => {
    const v = String(r || "user");
    if (v === "admin") return "ADMIN";
    if (v === "editor") return "EDITOR";
    return "USER";
  };

  const roleBtnClass = (active, filled = false) =>
    [
      "px-3 py-2 rounded-xl text-xs font-black disabled:opacity-50 transition border",
      active
        ? filled
          ? "bg-[#004aad] text-white border-[#004aad]"
          : "border-[#004aad] text-[#004aad] bg-[#004aad]/5"
        : isDarkMode
        ? "border-zinc-800 text-zinc-200 hover:border-zinc-600"
        : "border-zinc-200 text-zinc-700 hover:border-zinc-400",
    ].join(" ");

  return (
    <div className="mt-10 grid lg:grid-cols-12 gap-6">
      <div
        className={`lg:col-span-5 rounded-2xl border p-6 ${
          isDarkMode ? "border-zinc-800" : "border-zinc-200"
        }`}
      >
        <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
          / USERS
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search nickname / email / role"
          className={`mt-4 w-full px-4 py-3 rounded-xl border bg-transparent text-sm ${
            isDarkMode ? "border-zinc-800" : "border-zinc-200"
          }`}
        />

        <div className="mt-4 space-y-2 max-h-[520px] overflow-auto pr-1">
          {loading ? (
            <div className="text-sm text-zinc-500">loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-zinc-500">검색 결과가 없어요.</div>
          ) : (
            filtered.map((u) => (
              <button
                key={u.uid}
                onClick={() => setSelectedUid(u.uid)}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  selectedUid === u.uid
                    ? "border-[#004aad] bg-[#004aad]/5"
                    : isDarkMode
                    ? "border-zinc-800 hover:border-zinc-600"
                    : "border-zinc-200 hover:border-zinc-400"
                }`}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black italic line-clamp-1">
                    {u.nickname || "(no nickname)"}
                  </div>

                  <span
                    className={`text-[10px] font-black tracking-[0.35em] uppercase px-2 py-1 rounded-full border ${
                      isDarkMode
                        ? "border-zinc-800 opacity-80"
                        : "border-zinc-200 opacity-80"
                    }`}
                  >
                    {roleLabel(u.role)}
                  </span>
                </div>

                <div className="mt-1 text-[11px] opacity-60">
                  {u.email || u.uid}
                </div>

                <div className="mt-2 text-[10px] tracking-[0.35em] uppercase italic opacity-60">
                  tier: {u.tier || "—"} · lv {u.level || 1} · xp {u.xp || 0}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div
        className={`lg:col-span-7 rounded-2xl border p-6 ${
          isDarkMode ? "border-zinc-800" : "border-zinc-200"
        }`}
      >
        <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
          / REWARDS
        </div>

        {!selected ? (
          <div className="mt-6 text-sm text-zinc-500">
            왼쪽에서 유저를 선택해줘.
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {/* Role */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-black">Role</div>
                <div className="text-[11px] opacity-60">
                  현재: <b>{roleLabel(selected.role)}</b>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setUserRole(selected.uid, "user")}
                  disabled={roleSaving}
                  className={roleBtnClass(selected.role === "user")}
                  type="button"
                >
                  USER
                </button>

                <button
                  onClick={() => setUserRole(selected.uid, "editor")}
                  disabled={roleSaving}
                  className={roleBtnClass(selected.role === "editor", true)}
                  type="button"
                >
                  EDITOR
                </button>

                <button
                  onClick={() => setUserRole(selected.uid, "admin")}
                  disabled={roleSaving}
                  className={roleBtnClass(selected.role === "admin")}
                  type="button"
                >
                  ADMIN
                </button>
              </div>
            </div>

            {/* Editor Profile */}
            <div className="space-y-3">
              <div className="text-sm font-black">Editor Profile</div>

              <div className="grid gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.25em] opacity-55">
                    Photo URL
                  </div>
                  <input
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="https://..."
                    className={`mt-2 w-full px-4 py-3 rounded-xl border bg-transparent text-sm ${
                      isDarkMode ? "border-zinc-800" : "border-zinc-200"
                    }`}
                  />
                </div>

                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.25em] opacity-55">
                    Bio
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="에디터 소개 문구"
                    className={`mt-2 w-full min-h-[110px] px-4 py-3 rounded-xl border bg-transparent text-sm ${
                      isDarkMode ? "border-zinc-800" : "border-zinc-200"
                    }`}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={saveEditorProfile}
                    disabled={profileSaving}
                    className="px-4 py-3 rounded-xl bg-[#004aad] text-white text-xs font-black disabled:opacity-50"
                    type="button"
                  >
                    {profileSaving ? "SAVING…" : "SAVE PROFILE"}
                  </button>
                </div>
              </div>
            </div>

            {/* XP / Tier */}
            <div className="space-y-3">
              <div className="text-sm font-black">XP / Tier</div>

              <div className="flex flex-wrap gap-2">
                {[0, 10, 50, 100, 200, 500].map((add) => (
                  <button
                    key={add}
                    onClick={() => onSetXP(Number(selected.xp || 0) + add)}
                    className="px-3 py-2 rounded-xl border text-xs font-black"
                    type="button"
                  >
                    +{add} XP
                  </button>
                ))}

                <button
                  onClick={onAutoTier}
                  className="px-4 py-2 rounded-xl bg-[#004aad] text-white text-xs font-black"
                  type="button"
                >
                  AUTO TIER
                </button>
              </div>

              <div className="mt-3 text-[11px] opacity-70">
                현재: tier {selected.tier || "—"} / lv {selected.level || 1} / xp{" "}
                {selected.xp || 0}
              </div>

              <div className="mt-4 grid md:grid-cols-3 gap-2">
                {TIERS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() =>
                      setUserTier({
                        uid: selected.uid,
                        tierKey: t.key,
                        tierLabel: t.label,
                        tierColor: t.color,
                        level: selected.level || 1,
                      })
                        .then(() => toast(`등급 지정: ${t.label}`))
                        .catch((e) => {
                          console.error(e);
                          toast("등급 지정 실패");
                        })
                    }
                    className="px-3 py-3 rounded-xl border text-xs font-black"
                    type="button"
                    style={{ borderColor: t.color }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stickers */}
            <div className="space-y-3">
              <div className="text-sm font-black">Stickers</div>

              <div className="grid md:grid-cols-2 gap-3">
                {STICKERS.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-xl border p-4 ${
                      isDarkMode ? "border-zinc-800" : "border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-black">
                        <span className="mr-2">{s.icon}</span>
                        {s.name}
                      </div>
                      <div className="text-[10px] tracking-[0.35em] uppercase opacity-60">
                        {s.rarity}
                      </div>
                    </div>

                    <div className="mt-2 text-xs opacity-70">{s.desc}</div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => onGrantSticker(s.id)}
                        className="px-3 py-2 rounded-xl bg-[#004aad] text-white text-xs font-black"
                        type="button"
                      >
                        GRANT
                      </button>

                      <button
                        onClick={() => onRevokeSticker(s.id)}
                        className="px-3 py-2 rounded-xl border text-xs font-black"
                        type="button"
                      >
                        REVOKE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="space-y-3">
              <div className="text-sm font-black">Achievements</div>

              <div className="grid md:grid-cols-2 gap-3">
                {ACHIEVEMENTS.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-4 ${
                      isDarkMode ? "border-zinc-800" : "border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-black">
                        <span className="mr-2">{a.icon || "🏆"}</span>
                        {a.title || a.name}
                      </div>
                      <div className="text-[10px] tracking-[0.35em] uppercase opacity-60">
                        {a.rarity || "common"}
                      </div>
                    </div>

                    <div className="mt-2 text-xs opacity-70">{a.desc}</div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => onGrantAchievement(a.id)}
                        className="px-3 py-2 rounded-xl bg-[#004aad] text-white text-xs font-black"
                        type="button"
                      >
                        GRANT
                      </button>

                      <button
                        onClick={() => onRevokeAchievement(a.id)}
                        className="px-3 py-2 rounded-xl border text-xs font-black"
                        type="button"
                      >
                        REVOKE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}