import assert from "node:assert/strict";
import test from "node:test";
import { slideOffsets, nearestSlideIndex, slideTargetOffset } from "../src/hooks/useSlideGalleryRuntime.js";

function trackAt(width, scrollLeft = 0, origin = 173, gap = 12) {
  return {
    scrollLeft,
    querySelectorAll: () => Array.from({ length: 4 }, (_, index) => ({
      getBoundingClientRect: () => ({ left: origin + index * (width + gap) - scrollLeft }),
    })),
  };
}

test("desktop targets use the slide origin and include the gap", () => {
  const offsets = slideOffsets(trackAt(920));
  assert.deepEqual(offsets, [0, 932, 1864, 2796]);
  assert.equal(slideTargetOffset(offsets, 2), 1864);
});

test("mobile targets show one full slide rather than stepping by viewport width", () => {
  const offsets = slideOffsets(trackAt(320));
  assert.equal(slideTargetOffset(offsets, 3), 996);
  assert.equal(nearestSlideIndex(offsets, 664), 2);
});

test("offsets remain stable after scrolling and with a distant container origin", () => {
  assert.deepEqual(slideOffsets(trackAt(320, 664, 1000)), slideOffsets(trackAt(320)));
});

test("resizing recomputes the target for the same slide", () => {
  const desktop = slideOffsets(trackAt(920, 1864));
  const index = nearestSlideIndex(desktop, 1864);
  assert.equal(slideTargetOffset(slideOffsets(trackAt(320, 1864)), index), 664);
});

test("nearest slide uses actual fractional geometry and a stable midpoint tie", () => {
  const offsets = [0, 332.5, 665];
  assert.equal(nearestSlideIndex(offsets, 166.25), 0);
  assert.equal(nearestSlideIndex(offsets, 166.26), 1);
  assert.equal(nearestSlideIndex(offsets, 660), 2);
});

test("empty, single and out-of-range targets are safe", () => {
  assert.equal(slideTargetOffset([], 3), 0);
  assert.equal(nearestSlideIndex([], 10), 0);
  assert.equal(slideTargetOffset([0], 3), 0);
  assert.equal(slideTargetOffset([0, 332, 664], -1), 0);
  assert.equal(slideTargetOffset([0, 332, 664], 9), 664);
  assert.equal(slideTargetOffset([0, 332, 664], NaN), 0);
});
