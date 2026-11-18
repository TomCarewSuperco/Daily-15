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

Config is included for four hosts. Use one.

- GitHub Pages: in the repository's Settings, Pages, set Source to 'GitHub Actions'. Every push to `main` then deploys through `.github/workflows/deploy-pages.yml`. Pages on a private repository needs a paid GitHub plan.
- Netlify: import the repository. `netlify.toml` sets the build.
- Vercel: import the repository. `vercel.json` sets the build.
- Cloudflare Pages: connect the repository, set the build command to `npm run build` and the output directory to `dist`. `wrangler.toml` and `public/_headers` cover the rest.

## Data

All data is stored in the browser on the user's device. There are no accounts, no server and no sync. Users can export, restore and delete their data from the Profile tab.

## Known limits

- Steps are entered by hand. Apple Health, Health Connect and wearables need native apps.
- Reminders fire only while the app is open.
- Photo meal recognition isn't built.
- The food database is a 40-item starter set and needs a licensed database before public release.
- Barcode data comes from Open Food Facts under the Open Database Licence, which requires the attribution shown in the app.
- Calorie and protein targets are estimates from the Mifflin-St Jeor equation and should be checked by a registered dietitian before launch.
