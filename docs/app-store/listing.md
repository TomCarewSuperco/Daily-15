# App Store listing

Copy for App Store Connect, checked against Apple's character limits. Bracketed items need filling in before submission.

## App information

| Field | Value | Limit |
|---|---|---|
| Name | DAILY 15 | 8 of 30 |
| Subtitle | Workouts, food, steps, weight | 29 of 30 |
| Primary category | Health & Fitness | |
| Secondary category | Food & Drink | |
| Bundle ID | com.carewtechnologies.daily15 | |
| SKU | DAILY15-IOS | |
| Content rights | Contains no third-party content needing rights, apart from Open Food Facts data under the Open Database Licence, credited in the app | |
| Age rating | 4+ on the questionnaire (no objectionable content). Set the app's own minimum age to 16 in the description and privacy policy | |

## Version information

Promotional text (136 of 170):

> Fifteen minutes a day, honest food logging and a weight trend that ignores daily swings. Show up every day and see whether it's working.

Keywords (98 of 100, comma-separated, no spaces; the name and category are indexed already so they're left out):

```
fitness,workout,calorie counter,food diary,macros,protein,steps,weight loss,habit,home workout,gym
```

Support URL: `https://[your Vercel domain]/support`
Marketing URL: optional
Privacy policy URL: `https://[your Vercel domain]/privacy`

Description (1953 of 4,000):

```
DAILY 15 is a simple daily fitness, nutrition and accountability app. It brings exercise, food, steps and weight together in one place, so you can see what you're doing, whether it's working and what to do next.

SHOW UP EVERY DAY
A 15-minute daily routine you can do anywhere: brisk walk, squats, push-ups, glute bridges, plank, knee raises and stretching. Guided step by step with animated demonstrations, timers and a rep counter. Adjust the reps, swap any exercise, or choose light or recovery mode on busy or sore days.

TRACK EVERY WORKOUT
Log gym sessions, runs, rides, swims, classes and sport. Record sets, reps, weights, distance and pace. Personal bests update automatically. Save favourite routines to repeat in seconds.

LOG FOOD QUICKLY
Search common foods and UK branded products, scan a barcode, or enter values by hand. Save meals and build recipes. See calories remaining, protein, carbohydrate, fat, fibre and water at a glance. Estimated values are clearly marked and easy to correct.

STEPS AND APPLE HEALTH
Connect Apple Health to bring in steps, distance, active energy, exercise minutes, workouts and weigh-ins from your iPhone and Apple Watch. Set your own daily step target.

SEE WHAT'S WORKING
A weight trend line that smooths out daily ups and downs. Body measurements, optional progress photos, streaks and a weekly report with realistic suggestions for next week.

BUILT FOR CONSISTENCY
Streaks reward showing up, and planned rest days pause your streak rather than break it. Missing a day never brings a guilt message. Reminders arrive when you choose.

YOUR DATA, YOUR CHOICE
Sync across devices with your account. Export everything or delete your account at any time. No adverts, no tracking and no selling your data.

DAILY 15 provides general fitness information, not medical advice. Calorie and nutrition figures are estimates. Speak to a GP before starting a new exercise or diet plan if you have a health condition.
```

## Screenshots

In `docs/app-store/screenshots`, generated with `npm run screenshots` from demo data:

| Order | Screen | 6.9-inch file | 6.5-inch file |
|---|---|---|---|
| 1 | Home dashboard | 6.9in-1-home.png | 6.5in-1-home.png |
| 2 | Guided workout | 6.9in-2-guided-workout.png | 6.5in-2-guided-workout.png |
| 3 | Food diary | 6.9in-3-nutrition.png | 6.5in-3-nutrition.png |
| 4 | Weight trend and steps | 6.9in-4-progress.png | 6.5in-4-progress.png |
| 5 | Weekly report | 6.9in-5-weekly-report.png | 6.5in-5-weekly-report.png |
| 6 | Daily routine with demonstration | 6.9in-6-workouts.png | 6.5in-6-workouts.png |

The 6.9-inch set is 1,320 x 2,868 and the 6.5-inch set is 1,242 x 2,688, both portrait. They're plain app screens. Captioned marketing versions can follow.

## App Privacy answers (App Store Connect, App Privacy)

Data used to track you: none.

Data linked to you, all for App Functionality only, none for tracking, advertising or analytics:

| Apple category | Data type | Why |
|---|---|---|
| Contact Info | Email Address | Account sign-in and service emails |
| Health & Fitness | Health | Weight, body measurements, food and nutrition diary |
| Health & Fitness | Fitness | Workouts, steps, distance, active minutes, exercise minutes |
| User Content | Other User Content | Saved meals, recipes, favourite routines, workout notes |
| Identifiers | User ID | Account identifier used to sync data |

Not collected: location, contacts, browsing history, search history, purchases, financial info, diagnostics, advertising data. Progress photos never leave the device, so they aren't declared. Food search terms go to Open Food Facts without any identifier. Confirm none of this has changed before each submission.

## Notes for App Review

```
DAILY 15 is a daily fitness, food and weight tracker. An account is required so data can sync across devices.

Demo account
Email: [review account email]
Password: [review account password]
The account has six weeks of sample data.

Apple Health is optional. To try it: Profile, Integrations, Connect Apple Health. The app reads steps, walking distance, active energy, exercise minutes, weight and workouts, and writes weigh-ins. Health data is used only to show the user's progress inside the app. It is never used for advertising, never shared with third parties and never stored in iCloud.

Account deletion: Profile, Your data, Delete my account and data. This permanently deletes the account and its data from our servers.

Food product search and barcode lookup use the Open Food Facts open database (openfoodfacts.org), credited in the app.

The app gives general fitness information and labels calorie and nutrition figures as estimates. It doesn't diagnose or treat any condition.
```

## Setting up the review account

1. Custom SMTP must be working in Supabase first, so the reviewer can also register if they want to.
2. Register the review account in the app with an address you control, and confirm it.
3. Load the sample data: `node tests/demo-data.cjs > demo.json`, then in the app, Profile, Your data, Restore, and choose `demo.json`. It syncs to the account.
