# App Template of mini-interaction

Use this repository as a starting point for your mini-interaction Discord app.

## 1. Prepare the project

-   Clone the repo and install dependencies: `npm install`
-   Create your `.env` from `.env.example`, then fill in the values you need

## 2. `/claim` command

`/claim rol:<role>` seçilen rolü sunucudaki herkesten alır, komutu kullanan üyeye verir ve aynı rol için 15 dakikalık bekleme süresi başlatır.

Gerekli Vercel environment variables:

-   `DISCORD_APPLICATION_ID`
-   `DISCORD_PUBLIC_KEY` veya `DISCORD_APP_PUBLIC_KEY`
-   `DISCORD_BOT_TOKEN`
-   `MONGODB_URI` (15 dakikalık bekleme süresinin Vercel serverless ortamında kalıcı tutulması için)

Botun sunucuda **Manage Roles** yetkisi olmalı ve claimlenecek rol botun en yüksek rolünün altında kalmalıdır. Büyük sunucularda üyeleri listeleyebilmek için botun Discord Developer Portal üzerinde gerekli member intent ayarlarına da ihtiyaç duyabilir.

## 3. Run locally

-   Register commands: `npm run build`
-   Run `vercel --prod` to connect your repository on Vercel to run your app

## 4. Deploy to Vercel

-   Install the Vercel CLI once: `npm install -g vercel`
-   Log in and link this project: `vercel login` then `vercel link`
-   Sync environment variables: `vercel env pull` (optional, but keeps CLI and dashboard in sync)
-   Deploy: `vercel --prod`

That’s it—your template is ready for Vercel-powered Discord App.

> [!NOTE]
> It is easier to do all of these on Vercel. All you have to import your repository and add env.
