# Subscriptions

DAILY 15 Premium is sold as an auto-renewing subscription through Apple in-app purchase, managed with RevenueCat. The paywall is off until launch: with `VITE_PAYWALL` unset, everyone has every feature.

## What's free and what's Premium

Free: the daily 15, food logging with search, barcode and portions, missed-day estimates, streaks, the food choice after the 15, the evidence card, Apple Health and reminders.

Premium (`src/app/premium/config.ts`):

- the weekly review's advice and calorie target changes (Progress)
- focus areas and their diary tags (Profile)
- smart progression after the routine (more reps or another round)
- gym progression notes (the next weight to lift)

## Set-up before launch

1. App Store Connect: create a subscription group 'DAILY 15 Premium' with two auto-renewable subscriptions, annual (suggested £39.99) and monthly (suggested £5.99), each with a 14-day free trial as an introductory offer. Add the paid apps agreement, banking and tax details.
2. RevenueCat: create a project and an iOS app with bundle ID `com.carewtechnologies.daily15`, add the App Store Connect API key and the shared secret, import both products, create an entitlement called `premium` attached to both, and an offering marked current with an annual and a monthly package.
3. Put RevenueCat's public iOS SDK key in `VITE_REVENUECAT_IOS_KEY` (Codemagic environment variable and `.env.production`). It's a public key, safe in the app.
4. Turn the paywall on with `VITE_PAYWALL=on` for the build that goes to review. Test with a Sandbox Apple ID in TestFlight: buy, cancel, restore, and check Premium unlocks on the web app when signed in to the same account.

## Known limits

- The web app can't take payments. Users subscribe in the iPhone app; the web app then needs to know about it. Today the web app shows the paywall message only. Before launch, add a RevenueCat webhook that writes the entitlement to Supabase (a `subscriptions` table keyed by user ID) so the web app can read it.
- The paywall text covers Apple's requirements (price, period, auto-renewal, cancellation, terms and privacy links). App Review also expects 'Restore purchases', which is included.
