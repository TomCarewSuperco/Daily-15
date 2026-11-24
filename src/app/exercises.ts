import { demoFor } from "./demos/poses";

/*
 * Exercise library for logging and building workouts. Instructions are general
 * coaching cues, not medical advice. Machines have no drawing.
 */

export type Equipment = "none" | "dumbbells" | "kettlebell" | "barbell" | "machine";

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  none: "No equipment",
  dumbbells: "Dumbbells",
  kettlebell: "Kettlebell",
  barbell: "Barbell",
  machine: "Gym machines",
};

export interface LibraryExercise {
  name: string;
  equipment: Equipment;
  muscles: string;
  instructions: string;
  /** Logged as seconds rather than reps. */
  timed?: boolean;
}

export const EXERCISES: LibraryExercise[] = [
  // Bodyweight
  { name: "Air squats", equipment: "none", muscles: "Legs, glutes", instructions: "Feet shoulder-width apart. Sit back and down, chest up, heels down. Stand fully between reps." },
  { name: "Push-ups", equipment: "none", muscles: "Chest, shoulders, triceps", instructions: "Hands slightly wider than shoulders, body in a straight line. Lower your chest to the floor and press up. Use your knees or a wall to make it easier." },
  { name: "Knee push-ups", equipment: "none", muscles: "Chest, shoulders, triceps", instructions: "As a push-up, from your knees. Keep a straight line from head to knees." },
  { name: "Reverse lunges", equipment: "none", muscles: "Legs, glutes", instructions: "Step back and lower until both knees are at about 90 degrees. Push through the front heel to stand." },
  { name: "Step-ups", equipment: "none", muscles: "Legs, glutes", instructions: "Step onto a sturdy step or box, drive through the heel and stand tall. Step down with control." },
  { name: "Glute bridges", equipment: "none", muscles: "Glutes, hamstrings", instructions: "Lie on your back, knees bent. Squeeze your glutes and lift your hips until your body is straight from shoulders to knees." },
  { name: "Plank", equipment: "none", muscles: "Core", instructions: "Forearms on the floor, elbows under shoulders, body straight. Brace your stomach and breathe.", timed: true },
  { name: "Side plank", equipment: "none", muscles: "Core, obliques", instructions: "On one forearm, feet stacked, lift your hips into a straight line. Switch sides.", timed: true },
  { name: "Dead bug", equipment: "none", muscles: "Core", instructions: "On your back, arms up, knees at 90 degrees. Lower the opposite arm and leg slowly while keeping your lower back down." },
  { name: "Bird dog", equipment: "none", muscles: "Core, back", instructions: "On all fours, reach the opposite arm and leg out long. Pause, return, switch." },
  { name: "Jumping jacks", equipment: "none", muscles: "Cardio", instructions: "Jump feet out while raising your arms, then back. Step side to side for a low-impact version.", timed: true },
  { name: "Wall push-ups", equipment: "none", muscles: "Chest, shoulders", instructions: "Hands on a wall at shoulder height. Bend your elbows to bring your chest towards the wall, then push back." },
  // Dumbbells
  { name: "Goblet squat", equipment: "dumbbells", muscles: "Legs, glutes", instructions: "Hold one dumbbell upright at your chest. Squat between your knees, chest up, then stand." },
  { name: "Dumbbell Romanian deadlift", equipment: "dumbbells", muscles: "Hamstrings, glutes", instructions: "Dumbbells in front of your thighs, soft knees. Push your hips back with a flat back until you feel your hamstrings, then stand by squeezing your glutes." },
  { name: "Dumbbell row", equipment: "dumbbells", muscles: "Back, biceps", instructions: "Hinge forward with a flat back. Pull the dumbbells towards your hips, elbows close, then lower with control." },
  { name: "Dumbbell bench press", equipment: "dumbbells", muscles: "Chest, shoulders, triceps", instructions: "Lie on a bench (or the floor), dumbbells over your chest. Lower to the sides of your chest, then press up." },
  { name: "Dumbbell shoulder press", equipment: "dumbbells", muscles: "Shoulders, triceps", instructions: "Dumbbells at shoulder height. Press overhead without arching your back, then lower." },
  { name: "Split squat", equipment: "dumbbells", muscles: "Legs, glutes", instructions: "One foot forward, one back, dumbbells at your sides. Lower straight down until the back knee nearly touches the floor. Switch legs." },
  { name: "Bicep curl", equipment: "dumbbells", muscles: "Biceps", instructions: "Elbows by your sides. Curl the dumbbells up without swinging, then lower slowly." },
  { name: "Overhead tricep extension", equipment: "dumbbells", muscles: "Triceps", instructions: "Hold one dumbbell overhead with both hands. Lower it behind your head by bending your elbows, then straighten." },
  { name: "Lateral raise", equipment: "dumbbells", muscles: "Shoulders", instructions: "Light dumbbells at your sides. Raise your arms out to shoulder height with a slight bend in the elbows, then lower slowly." },
  { name: "Calf raise", equipment: "dumbbells", muscles: "Calves", instructions: "Stand tall holding dumbbells. Rise onto the balls of your feet, pause, lower slowly." },
  // Kettlebell
  { name: "Kettlebell swing", equipment: "kettlebell", muscles: "Glutes, hamstrings, back", instructions: "Hinge and hike the kettlebell back between your legs, then snap your hips forward so it floats to chest height. The power comes from your hips, not your arms." },
  { name: "Kettlebell goblet squat", equipment: "kettlebell", muscles: "Legs, glutes", instructions: "Hold the kettlebell by the horns at your chest. Squat down between your knees and stand." },
  { name: "Kettlebell deadlift", equipment: "kettlebell", muscles: "Glutes, hamstrings, back", instructions: "Kettlebell between your feet. Hinge, grip with a flat back, and stand by driving your hips forward." },
  // Barbell
  { name: "Back squat", equipment: "barbell", muscles: "Legs, glutes", instructions: "Bar across your upper back. Brace, sit down and back to at least parallel, then stand. Use a rack with safety bars." },
  { name: "Deadlift", equipment: "barbell", muscles: "Back, glutes, hamstrings", instructions: "Bar over mid-foot. Grip, flatten your back, push the floor away and stand tall. Lower with control." },
  { name: "Bench press", equipment: "barbell", muscles: "Chest, shoulders, triceps", instructions: "Lie on the bench, eyes under the bar. Lower to mid-chest and press up. Use safety bars or a spotter." },
  { name: "Overhead press", equipment: "barbell", muscles: "Shoulders, triceps", instructions: "Bar at your collarbone. Brace and press straight up, moving your head back out of the way, then lower." },
  { name: "Bent-over row", equipment: "barbell", muscles: "Back, biceps", instructions: "Hinge forward with a flat back. Pull the bar to your lower ribs, then lower with control." },
  { name: "Romanian deadlift", equipment: "barbell", muscles: "Hamstrings, glutes", instructions: "Hold the bar at your thighs, soft knees. Push your hips back until you feel your hamstrings, then stand." },
  { name: "Hip thrust", equipment: "barbell", muscles: "Glutes", instructions: "Upper back on a bench, bar over your hips with a pad. Drive your hips up until your body is straight from shoulders to knees." },
  // Machines and cables
  { name: "Lat pulldown", equipment: "machine", muscles: "Back, biceps", instructions: "Grip the bar wider than shoulders. Pull it to your upper chest, leading with your elbows, then let it rise with control." },
  { name: "Seated cable row", equipment: "machine", muscles: "Back, biceps", instructions: "Sit tall, knees soft. Pull the handle to your stomach, squeezing your shoulder blades together, then return slowly." },
  { name: "Leg press", equipment: "machine", muscles: "Legs, glutes", instructions: "Feet shoulder-width on the platform. Lower until your knees are at about 90 degrees, then push away without locking your knees." },
  { name: "Leg curl", equipment: "machine", muscles: "Hamstrings", instructions: "Pad just above your heels. Curl your heels towards you, pause, then lower slowly." },
  { name: "Leg extension", equipment: "machine", muscles: "Quads", instructions: "Pad on your shins. Straighten your legs, pause, then lower slowly." },
  { name: "Triceps pushdown", equipment: "machine", muscles: "Triceps", instructions: "At a cable with a rope or bar. Elbows by your sides, push down until your arms are straight, then return." },
  { name: "Chest press machine", equipment: "machine", muscles: "Chest, shoulders, triceps", instructions: "Handles at chest height. Press forward until your arms are nearly straight, then return slowly." },
  { name: "Face pull", equipment: "machine", muscles: "Upper back, shoulders", instructions: "Rope at face height. Pull towards your face, elbows high, hands apart, then return slowly." },
];

const BY_NAME = new Map(EXERCISES.map((e) => [e.name.toLowerCase(), e]));

export function findExercise(name: string): LibraryExercise | undefined {
  return BY_NAME.get(name.trim().toLowerCase());
}

export function suggestExercises(query: string, limit = 6): LibraryExercise[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return EXERCISES.filter((e) => e.name.toLowerCase().includes(q) || e.muscles.toLowerCase().includes(q))
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)))
    .slice(0, limit);
}

export const hasDemo = (name: string) => !!demoFor(name);

/* ---------- Prebuilt workouts ---------- */

export interface PrebuiltWorkout {
  id: string;
  name: string;
  equipment: Equipment;
  category: string;
  intensity: "light" | "moderate" | "intense";
  description: string;
  /** [exercise, sets, reps (or seconds for timed exercises)] */
  exercises: [string, number, number][];
}

export const PREBUILT: PrebuiltWorkout[] = [
  { id: "home-full", name: "Full body, no equipment", equipment: "none", category: "Home workout", intensity: "moderate", description: "A short all-round session for home.", exercises: [["Air squats", 3, 15], ["Push-ups", 3, 10], ["Reverse lunges", 3, 10], ["Glute bridges", 3, 15], ["Dead bug", 3, 10]] },
  { id: "home-core", name: "Core, no equipment", equipment: "none", category: "Home workout", intensity: "light", description: "Steady core work that's kind to your back.", exercises: [["Dead bug", 3, 10], ["Bird dog", 3, 10], ["Side plank", 3, 20], ["Plank", 3, 30]] },
  { id: "home-hiit", name: "Bodyweight circuit", equipment: "none", category: "HIIT", intensity: "intense", description: "Move quickly between exercises, rest at the end of each round.", exercises: [["Jumping jacks", 4, 30], ["Air squats", 4, 15], ["Push-ups", 4, 10], ["Step-ups", 4, 12]] },
  { id: "db-full", name: "Full body, dumbbells", equipment: "dumbbells", category: "Weight training", intensity: "moderate", description: "Five big movements covering the whole body.", exercises: [["Goblet squat", 3, 10], ["Dumbbell bench press", 3, 10], ["Dumbbell row", 3, 10], ["Dumbbell Romanian deadlift", 3, 10], ["Dumbbell shoulder press", 3, 10]] },
  { id: "db-upper", name: "Upper body, dumbbells", equipment: "dumbbells", category: "Weight training", intensity: "moderate", description: "Chest, back, shoulders and arms.", exercises: [["Dumbbell bench press", 3, 10], ["Dumbbell row", 3, 10], ["Dumbbell shoulder press", 3, 10], ["Lateral raise", 3, 12], ["Bicep curl", 3, 12], ["Overhead tricep extension", 3, 12]] },
  { id: "db-lower", name: "Lower body, dumbbells", equipment: "dumbbells", category: "Weight training", intensity: "moderate", description: "Legs and glutes.", exercises: [["Goblet squat", 3, 10], ["Dumbbell Romanian deadlift", 3, 10], ["Split squat", 3, 8], ["Glute bridges", 3, 15], ["Calf raise", 3, 15]] },
  { id: "kb-basics", name: "Kettlebell basics", equipment: "kettlebell", category: "Weight training", intensity: "moderate", description: "Learn the swing with a few supporting lifts.", exercises: [["Kettlebell deadlift", 3, 10], ["Kettlebell goblet squat", 3, 10], ["Kettlebell swing", 4, 15], ["Plank", 3, 30]] },
  { id: "gym-a", name: "Gym full body A", equipment: "barbell", category: "Weight training", intensity: "intense", description: "Classic strength session. Alternate with B.", exercises: [["Back squat", 3, 5], ["Bench press", 3, 5], ["Bent-over row", 3, 8], ["Plank", 3, 30]] },
  { id: "gym-b", name: "Gym full body B", equipment: "barbell", category: "Weight training", intensity: "intense", description: "Classic strength session. Alternate with A.", exercises: [["Deadlift", 3, 5], ["Overhead press", 3, 5], ["Lat pulldown", 3, 10], ["Hip thrust", 3, 10]] },
  { id: "gym-push", name: "Push", equipment: "barbell", category: "Weight training", intensity: "intense", description: "Chest, shoulders and triceps.", exercises: [["Bench press", 4, 6], ["Overhead press", 3, 8], ["Dumbbell bench press", 3, 10], ["Lateral raise", 3, 12], ["Triceps pushdown", 3, 12]] },
  { id: "gym-pull", name: "Pull", equipment: "barbell", category: "Weight training", intensity: "intense", description: "Back and biceps.", exercises: [["Deadlift", 3, 5], ["Lat pulldown", 3, 10], ["Seated cable row", 3, 10], ["Face pull", 3, 15], ["Bicep curl", 3, 12]] },
  { id: "gym-legs", name: "Legs", equipment: "barbell", category: "Weight training", intensity: "intense", description: "Quads, hamstrings, glutes and calves.", exercises: [["Back squat", 4, 6], ["Romanian deadlift", 3, 8], ["Leg press", 3, 10], ["Leg curl", 3, 12], ["Calf raise", 3, 15]] },
  { id: "machines", name: "Machines circuit", equipment: "machine", category: "Weight training", intensity: "moderate", description: "Good for getting started in a gym.", exercises: [["Leg press", 3, 10], ["Chest press machine", 3, 10], ["Lat pulldown", 3, 10], ["Seated cable row", 3, 10], ["Leg curl", 3, 12], ["Triceps pushdown", 3, 12]] },
];
