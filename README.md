# DAILY 15

Personal fitness, nutrition and accountability app. Mobile-first web version one.

## Run locally

```sh
npm install
npm run dev
```

## Build and deploy

```sh
npm run build
```

The build writes static files to `dist/`. Paths are relative, so the output works at a domain root or in any subfolder. Users can add it to a phone's home screen.

The app is hosted on Vercel, which redeploys on every push to `main`. `vercel.json` sets the build.

Config for Netlify (`netlify.toml`) and Cloudflare Pages (`wrangler.toml` and `public/_headers`) is included in case it moves.

## iPhone app

See `docs/ios.md`. The Capacitor project is in `ios/`. Run `npm run ios:sync` after web changes.

## Tests

`npm test` runs unit tests for the merge rules and calculations, then browser tests against stand-ins for Supabase and Open Food Facts. It needs Playwright with Chromium, and ffmpeg.

## Accounts and sync

With `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` set (see `.env.example`), the app requires an account: sign in, register with email confirmation, forgot password and change password. Each user's data is saved to Supabase as one JSON document per user and synced across devices. Without those settings, the app runs on-device only with no accounts.

Supabase setup, once per project:

1. Apply `supabase/migrations/20261118000000_user_state.sql`. It creates the `user_state` table with row level security so users can only read and write their own row.
2. Deploy the `delete-account` Edge Function in `supabase/functions/delete-account`. It deletes the signed-in user and, through the foreign key, their data.
3. In Authentication, URL Configuration, set the Site URL to the production address and add it to Redirect URLs. Confirmation and reset emails link back there.
4. In Authentication, Providers, Email, keep 'Confirm email' on and set the minimum password length to 8.
5. The production values are in `.env.production`, so Vercel picks them up on each build. Both are public by design.

Sync saves a short delay after each change. If another device saved in the meantime, the two versions are merged item by item (`src/app/cloud/merge.ts`): additions from both are kept, a deletion wins unless the other device edited that item, and if both edited the same item the device saving last wins. Writes only succeed if the row is unchanged since it was read, so two devices saving at once merge rather than overwrite. Changes made offline are kept on the device and saved on reconnection. Progress photos stay on the device and aren't synced. Signing out removes the user's data from the device.

## Known limits

- In the browser, steps are entered by hand. The iPhone app syncs them from Apple Health.
- In the browser, reminders fire only while the app is open. The iPhone app schedules them with the phone.
- Photo meal recognition isn't built.
- The built-in food list has 100 common UK foods with everyday units, compiled from general nutrition knowledge and shown as estimates. Replace with CoFID data before public release.
- Branded product search and barcode lookups use Open Food Facts under the Open Database Licence, which requires the attribution shown in the app. Its search allows about ten requests a minute per user, so the app searches only when asked.
- Camera scanning uses the browser's barcode detector where available and ZXing elsewhere, including Safari on iPhone.
- Calorie and protein targets are estimates from the Mifflin-St Jeor equation and should be checked by a registered dietitian before launch.
