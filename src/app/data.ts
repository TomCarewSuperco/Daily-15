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
  { name: "Side plank", kind: "time", amount: 20, instructions: "On one forearm, feet stacked, lift your hips. Split the time between sides." },
];

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

export interface FoodItem extends Nutrients {
  name: string;
  /** Values are per this many grams or millilitres. */
  per: number;
  unit: "g" | "ml";
  /** A typical portion, used as the default amount. */
  typical: number;
}

/**
 * A small starter database. Values are rounded averages per 100 g or 100 ml from
 * typical UK product labels and are estimates only. Brands vary. Replace with a
 * licensed database before public release.
 */
export const FOOD_DB: FoodItem[] = [
  { name: "Porridge oats, dry", per: 100, unit: "g", typical: 40, kcal: 375, protein: 11, carbs: 60, fat: 8, fibre: 9 },
  { name: "Semi-skimmed milk", per: 100, unit: "ml", typical: 200, kcal: 47, protein: 3.5, carbs: 4.8, fat: 1.7, fibre: 0 },
  { name: "Skimmed milk", per: 100, unit: "ml", typical: 200, kcal: 35, protein: 3.5, carbs: 5, fat: 0.1, fibre: 0 },
  { name: "Greek yoghurt, 0% fat", per: 100, unit: "g", typical: 150, kcal: 57, protein: 10, carbs: 3.6, fat: 0.2, fibre: 0 },
  { name: "Egg, large", per: 100, unit: "g", typical: 60, kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fibre: 0 },
  { name: "Wholemeal bread", per: 100, unit: "g", typical: 40, kcal: 240, protein: 10, carbs: 41, fat: 2.5, fibre: 7 },
  { name: "White bread", per: 100, unit: "g", typical: 40, kcal: 250, protein: 9, carbs: 47, fat: 2, fibre: 2.7 },
  { name: "Banana", per: 100, unit: "g", typical: 120, kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, fibre: 2.6 },
  { name: "Apple", per: 100, unit: "g", typical: 150, kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, fibre: 2.4 },
  { name: "Blueberries", per: 100, unit: "g", typical: 80, kcal: 57, protein: 0.7, carbs: 14, fat: 0.3, fibre: 2.4 },
  { name: "Chicken breast, cooked", per: 100, unit: "g", typical: 150, kcal: 165, protein: 31, carbs: 0, fat: 3.6, fibre: 0 },
  { name: "Salmon fillet, cooked", per: 100, unit: "g", typical: 120, kcal: 206, protein: 22, carbs: 0, fat: 13, fibre: 0 },
  { name: "Tuna, tinned in water", per: 100, unit: "g", typical: 110, kcal: 109, protein: 25, carbs: 0, fat: 1, fibre: 0 },
  { name: "Beef mince 5% fat, cooked", per: 100, unit: "g", typical: 125, kcal: 175, protein: 27, carbs: 0, fat: 7.5, fibre: 0 },
  { name: "Tofu, firm", per: 100, unit: "g", typical: 100, kcal: 144, protein: 15, carbs: 3, fat: 8.7, fibre: 2.3 },
  { name: "Baked beans", per: 100, unit: "g", typical: 200, kcal: 80, protein: 4.7, carbs: 13, fat: 0.4, fibre: 3.7 },
  { name: "Lentils, cooked", per: 100, unit: "g", typical: 150, kcal: 116, protein: 9, carbs: 20, fat: 0.4, fibre: 7.9 },
  { name: "White rice, cooked", per: 100, unit: "g", typical: 180, kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fibre: 0.4 },
  { name: "Brown rice, cooked", per: 100, unit: "g", typical: 180, kcal: 123, protein: 2.7, carbs: 26, fat: 1, fibre: 1.6 },
  { name: "Pasta, cooked", per: 100, unit: "g", typical: 180, kcal: 158, protein: 5.8, carbs: 31, fat: 0.9, fibre: 1.8 },
  { name: "Potato, boiled", per: 100, unit: "g", typical: 200, kcal: 87, protein: 1.9, carbs: 20, fat: 0.1, fibre: 1.8 },
  { name: "Sweet potato, baked", per: 100, unit: "g", typical: 150, kcal: 90, protein: 2, carbs: 21, fat: 0.2, fibre: 3.3 },
  { name: "Broccoli", per: 100, unit: "g", typical: 80, kcal: 34, protein: 2.8, carbs: 7, fat: 0.4, fibre: 2.6 },
  { name: "Mixed salad leaves", per: 100, unit: "g", typical: 50, kcal: 17, protein: 1.3, carbs: 3, fat: 0.2, fibre: 1.5 },
  { name: "Avocado", per: 100, unit: "g", typical: 70, kcal: 160, protein: 2, carbs: 8.5, fat: 15, fibre: 6.7 },
  { name: "Cheddar cheese", per: 100, unit: "g", typical: 30, kcal: 416, protein: 25, carbs: 0.1, fat: 35, fibre: 0 },
  { name: "Cottage cheese", per: 100, unit: "g", typical: 150, kcal: 98, protein: 11, carbs: 3.4, fat: 4.3, fibre: 0 },
  { name: "Peanut butter", per: 100, unit: "g", typical: 15, kcal: 588, protein: 25, carbs: 20, fat: 50, fibre: 6 },
  { name: "Almonds", per: 100, unit: "g", typical: 30, kcal: 579, protein: 21, carbs: 22, fat: 50, fibre: 12.5 },
  { name: "Olive oil", per: 100, unit: "ml", typical: 10, kcal: 824, protein: 0, carbs: 0, fat: 92, fibre: 0 },
  { name: "Butter", per: 100, unit: "g", typical: 10, kcal: 717, protein: 0.9, carbs: 0.1, fat: 81, fibre: 0 },
  { name: "Whey protein powder", per: 100, unit: "g", typical: 30, kcal: 380, protein: 75, carbs: 8, fat: 6, fibre: 0 },
  { name: "Dark chocolate 70%", per: 100, unit: "g", typical: 20, kcal: 598, protein: 7.8, carbs: 46, fat: 43, fibre: 11 },
  { name: "Crisps, ready salted", per: 100, unit: "g", typical: 25, kcal: 530, protein: 6, carbs: 53, fat: 32, fibre: 4 },
  { name: "Orange juice", per: 100, unit: "ml", typical: 150, kcal: 45, protein: 0.7, carbs: 10, fat: 0.2, fibre: 0.2 },
  { name: "Coffee with semi-skimmed milk", per: 100, unit: "ml", typical: 250, kcal: 20, protein: 1.3, carbs: 1.9, fat: 0.7, fibre: 0 },
  { name: "Beer, 4%", per: 100, unit: "ml", typical: 568, kcal: 43, protein: 0.5, carbs: 3.6, fat: 0, fibre: 0 },
  { name: "Red wine", per: 100, unit: "ml", typical: 175, kcal: 85, protein: 0.1, carbs: 2.6, fat: 0, fibre: 0 },
  { name: "Hummus", per: 100, unit: "g", typical: 50, kcal: 280, protein: 7, carbs: 13, fat: 22, fibre: 6 },
  { name: "Granola", per: 100, unit: "g", typical: 45, kcal: 450, protein: 10, carbs: 60, fat: 18, fibre: 7 },
];

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
