// src/lib/relativeTime.js
export function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const time = value instanceof Date ? value.getTime() : Number.isFinite(value) ? value : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

// "방금", "3분 전", "2시간 전", "어제", "4일 전", then a calendar date.
export function formatRelativeTime(value, now = Date.now()) {
  const time = toMillis(value);
  if (time === null) return "";
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 45) return "방금";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.round(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  const date = new Date(time);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return `${sameYear ? "" : `${date.getFullYear()}년 `}${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function formatClock(value) {
  const time = toMillis(value);
  if (time === null) return "";
  const date = new Date(time);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
