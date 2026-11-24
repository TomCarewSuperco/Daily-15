import type { Nutrients, Reminder, RoutineExercise } from "./types";

export const DEFAULT_ROUTINE: RoutineExercise[] = [
  {
    id: "march",
    name: "March or brisk walk",
    kind: "time",
    amount: 180,
    instructions:
      "March on the spot or walk briskly. Lift your knees to hip height if you can and swing your arms. Breathe steadily.",
  },
  {
    id: "squat",
    name: "Air squats",
    kind: "reps",
    amount: 15,
    instructions:
      "Feet shoulder-width apart. Push your hips back and bend your knees as if sitting on a chair. Keep your chest up and heels down. Stand fully between reps.",
  },
  {
    id: "pushup",
    name: "Push-ups",
    kind: "reps",
    amount: 10,
    instructions:
      "Hands slightly wider than shoulders. Keep a straight line from head to heels. Lower your chest towards the floor, then press up. Drop to your knees or use a wall if needed.",
  },
  {
    id: "bridge",
    name: "Glute bridges",
    kind: "reps",
    amount: 15,
    instructions:
      "Lie on your back, knees bent, feet flat. Squeeze your glutes and lift your hips until your body forms a line from shoulders to knees. Pause, then lower slowly.",
  },
  {
    id: "plank",
    name: "Plank",
    kind: "time",
    amount: 20,
    instructions:
      "Forearms on the floor, elbows under shoulders. Hold a straight line from head to heels. Brace your stomach and don't let your hips sag. Drop to your knees if needed.",
  },
  {
    id: "knees",
    name: "Standing knee raises",
    kind: "time",
    amount: 30,
    instructions:
      "Stand tall. Lift one knee towards your chest, lower it, then switch. Keep a steady pace and hold a wall for balance if needed.",
  },
  {
    id: "stretch",
    name: "Gentle stretching",
    kind: "time",
    amount: 120,
    instructions:
      "Hamstrings, quads, chest and shoulders. Hold each stretch for 20 to 30 seconds without bouncing. Stretch to mild tension, never pain.",
  },
];

/** Swaps for the daily routine. Each keeps roughly the same demand. */
export const SUBSTITUTES: Omit<RoutineExercise, "id">[] = [
  { name: "Step-ups", kind: "reps", amount: 15, instructions: "Step up onto a low, stable step with one foot, then the other. Step down and alternate the lead leg." },
  { name: "Wall push-ups", kind: "reps", amount: 12, instructions: "Hands on a wall at shoulder height. Lean in, bending your elbows, then push back. Easier on wrists and shoulders." },
  { name: "Knee push-ups", kind: "reps", amount: 10, instructions: "Standard push-up from your knees. Keep a straight line from head to knees." },
  { name: "Reverse lunges", kind: "reps", amount: 12, instructions: "Step one foot back and lower until both knees are bent at about 90 degrees. Push back up and alternate legs." },
  { name: "Chair sit-to-stand", kind: "reps", amount: 12, instructions: "Sit on a sturdy chair, stand without using your hands, sit back down with control." },
  { name: "Bird dog", kind: "time", amount: 30, instructions: "On all fours, extend the opposite arm and leg. Hold briefly, return and switch sides. Keep your back flat." },
  { name: "Dead bug", kind: "time", amount: 30, instructions: "Lie on your back, arms up, knees at 90 degrees. Lower the opposite arm and leg slowly, keeping your lower back on the floor." },
  { name: "Jumping jacks", kind: "time", amount: 30, instructions: "Jump your feet out while raising your arms, then return. Step side to side for a low-impact version." },
  { name: "Skater steps", kind: "time", amount: 30, instructions: "Step wide to one side and bring the other foot behind you, then step back the other way. Add a small hop to make it harder, or keep it low impact." },
  { name: "Shadow boxing", kind: "time", amount: 30, instructions: "Feet staggered, hands up by your chin. Throw alternate straight punches at shoulder height, turning through your hips, and stay light on your feet." },
  { name: "Side plank", kind: "time", amount: 20, instructions: "On one forearm, feet stacked, lift your hips. Split the time between sides." },
  // Glutes
  { name: "Single-leg glute bridges", kind: "reps", amount: 12, instructions: "Lie on your back, one foot flat and the other leg straight. Squeeze your glutes and lift your hips until they line up with the straight leg. Lower slowly. Switch legs halfway." },
  { name: "Glute bridge march", kind: "time", amount: 30, instructions: "Lift into a glute bridge and hold your hips level while you lift one knee towards your chest, then the other. Don't let your hips drop or twist." },
  { name: "Donkey kicks", kind: "reps", amount: 20, instructions: "On all fours, keep one knee bent at 90 degrees and push that foot up towards the ceiling, squeezing your glute. Keep your back flat. Switch legs halfway." },
  // Core
  { name: "Hollow hold", kind: "time", amount: 20, instructions: "Lie on your back, press your lower back into the floor, then lift your shoulders and legs slightly with arms reaching past your head. Bend your knees to make it easier." },
  { name: "Reverse crunches", kind: "reps", amount: 12, instructions: "Lie on your back, knees bent over your hips. Use your lower abs to curl your hips off the floor towards your chest, then lower with control. No swinging." },
  { name: "Bicycle crunches", kind: "reps", amount: 20, instructions: "Lie on your back, hands lightly behind your head. Bring one knee in as you turn the opposite elbow towards it, straightening the other leg. Alternate sides slowly." },
];

/** Exercises made of several moves done in turn, splitting the time equally. */
export interface ExerciseStep {
  name: string;
  instructions: string;
}

const STEPS: Record<string, ExerciseStep[]> = {
  "gentle stretching": [
    { name: "Hamstrings", instructions: "Put one heel forward with the leg straight and toes up. Hinge at the hips with a straight back until you feel the back of the thigh. Switch legs halfway." },
    { name: "Quads", instructions: "Stand tall and hold one ankle behind you, knees together and hips pushed slightly forward. Hold a wall for balance if needed. Switch legs halfway." },
    { name: "Chest", instructions: "Clasp your hands behind your back, straighten your arms and lift them gently while opening your chest. Keep your shoulders down." },
    { name: "Shoulders", instructions: "Bring one arm across your chest and hold it above the elbow with the other hand. Keep the shoulder down. Switch arms halfway." },
  ],
};

export function stepsFor(exerciseName: string): ExerciseStep[] | null {
  return STEPS[exerciseName.trim().toLowerCase()] ?? null;
}

export const MOBILITY_ROUTINE: Omit<RoutineExercise, "id">[] = [
  { name: "Cat-cow", kind: "time", amount: 60, instructions: "On all fours, alternate arching and rounding your back slowly with your breath." },
  { name: "Hip circles", kind: "time", amount: 60, instructions: "Hands on hips, draw slow circles in each direction." },
  { name: "Thoracic rotations", kind: "time", amount: 60, instructions: "On all fours, hand behind head, rotate your elbow up towards the ceiling then down. Switch sides halfway." },
  { name: "World's greatest stretch", kind: "time", amount: 60, instructions: "Lunge forward, place both hands inside the front foot, then rotate the inside arm to the ceiling. Switch sides halfway." },
  { name: "Child's pose", kind: "time", amount: 60, instructions: "Kneel, sit back on your heels and reach your arms forward. Breathe slowly." },
];

/** Scales the default routine. Light halves volume. Recovery swaps to mobility. */
export const MODE_INFO = {
  standard: { label: "Standard", note: "The full DAILY 15." },
  light: { label: "Light", note: "Half the reps and time. Use it on busy or low-energy days." },
  recovery: { label: "Recovery", note: "Five minutes of mobility. Use it when sore or after a hard session." },
} as const;

export const WORKOUT_CATEGORIES = [
  "HIIT",
  "Circuit training",
  "Weight training",
  "Running",
  "Cycling",
  "Swimming",
  "Walking",
  "Boxing",
  "Yoga",
  "Pilates",
  "Home workout",
  "Sport or other",
] as const;

export const DISTANCE_CATEGORIES = new Set(["Running", "Cycling", "Swimming", "Walking"]);
export const STRENGTH_CATEGORIES = new Set(["Weight training", "Circuit training", "Home workout", "HIIT"]);

export { FOOD_DB, type FoodItem, type FoodUnit } from "./foods";

export const DEFAULT_REMINDERS: Reminder[] = [
  { type: "workout", enabled: true, time: "07:30" },
  { type: "food", enabled: false, time: "20:00" },
  { type: "steps", enabled: false, time: "18:00" },
  { type: "water", enabled: false, time: "12:00" },
  { type: "weigh-in", enabled: false, time: "07:00", weekday: 1 },
  { type: "weekly-review", enabled: true, time: "19:00", weekday: 0 },
];

export const REMINDER_LABELS: Record<Reminder["type"], string> = {
  workout: "Daily workout",
  food: "Food logging",
  steps: "Step goal",
  water: "Water",
  "weigh-in": "Weigh-in",
  "weekly-review": "Weekly review",
};

export const REMINDER_MESSAGES: Record<Reminder["type"], string> = {
  workout: "Your DAILY 15 is ready when you are.",
  food: "Take a minute to log today's food.",
  steps: "A short walk now will move you towards today's step target.",
  water: "Time for a glass of water.",
  "weigh-in": "Weigh-in day. Same time, same conditions.",
  "weekly-review": "Your weekly report is ready.",
};
