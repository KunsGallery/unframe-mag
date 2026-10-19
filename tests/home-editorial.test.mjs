import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHomeSelection,
  filterHomeArchive,
  positiveRankingItems,
} from "../src/lib/homeEditorial.js";

const articles = [
  {
    editionNo: "006",
    title: "실패와 창작",
    category: "ESSAY",
    author: "Editor P",
    views7d: 0,
  },
  {
    editionNo: "005",
    title: "서로를 통과하며",
    category: "REVIEW",
    views7d: 3,
  },
  {
    editionNo: "003",
    title: "이미지를 바라보는 방법",
    category: "REVIEW",
    views7d: -1,
  },
];
test("home selection respects configuration without duplicated or fictional stories", () => {
  const selected = buildHomeSelection(articles, {
    heroEditionNo: "005",
    editorPicks: ["003", "003", "missing"],
  });
  assert.deepEqual(
    selected.covers.map((item) => item.editionNo),
    ["005", "003", "006"],
  );
  assert.deepEqual(
    selected.picks.map((item) => item.editionNo),
    ["003", "006"],
  );
  assert.equal(selected.reading.length, 3);
});
test("small and empty archives produce usable selections", () => {
  assert.deepEqual(buildHomeSelection([]).covers, []);
  assert.equal(buildHomeSelection(articles.slice(0, 1)).picks.length, 1);
  assert.equal(
    buildHomeSelection(articles, { heroEditionNo: "deleted" }).covers[0],
    articles[0],
  );
});
test("archive search combines category with normalized title and author matching", () => {
  assert.equal(filterHomeArchive(articles, "REVIEW", "통과").length, 1);
  assert.equal(filterHomeArchive(articles, "ESSAY", "통과").length, 0);
  assert.equal(filterHomeArchive(articles, "All", " editor p ").length, 1);
  assert.equal(filterHomeArchive(articles, "All", "").length, 3);
});
test("zero, negative or missing counts never become popularity rankings", () => {
  assert.deepEqual(
    positiveRankingItems(articles, "views7d").map((item) => item.editionNo),
    ["005"],
  );
  assert.deepEqual(positiveRankingItems(articles, "likes30d"), []);
});

test("archive search matches canonically equivalent Korean and full-width text", () => {
  assert.equal(
    filterHomeArchive(articles, "All", "실패".normalize("NFD")).length,
    1,
  );
  assert.equal(filterHomeArchive(articles, "All", "Ｅｄｉｔｏｒ Ｐ").length, 1);
});

test("invalid ranking values are not displayed as reader activity", () => {
  const rows = [
    { views7d: Infinity },
    { views7d: "not-a-number" },
    { views7d: "4" },
  ];
  assert.deepEqual(positiveRankingItems(rows, "views7d"), [rows[2]]);
});
