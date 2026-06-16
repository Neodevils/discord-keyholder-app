# App Template of mini-interaction

Use this repository as a starting point for your mini-interaction Discord app.

## 1. Prepare the project

-   Clone the repo and install dependencies: `npm install`
-   Create your `.env` from `.env.example`, then fill in the values you need

## 2. `/claim` command

`/claim` assigns the fixed keyholder role (`1333017381529976874`) to the member who runs the command, removes that role from everyone else in the server, and starts a 15-minute cooldown for the same server and role.

Required Vercel environment variables:

-   `DISCORD_APPLICATION_ID`
-   `DISCORD_PUBLIC_KEY` or `DISCORD_APP_PUBLIC_KEY`
-   `DISCORD_BOT_TOKEN`
-   `MONGODB_URI` from the Vercel MongoDB integration, used to persist the 15-minute cooldown across serverless invocations and deployments

Members can run `/claim` without parameters and do not need elevated Discord permissions. The bot still needs **Manage Roles** permission, and the fixed keyholder role must be below the bot's highest role. Large servers may also require the relevant member intent in the Discord Developer Portal so the bot can list members and remove the role from the previous holder.

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
