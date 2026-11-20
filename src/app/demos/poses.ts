/*
 * Two-position line drawings for each exercise, drawn in a 120 x 100 box with
 * the floor at y = 92. The figure faces right. "f" limbs are nearest the
 * viewer and drawn solid; "b" limbs are further away and drawn lighter.
 * c is an optional mid-back point for curved spines (cat-cow).
 */

export type Pt = [number, number];

export interface Pose {
  h: Pt; // head centre
  s: Pt; // shoulders
  p: Pt; // pelvis
  c?: Pt; // mid-back control point
  fe: Pt; fh: Pt; be: Pt; bh: Pt; // elbows and hands
  fk: Pt; ff: Pt; bk: Pt; bf: Pt; // knees and feet
}

export type Prop = "box" | "wall" | "chair" | "mat" | "bench";

/** Equipment held by the figure. Barbells in side view are drawn end-on, as a plate. */
export interface Held {
  kind: "dumbbell" | "barbell" | "kettlebell";
  /** Where it sits: in the hands (default) or across the upper back. */
  at?: "hands" | "back";
}

export interface Demo {
  a: Pose;
  b: Pose;
  /** Seconds for one full A to B to A cycle. */
  period: number;
  prop?: Prop;
  /** Front view rather than side view. */
  front?: boolean;
  held?: Held;
}

const stand: Pose = {
  h: [60, 13], s: [60, 24], p: [60, 52],
  fe: [61, 37], fh: [62, 49], be: [59, 37], bh: [58, 49],
  fk: [60, 72], ff: [60, 92], bk: [60, 72], bf: [60, 92],
};

const pose = (base: Pose, over: Partial<Pose>): Pose => ({ ...base, ...over });

const fours: Pose = {
  h: [86, 61], s: [76, 66], p: [46, 70],
  fe: [76, 79], fh: [76, 92], be: [75, 79], bh: [75, 92],
  fk: [47, 89], ff: [27, 91], bk: [46, 89], bf: [26, 91],
};

const lyingBack: Pose = {
  h: [19, 84], s: [30, 87], p: [56, 87],
  fe: [42, 90], fh: [54, 91], be: [41, 90], bh: [53, 91],
  fk: [68, 73], ff: [80, 91], bk: [67, 74], bf: [79, 91],
};

const pushUp: Pose = {
  h: [82, 63], s: [74, 67], p: [50, 77],
  fe: [74, 80], fh: [74, 92], be: [73, 80], bh: [73, 92],
  fk: [32, 85], ff: [15, 92], bk: [32, 85], bf: [15, 92],
};

export const DEMOS: Record<string, Demo> = {
  march: {
    period: 1.4,
    a: pose(stand, { fk: [76, 57], ff: [77, 75], fe: [54, 36], fh: [51, 47], be: [66, 35], bh: [73, 29] }),
    b: pose(stand, { bk: [76, 57], bf: [77, 75], be: [54, 36], bh: [51, 47], fe: [66, 35], fh: [73, 29] }),
  },
  squat: {
    period: 2.6,
    a: pose(stand, { fe: [72, 25], fh: [84, 25], be: [71, 26], bh: [83, 26] }),
    b: { h: [70, 41], s: [64, 50], p: [47, 70], fe: [76, 49], fh: [88, 48], be: [75, 50], bh: [87, 49], fk: [66, 72], ff: [60, 92], bk: [65, 72], bf: [59, 92] },
  },
  pushup: {
    period: 2.6,
    a: pushUp,
    b: { h: [87, 79], s: [78, 82], p: [52, 86], fe: [65, 82], fh: [74, 92], be: [64, 83], bh: [73, 92], fk: [33, 89], ff: [15, 92], bk: [33, 89], bf: [15, 92] },
  },
  bridge: {
    period: 3,
    prop: "mat",
    a: lyingBack,
    b: pose(lyingBack, { p: [53, 70], fk: [69, 67], bk: [68, 68] }),
  },
  plank: {
    period: 4,
    prop: "mat",
    a: { h: [87, 72], s: [78, 76], p: [50, 79], fe: [78, 90], fh: [91, 91], be: [77, 90], bh: [90, 91], fk: [32, 85], ff: [14, 91], bk: [32, 85], bf: [14, 91] },
    b: { h: [87, 71], s: [78, 75], p: [50, 78], fe: [78, 90], fh: [91, 91], be: [77, 90], bh: [90, 91], fk: [32, 84], ff: [14, 91], bk: [32, 84], bf: [14, 91] },
  },
  kneeRaise: {
    period: 1.8,
    a: pose(stand, { fk: [77, 45], ff: [80, 63], fe: [52, 38], fh: [49, 49], be: [67, 34], bh: [75, 28] }),
    b: pose(stand, { bk: [77, 45], bf: [80, 63], be: [52, 38], bh: [49, 49], fe: [67, 34], fh: [75, 28] }),
  },
  stretch: {
    period: 5,
    a: pose(stand, { fk: [66, 72], ff: [72, 92] }),
    b: { h: [86, 35], s: [78, 41], p: [56, 54], fe: [80, 54], fh: [81, 66], be: [79, 55], bh: [80, 67], fk: [69, 73], ff: [82, 92], bk: [55, 73], bf: [51, 92] },
  },
  stepUp: {
    period: 2.6,
    prop: "box",
    a: pose(stand, { h: [50, 13], s: [50, 24], p: [50, 52], fe: [51, 37], fh: [52, 49], be: [49, 37], bh: [48, 49], fk: [64, 66], ff: [70, 84], bk: [50, 72], bf: [50, 92] }),
    b: pose(stand, { h: [74, 6], s: [74, 17], p: [73, 45], fe: [75, 30], fh: [76, 42], be: [73, 30], bh: [72, 42], fk: [73, 65], ff: [73, 84], bk: [64, 62], bf: [58, 78] }),
  },
  wallPushup: {
    period: 2.4,
    prop: "wall",
    a: { h: [87, 26], s: [80, 34], p: [64, 57], fe: [90, 33], fh: [100, 31], be: [90, 34], bh: [100, 32], fk: [57, 75], ff: [50, 92], bk: [57, 75], bf: [50, 92] },
    b: { h: [95, 29], s: [88, 36], p: [69, 57], fe: [90, 47], fh: [100, 33], be: [89, 48], bh: [100, 34], fk: [59, 75], ff: [50, 92], bk: [59, 75], bf: [50, 92] },
  },
  kneePushup: {
    period: 2.6,
    prop: "mat",
    a: { h: [84, 63], s: [76, 67], p: [55, 76], fe: [76, 80], fh: [76, 92], be: [75, 80], bh: [75, 92], fk: [40, 89], ff: [25, 79], bk: [40, 89], bf: [25, 79] },
    b: { h: [89, 79], s: [80, 82], p: [57, 85], fe: [67, 83], fh: [76, 92], be: [66, 84], bh: [75, 92], fk: [40, 90], ff: [25, 80], bk: [40, 90], bf: [25, 80] },
  },
  lunge: {
    period: 2.8,
    a: stand,
    b: { h: [61, 30], s: [60, 41], p: [58, 68], fe: [60, 54], fh: [61, 66], be: [59, 54], bh: [58, 66], fk: [76, 70], ff: [75, 92], bk: [48, 87], bf: [31, 90] },
  },
  sitToStand: {
    period: 3,
    prop: "chair",
    a: { h: [53, 32], s: [50, 42], p: [42, 64], fe: [58, 46], fh: [52, 40], be: [57, 47], bh: [51, 41], fk: [62, 65], ff: [65, 92], bk: [61, 66], bf: [64, 92] },
    b: { h: [62, 13], s: [61, 24], p: [59, 52], fe: [69, 30], fh: [63, 25], be: [68, 31], bh: [62, 26], fk: [62, 72], ff: [65, 92], bk: [61, 72], bf: [64, 92] },
  },
  birdDog: {
    period: 3.2,
    prop: "mat",
    a: fours,
    b: pose(fours, { fe: [88, 64], fh: [100, 62], bk: [28, 70], bf: [10, 69] }),
  },
  deadBug: {
    period: 3.2,
    prop: "mat",
    a: { h: [19, 84], s: [30, 87], p: [56, 87], fe: [30, 74], fh: [30, 62], be: [31, 74], bh: [31, 62], fk: [56, 68], ff: [74, 68], bk: [57, 68], bf: [75, 68] },
    b: { h: [19, 84], s: [30, 87], p: [56, 87], fe: [20, 79], fh: [8, 81], be: [31, 74], bh: [31, 62], fk: [56, 68], ff: [74, 68], bk: [74, 81], bf: [92, 84] },
  },
  jumpingJack: {
    period: 1.1,
    front: true,
    a: { h: [60, 13], s: [60, 24], p: [60, 52], fe: [66, 36], fh: [68, 48], be: [54, 36], bh: [52, 48], fk: [62, 72], ff: [62, 92], bk: [58, 72], bf: [58, 92] },
    b: { h: [60, 13], s: [60, 24], p: [60, 51], fe: [70, 16], fh: [77, 5], be: [50, 16], bh: [43, 5], fk: [68, 71], ff: [75, 91], bk: [52, 71], bf: [45, 91] },
  },
  sidePlank: {
    period: 4,
    prop: "mat",
    front: true,
    a: { h: [88, 64], s: [80, 70], p: [52, 79], fe: [80, 90], fh: [92, 91], be: [81, 57], bh: [82, 45], fk: [33, 85], ff: [14, 91], bk: [33, 84], bf: [14, 90] },
    b: { h: [88, 62], s: [80, 68], p: [52, 75], fe: [80, 90], fh: [92, 91], be: [81, 55], bh: [82, 43], fk: [33, 83], ff: [14, 91], bk: [33, 82], bf: [14, 90] },
  },
  catCow: {
    period: 4,
    prop: "mat",
    a: pose(fours, { h: [87, 57], c: [61, 76] }),
    b: pose(fours, { h: [84, 72], c: [61, 56] }),
  },
  hipCircles: {
    period: 2.4,
    front: true,
    a: { h: [60, 13], s: [60, 24], p: [55, 52], fe: [69, 36], fh: [63, 50], be: [51, 36], bh: [57, 50], fk: [59, 72], ff: [64, 92], bk: [52, 72], bf: [55, 92] },
    b: { h: [60, 13], s: [60, 24], p: [65, 52], fe: [69, 36], fh: [70, 50], be: [51, 36], bh: [58, 50], fk: [68, 72], ff: [66, 92], bk: [61, 72], bf: [56, 92] },
  },
  thoracic: {
    period: 3.2,
    prop: "mat",
    a: pose(fours, { be: [70, 79], bh: [82, 62] }),
    b: pose(fours, { be: [72, 47], bh: [83, 58] }),
  },
  worldsGreatest: {
    period: 4,
    a: { h: [92, 54], s: [84, 59], p: [60, 72], fe: [84, 74], fh: [84, 91], be: [83, 74], bh: [83, 91], fk: [78, 70], ff: [81, 92], bk: [42, 82], bf: [24, 91] },
    b: { h: [92, 52], s: [84, 58], p: [60, 72], fe: [85, 44], fh: [86, 31], be: [83, 74], bh: [83, 91], fk: [78, 70], ff: [81, 92], bk: [42, 82], bf: [24, 91] },
  },
  hamstringStretch: {
    period: 5,
    a: { h: [86, 35], s: [78, 41], p: [56, 54], fe: [80, 54], fh: [81, 66], be: [79, 55], bh: [80, 67], fk: [69, 73], ff: [82, 92], bk: [55, 73], bf: [51, 92] },
    b: { h: [88, 38], s: [80, 44], p: [56, 55], fe: [82, 57], fh: [83, 69], be: [81, 58], bh: [82, 70], fk: [69, 73], ff: [82, 92], bk: [55, 74], bf: [51, 92] },
  },
  quadStretch: {
    period: 5,
    a: { h: [61, 13], s: [60, 24], p: [59, 52], fe: [55, 40], fh: [50, 56], be: [68, 31], bh: [77, 27], fk: [60, 71], ff: [49, 59], bk: [60, 72], bf: [60, 92] },
    b: { h: [61, 14], s: [60, 25], p: [59, 52], fe: [55, 41], fh: [49, 55], be: [68, 32], bh: [77, 29], fk: [61, 71], ff: [48, 57], bk: [60, 72], bf: [60, 92] },
  },
  chestStretch: {
    period: 5,
    a: { h: [62, 13], s: [60, 24], p: [59, 52], fe: [53, 36], fh: [47, 47], be: [54, 36], bh: [48, 48], fk: [60, 72], ff: [60, 92], bk: [59, 72], bf: [59, 92] },
    b: { h: [64, 13], s: [62, 24], p: [59, 52], fe: [50, 31], fh: [40, 37], be: [51, 32], bh: [41, 38], fk: [60, 72], ff: [60, 92], bk: [59, 72], bf: [59, 92] },
  },
  shoulderStretch: {
    // Front view: the left arm straight across the chest, the right hand pulling it in just above the elbow.
    period: 5,
    front: true,
    a: { h: [60, 13], s: [60, 24], p: [60, 52], fe: [53, 27], fh: [39, 29], be: [45, 39], bh: [51, 30], fk: [63, 72], ff: [65, 92], bk: [57, 72], bf: [55, 92] },
    b: { h: [60, 13], s: [60, 24], p: [60, 52], fe: [51, 26], fh: [36, 26], be: [44, 38], bh: [49, 29], fk: [63, 72], ff: [65, 92], bk: [57, 72], bf: [55, 92] },
  },
  childsPose: {
    period: 5,
    prop: "mat",
    a: { h: [73, 83], s: [64, 80], p: [40, 77], fe: [78, 88], fh: [92, 90], be: [77, 88], bh: [91, 90], fk: [57, 89], ff: [37, 91], bk: [57, 89], bf: [37, 91] },
    b: { h: [73, 81], s: [64, 77], p: [40, 75], fe: [78, 87], fh: [92, 90], be: [77, 87], bh: [91, 90], fk: [57, 89], ff: [37, 91], bk: [57, 89], bf: [37, 91] },
  },
};


/* ---------- Weighted exercises ---------- */

const hinge: Pose = { h: [83, 37], s: [75, 41], p: [52, 52], fe: [76, 53], fh: [76, 65], be: [75, 53], bh: [75, 65], fk: [58, 72], ff: [60, 92], bk: [57, 72], bf: [59, 92] };
const lyingBench: Pose = { h: [20, 70], s: [30, 74], p: [56, 74], fe: [24, 82], fh: [31, 70], be: [25, 82], bh: [32, 70], fk: [72, 68], ff: [76, 92], bk: [71, 69], bf: [75, 92] };
const squatLow: Pose = { h: [70, 41], s: [64, 50], p: [47, 70], fe: [70, 58], fh: [70, 51], be: [69, 59], bh: [69, 52], fk: [66, 72], ff: [60, 92], bk: [65, 72], bf: [59, 92] };

export const WEIGHTED: Record<string, Demo> = {
  gobletSquat: {
    period: 2.8,
    held: { kind: "dumbbell" },
    a: pose(stand, { fe: [65, 36], fh: [66, 29], be: [64, 37], bh: [65, 30] }),
    b: squatLow,
  },
  dumbbellRdl: { period: 3, held: { kind: "dumbbell" }, a: pose(stand, { fh: [62, 51], bh: [61, 51] }), b: hinge },
  dumbbellRow: { period: 2.4, held: { kind: "dumbbell" }, a: hinge, b: pose(hinge, { fe: [63, 39], fh: [70, 49], be: [62, 40], bh: [69, 50] }) },
  shoulderPressDb: {
    period: 2.4,
    held: { kind: "dumbbell" },
    a: pose(stand, { fe: [64, 34], fh: [64, 22], be: [63, 35], bh: [63, 23] }),
    b: pose(stand, { fe: [61, 12], fh: [61, 0], be: [60, 12], bh: [60, 0] }),
  },
  bicepCurl: { period: 2.2, held: { kind: "dumbbell" }, a: pose(stand, { fh: [62, 50], bh: [61, 50] }), b: pose(stand, { fh: [69, 28], bh: [68, 29] }) },
  lateralRaise: {
    period: 2.4,
    front: true,
    held: { kind: "dumbbell" },
    a: { h: [60, 13], s: [60, 24], p: [60, 52], fe: [66, 36], fh: [68, 48], be: [54, 36], bh: [52, 48], fk: [63, 72], ff: [64, 92], bk: [57, 72], bf: [56, 92] },
    b: { h: [60, 13], s: [60, 24], p: [60, 52], fe: [72, 25], fh: [84, 26], be: [48, 25], bh: [36, 26], fk: [63, 72], ff: [64, 92], bk: [57, 72], bf: [56, 92] },
  },
  tricepOverhead: {
    period: 2.4,
    held: { kind: "dumbbell" },
    a: pose(stand, { fe: [63, 9], fh: [54, 17], be: [62, 9], bh: [53, 17] }),
    b: pose(stand, { fe: [61, 11], fh: [61, 0], be: [60, 11], bh: [60, 0] }),
  },
  dumbbellPress: { period: 2.4, prop: "bench", held: { kind: "dumbbell" }, a: lyingBench, b: pose(lyingBench, { fe: [30, 62], fh: [30, 50], be: [31, 62], bh: [31, 50] }) },
  splitSquat: {
    period: 2.6,
    held: { kind: "dumbbell" },
    a: { h: [59, 13], s: [58, 24], p: [58, 52], fe: [59, 37], fh: [60, 49], be: [57, 37], bh: [57, 49], fk: [68, 71], ff: [74, 92], bk: [50, 71], bf: [40, 91] },
    b: { h: [59, 28], s: [58, 39], p: [58, 66], fe: [59, 52], fh: [60, 64], be: [57, 52], bh: [57, 64], fk: [76, 68], ff: [75, 92], bk: [49, 86], bf: [36, 90] },
  },
  calfRaise: { period: 1.8, held: { kind: "dumbbell" }, a: pose(stand, { fh: [62, 50], bh: [61, 50] }), b: pose(stand, { h: [60, 9], s: [60, 20], p: [60, 48], fe: [61, 33], fh: [62, 46], be: [59, 33], bh: [61, 46], fk: [61, 69], ff: [62, 90], bk: [60, 69], bf: [61, 90] }) },
  kettlebellSwing: {
    period: 1.6,
    held: { kind: "kettlebell" },
    a: { h: [80, 36], s: [72, 40], p: [50, 54], fe: [68, 52], fh: [63, 62], be: [67, 52], bh: [62, 62], fk: [58, 72], ff: [60, 92], bk: [57, 72], bf: [59, 92] },
    b: pose(stand, { fe: [72, 26], fh: [84, 28], be: [71, 27], bh: [83, 29] }),
  },
  kettlebellDeadlift: {
    period: 2.8,
    held: { kind: "kettlebell" },
    a: { h: [78, 47], s: [71, 52], p: [48, 64], fe: [70, 64], fh: [68, 76], be: [69, 64], bh: [67, 76], fk: [64, 76], ff: [60, 92], bk: [63, 76], bf: [59, 92] },
    b: pose(stand, { fh: [62, 51], bh: [61, 51] }),
  },
  backSquat: {
    period: 2.8,
    held: { kind: "barbell", at: "back" },
    a: pose(stand, { fe: [54, 32], fh: [58, 23], be: [53, 33], bh: [57, 24] }),
    b: { h: [70, 41], s: [64, 50], p: [47, 70], fe: [58, 58], fh: [62, 49], be: [57, 59], bh: [61, 50], fk: [66, 72], ff: [60, 92], bk: [65, 72], bf: [59, 92] },
  },
  deadlift: {
    period: 3,
    held: { kind: "barbell" },
    a: { h: [78, 44], s: [70, 48], p: [48, 62], fe: [69, 60], fh: [68, 72], be: [68, 60], bh: [67, 72], fk: [64, 74], ff: [60, 92], bk: [63, 74], bf: [59, 92] },
    b: pose(stand, { fh: [62, 51], bh: [61, 51] }),
  },
  overheadPress: {
    period: 2.6,
    held: { kind: "barbell" },
    a: pose(stand, { fe: [64, 34], fh: [66, 23], be: [63, 35], bh: [65, 24] }),
    b: pose(stand, { fe: [61, 12], fh: [61, 0], be: [60, 12], bh: [60, 0] }),
  },
  barbellRow: { period: 2.4, held: { kind: "barbell" }, a: hinge, b: pose(hinge, { fe: [63, 39], fh: [70, 49], be: [62, 40], bh: [69, 50] }) },
  benchPress: { period: 2.6, prop: "bench", held: { kind: "barbell" }, a: lyingBench, b: pose(lyingBench, { fe: [30, 62], fh: [30, 50], be: [31, 62], bh: [31, 50] }) },
  hipThrust: {
    period: 2.6,
    prop: "bench",
    held: { kind: "barbell" },
    a: { h: [26, 62], s: [33, 70], p: [52, 86], fe: [42, 80], fh: [52, 84], be: [41, 80], bh: [51, 84], fk: [70, 74], ff: [74, 92], bk: [69, 75], bf: [73, 92] },
    b: { h: [26, 62], s: [33, 70], p: [56, 70], fe: [45, 72], fh: [56, 68], be: [44, 72], bh: [55, 68], fk: [72, 69], ff: [74, 92], bk: [71, 70], bf: [73, 92] },
  },
};
Object.assign(DEMOS, WEIGHTED);

const BY_NAME: Record<string, string> = {
  "march or brisk walk": "march",
  "air squats": "squat",
  "push-ups": "pushup",
  "glute bridges": "bridge",
  plank: "plank",
  "standing knee raises": "kneeRaise",
  "gentle stretching": "stretch",
  "step-ups": "stepUp",
  "wall push-ups": "wallPushup",
  "knee push-ups": "kneePushup",
  "reverse lunges": "lunge",
  "chair sit-to-stand": "sitToStand",
  "bird dog": "birdDog",
  "dead bug": "deadBug",
  "jumping jacks": "jumpingJack",
  "side plank": "sidePlank",
  "cat-cow": "catCow",
  "hip circles": "hipCircles",
  "thoracic rotations": "thoracic",
  "world's greatest stretch": "worldsGreatest",
  "child's pose": "childsPose",
  hamstrings: "hamstringStretch",
  quads: "quadStretch",
  chest: "chestStretch",
  shoulders: "shoulderStretch",
  "goblet squat": "gobletSquat",
  "dumbbell romanian deadlift": "dumbbellRdl",
  "dumbbell row": "dumbbellRow",
  "dumbbell shoulder press": "shoulderPressDb",
  "bicep curl": "bicepCurl",
  "lateral raise": "lateralRaise",
  "overhead tricep extension": "tricepOverhead",
  "dumbbell bench press": "dumbbellPress",
  "split squat": "splitSquat",
  "calf raise": "calfRaise",
  "kettlebell swing": "kettlebellSwing",
  "kettlebell deadlift": "kettlebellDeadlift",
  "kettlebell goblet squat": "gobletSquat",
  "back squat": "backSquat",
  deadlift: "deadlift",
  "overhead press": "overheadPress",
  "bent-over row": "barbellRow",
  "bench press": "benchPress",
  "hip thrust": "hipThrust",
  "romanian deadlift": "dumbbellRdl",
};

export function demoFor(exerciseName: string): Demo | null {
  const key = BY_NAME[exerciseName.trim().toLowerCase()];
  return key ? DEMOS[key] : null;
}
