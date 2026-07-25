import { calculateGridOverlap } from '../../src/lib/scheduling';

// Characterization tests for the week-grid layout math.
// These pin the EXACT left/width/grouping outputs so a rewrite of the
// timeline/day-preview UI cannot silently change how overlapping
// scheduled items are laid out.
//
// Consumers (TimelineView.jsx, DaySchedulePreview.jsx) pass items with
// startMin/endMin (minutes since midnight) plus arbitrary extra props,
// and render each result absolutely positioned using the returned
// left/width CSS strings. A cluster of 3+ overlapping items collapses
// into a single { isGroup: true } entry containing the items.

const FULL_LEFT = '48px';
const FULL_WIDTH = 'calc(100% - 52px)';
const COL1_LEFT = '48px';
const COL2_LEFT = 'calc(50% + 24px)';
const HALF_WIDTH = 'calc(50% - 28px)';

describe('calculateGridOverlap', () => {
  test('empty input returns an empty array', () => {
    expect(calculateGridOverlap([])).toEqual([]);
  });

  test('single item gets the full-width column and keeps its props', () => {
    const item = { id: 'a', title: 'Standup', startMin: 540, endMin: 600 };
    const result = calculateGridOverlap([item]);

    expect(result).toEqual([
      {
        id: 'a',
        title: 'Standup',
        startMin: 540,
        endMin: 600,
        left: FULL_LEFT,
        width: FULL_WIDTH,
      },
    ]);
    // Does not mutate the input item
    expect(item).toEqual({ id: 'a', title: 'Standup', startMin: 540, endMin: 600 });
  });

  test('two overlapping items are split into two half-width columns', () => {
    const result = calculateGridOverlap([
      { id: 'a', startMin: 540, endMin: 600 },
      { id: 'b', startMin: 570, endMin: 630 },
    ]);

    expect(result).toEqual([
      { id: 'a', startMin: 540, endMin: 600, left: COL1_LEFT, width: HALF_WIDTH },
      { id: 'b', startMin: 570, endMin: 630, left: COL2_LEFT, width: HALF_WIDTH },
    ]);
  });

  test('two overlapping items: earlier start always takes the left column, regardless of input order', () => {
    const result = calculateGridOverlap([
      { id: 'later', startMin: 570, endMin: 630 },
      { id: 'earlier', startMin: 540, endMin: 600 },
    ]);

    expect(result.map((r) => r.id)).toEqual(['earlier', 'later']);
    expect(result[0].left).toBe(COL1_LEFT);
    expect(result[1].left).toBe(COL2_LEFT);
  });

  test('equal startMin ties are broken by endMin (shorter item first / left column)', () => {
    const result = calculateGridOverlap([
      { id: 'long', startMin: 540, endMin: 660 },
      { id: 'short', startMin: 540, endMin: 570 },
    ]);

    expect(result.map((r) => r.id)).toEqual(['short', 'long']);
    expect(result[0].left).toBe(COL1_LEFT);
    expect(result[1].left).toBe(COL2_LEFT);
  });

  test('three or more overlapping items collapse into a single full-width group', () => {
    const a = { id: 'a', startMin: 540, endMin: 600 };
    const b = { id: 'b', startMin: 550, endMin: 640 };
    const c = { id: 'c', startMin: 560, endMin: 620 };
    const result = calculateGridOverlap([c, a, b]); // unsorted on purpose

    expect(result).toEqual([
      {
        isGroup: true,
        startMin: 540, // earliest start in the cluster
        endMin: 640, // latest end in the cluster
        items: [a, b, c], // sorted by startMin
        left: FULL_LEFT,
        width: FULL_WIDTH,
      },
    ]);
  });

  test('chained overlap (a-b overlap, b-c overlap, a-c do not) still forms one 3-item group', () => {
    // a: 9:00-10:00, b: 9:30-11:00, c: 10:30-11:30
    // a and c never touch, but b bridges them into one cluster.
    const a = { id: 'a', startMin: 540, endMin: 600 };
    const b = { id: 'b', startMin: 570, endMin: 660 };
    const c = { id: 'c', startMin: 630, endMin: 690 };
    const result = calculateGridOverlap([a, b, c]);

    expect(result).toHaveLength(1);
    expect(result[0].isGroup).toBe(true);
    expect(result[0].startMin).toBe(540);
    expect(result[0].endMin).toBe(690);
    expect(result[0].items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  test('non-overlapping items each get the full-width column', () => {
    const result = calculateGridOverlap([
      { id: 'a', startMin: 480, endMin: 540 },
      { id: 'b', startMin: 600, endMin: 660 },
      { id: 'c', startMin: 720, endMin: 780 },
    ]);

    expect(result).toEqual([
      { id: 'a', startMin: 480, endMin: 540, left: FULL_LEFT, width: FULL_WIDTH },
      { id: 'b', startMin: 600, endMin: 660, left: FULL_LEFT, width: FULL_WIDTH },
      { id: 'c', startMin: 720, endMin: 780, left: FULL_LEFT, width: FULL_WIDTH },
    ]);
  });

  test('back-to-back items (one ends exactly when the next starts) do NOT overlap', () => {
    // 9:00-10:00 followed by 10:00-11:00 — must render as two full-width rows,
    // not a two-column split.
    const result = calculateGridOverlap([
      { id: 'a', startMin: 540, endMin: 600 },
      { id: 'b', startMin: 600, endMin: 660 },
    ]);

    expect(result).toEqual([
      { id: 'a', startMin: 540, endMin: 600, left: FULL_LEFT, width: FULL_WIDTH },
      { id: 'b', startMin: 600, endMin: 660, left: FULL_LEFT, width: FULL_WIDTH },
    ]);
  });

  test('mixed clusters in one day: pair, gap, single, gap, group of three', () => {
    const result = calculateGridOverlap([
      // cluster 1: two overlapping (8:00-9:00, 8:30-9:30)
      { id: 'p1', startMin: 480, endMin: 540 },
      { id: 'p2', startMin: 510, endMin: 570 },
      // cluster 2: lone item (12:00-13:00)
      { id: 'solo', startMin: 720, endMin: 780 },
      // cluster 3: three overlapping (15:00-16:00 x3)
      { id: 'g1', startMin: 900, endMin: 960 },
      { id: 'g2', startMin: 900, endMin: 960 },
      { id: 'g3', startMin: 900, endMin: 960 },
    ]);

    expect(result).toHaveLength(4);

    expect(result[0]).toEqual({ id: 'p1', startMin: 480, endMin: 540, left: COL1_LEFT, width: HALF_WIDTH });
    expect(result[1]).toEqual({ id: 'p2', startMin: 510, endMin: 570, left: COL2_LEFT, width: HALF_WIDTH });
    expect(result[2]).toEqual({ id: 'solo', startMin: 720, endMin: 780, left: FULL_LEFT, width: FULL_WIDTH });

    expect(result[3].isGroup).toBe(true);
    expect(result[3].startMin).toBe(900);
    expect(result[3].endMin).toBe(960);
    expect(result[3].items.map((i) => i.id)).toEqual(['g1', 'g2', 'g3']);
    expect(result[3].left).toBe(FULL_LEFT);
    expect(result[3].width).toBe(FULL_WIDTH);
  });

  test('one item fully containing another still splits into two columns (container first)', () => {
    const result = calculateGridOverlap([
      { id: 'inner', startMin: 570, endMin: 590 },
      { id: 'outer', startMin: 540, endMin: 660 },
    ]);

    expect(result.map((r) => r.id)).toEqual(['outer', 'inner']);
    expect(result[0]).toMatchObject({ left: COL1_LEFT, width: HALF_WIDTH });
    expect(result[1]).toMatchObject({ left: COL2_LEFT, width: HALF_WIDTH });
  });

  test('does not mutate the input array order', () => {
    const items = [
      { id: 'b', startMin: 600, endMin: 660 },
      { id: 'a', startMin: 480, endMin: 540 },
    ];
    calculateGridOverlap(items);
    expect(items.map((i) => i.id)).toEqual(['b', 'a']);
  });

  test('extra item properties are carried through to the output (consumers rely on this)', () => {
    // TimelineView passes whole task/event objects plus startMin/endMin.
    const result = calculateGridOverlap([
      { id: 'a', type: 'event', color: 'blue', startMin: 540, endMin: 600 },
    ]);
    expect(result[0]).toMatchObject({ id: 'a', type: 'event', color: 'blue' });
  });
});
