import { Link } from "react-router-dom";
import {
  getProfileInitials,
  resolveProfileDisplayName,
  resolveProfilePhotoURL,
} from "../../lib/profileImage";
import { padEdition, timeAgo } from "../../lib/myPageFormat";

export default function CommentCard({ comment, authorProfile, isDarkMode }) {
  const displayName =
    resolveProfileDisplayName(authorProfile, comment, {
      displayName: comment.nickname,
      name: comment.author,
    }) || comment.nickname || comment.author || comment.authorEmail || "익명";
  const avatarURL = resolveProfilePhotoURL(authorProfile, comment.authorPhotoURL, comment);
  const avatarInitials = getProfileInitials(displayName);

  return (
    <div
      className={`rounded-[24px] border p-4 sm:p-5 ${
        isDarkMode
          ? "border-zinc-800 bg-white/[0.03]"
          : "border-black/10 bg-black/[0.02]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
          {avatarURL ? (
            <img
              src={avatarURL}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[11px] font-black opacity-45">
              {avatarInitials}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black line-clamp-1">
              {comment.articleTitle || `#${padEdition(comment.editionNo)}`}
            </div>
            <div className="text-[11px] opacity-50 shrink-0">
              {timeAgo(comment.createdAt)}
            </div>
          </div>

          <div className="mt-3 text-sm leading-6 opacity-80 line-clamp-3">
            <b className="mr-2">{displayName}</b>
            {comment.text || ""}
          </div>
        </div>
      </div>

      {comment.editionNo && (
        <div className="mt-4">
          <Link
            to={`/article/${String(comment.editionNo)}`}
            className="text-[11px] font-black tracking-[0.25em] uppercase italic text-[#004aad]"
          >
            OPEN ARTICLE →
          </Link>
        </div>
      )}
    </div>
  );
}
