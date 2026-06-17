import {
	MiniInteraction,
} from "@minesa-org/mini-interaction";
import dotenv from "dotenv";
dotenv.config();

export const mini = new MiniInteraction(
	{
		commandsDirectory: "src/commands",
		applicationId: process.env.DISCORD_APPLICATION_ID!,
		publicKey: process.env.DISCORD_PUBLIC_KEY!,
		token: process.env.DISCORD_BOT_TOKEN!,
	}
);

export default mini.createNodeHandler();
