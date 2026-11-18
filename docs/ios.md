# iPhone app

The iPhone app wraps the same web app with Capacitor. The Xcode project is in `ios/App`. Web code changes reach the app after `npm run ios:sync`.

## What the native app adds

- Apple Health: reads steps, walking distance, active energy, exercise minutes, weight and workouts, and writes weigh-ins. Connect it from Profile. It syncs the last 14 days when the app opens or returns to the foreground. Code: `src/app/native/health.ts`.
- Reminders scheduled with the phone, so they arrive when the app is closed. Code: `src/app/native/notifications.ts`.
- Durable storage: app data is mirrored to native storage, which iOS doesn't clear under storage pressure, and the sign-in session lives there. Code: `src/app/native/durable.ts` and `src/app/cloud/client.ts`.
- Email links: confirmation and password-reset emails sent from the app return to `daily15://auth-callback`, which opens the app and completes sign-in. Code: `src/app/native/bootstrap.ts`.
- Barcode scanning uses the same ZXing scanner as the web app, inside the app's web view.

## One-off setup

1. Apple Developer Program membership for the account that will publish the app.
2. In the Apple Developer portal, register the App ID `com.carewtechnologies.daily15` with the HealthKit capability. The App ID is permanent once the app ships. Change `appId` in `capacitor.config.ts` and `PRODUCT_BUNDLE_IDENTIFIER` in the Xcode project together if it should be different.
3. In App Store Connect, create the app with that bundle ID.
4. In Supabase, Authentication, URL Configuration, add `daily15://auth-callback` to Redirect URLs.
5. Custom SMTP in Supabase, so App Review can register.

## Building

With a Mac: `npm ci && npm run ios:sync && npm run ios:open`, choose your team under Signing and Capabilities, then run on a device or use Product, Archive to upload to App Store Connect.

Without a Mac: Codemagic, using `codemagic.yaml`. Follow the setup notes at the top of that file.

## App Store submission checklist

- Privacy policy URL, and the App Privacy answers in App Store Connect: email address, health and fitness data, linked to the user, used for app functionality, not tracking. `ios/App/App/PrivacyInfo.xcprivacy` declares the same.
- Screenshots for 6.9-inch and 6.5-inch iPhones.
- A demo account for App Review, with data in it, and notes explaining Apple Health is optional.
- Age rating questionnaire, support URL, category Health & Fitness.
- Apple Health data must not be used for advertising or stored in iCloud (guideline 5.1.3). DAILY 15 stores daily totals and imported workouts in the user's Supabase account, which the privacy policy must disclose.

## Not yet verified

Nothing native has been compiled or run yet. The project was generated and configured on Linux without Xcode. Expect to fix small build issues on the first Xcode or Codemagic build, then test Apple Health, reminders and email links on a real iPhone.
