import { RoleConnectionMetadataTypes } from "@minesa-org/mini-interaction";
import { mini } from "../api/interactions";
import dotenv from "dotenv";
dotenv.config();

// Vercel build sırasında Discord'a komut basmak istemiyoruz.
// Komut kaydı CI/CD'de ayrı bir adım olmalı (lokalde veya manuel run).
if (process.env.VERCEL) {
	console.log("ℹ️ VERCEL detected. Skipping command registration during build.");
	process.exit(0);
}

if (!process.env.DISCORD_BOT_TOKEN) {
	console.log("⚠️ DISCORD_BOT_TOKEN not found. Skipping command registration.");
	process.exit(0);
}

await mini.registerCommands(process.env.DISCORD_BOT_TOKEN!);
await mini.registerMetadata(process.env.DISCORD_BOT_TOKEN!, [
	{
		key: "is_miniapp",
		name: "Is Mini App?",
		description: "Is the user an assistant?",
		type: RoleConnectionMetadataTypes.BooleanEqual,
	},
]);

console.log("Registration complete!");
