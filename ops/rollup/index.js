const express = require("express");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(express.json());

function yyyymmddUTC(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
function yyyymmddUTCMinus(days) {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() - days);
  return yyyymmddUTC(dt);
}

async function getAllPublishedArticles() {
  const snap = await db.collection("articles").where("status", "==", "published").get();
  return snap.docs;
}

async function runRollupOnce() {
  const today = yyyymmddUTC();
  const day7 = yyyymmddUTCMinus(7);
  const day30 = yyyymmddUTCMinus(30);

  const docs = await getAllPublishedArticles();

  let batch = db.batch();
  let ops = 0;

  for (const d of docs) {
    const docId = d.id;
    const data = d.data() || {};
    const totalViews = Number(data.views || 0);
    const totalLikes = Number(data.likes || 0);

    // 오늘 스냅샷
    const snapRefToday = db.doc(`articles/${docId}/statsSnapshots/${today}`);
    batch.set(
      snapRefToday,
      {
        totalViews,
        totalLikes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    ops++;

    // 7/30일 전 스냅샷
    const snapRef7 = db.doc(`articles/${docId}/statsSnapshots/${day7}`);
    const snapRef30 = db.doc(`articles/${docId}/statsSnapshots/${day30}`);
    const [s7, s30] = await Promise.all([snapRef7.get(), snapRef30.get()]);

    const base7Views = s7.exists ? Number(s7.data().totalViews || 0) : totalViews;
    const base7Likes = s7.exists ? Number(s7.data().totalLikes || 0) : totalLikes;
    const base30Views = s30.exists ? Number(s30.data().totalViews || 0) : totalViews;
    const base30Likes = s30.exists ? Number(s30.data().totalLikes || 0) : totalLikes;

    const views7d = Math.max(0, totalViews - base7Views);
    const likes7d = Math.max(0, totalLikes - base7Likes);
    const views30d = Math.max(0, totalViews - base30Views);
    const likes30d = Math.max(0, totalLikes - base30Likes);

    const articleRef = db.doc(`articles/${docId}`);
    batch.set(
      articleRef,
      {
        views7d,
        likes7d,
        views30d,
        likes30d,
        rollupUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    ops++;

    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
  return { updated: docs.length, today };
}

app.post("/rollup", async (_req, res) => {
  try {
    const result = await runRollupOnce();
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("rollup server listening on", port));