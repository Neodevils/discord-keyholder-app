import { CommandBuilder, InteractionFlags } from "@minesa-org/mini-interaction";
import type { CommandInteraction, InteractionCommand } from "@minesa-org/mini-interaction";
import { tryGetDb } from "../utils/database.ts";

const CLAIM_COOLDOWN_MS = 15 * 60 * 1000;
const DISCORD_API_BASE = "https://discord.com/api/v10";
const CLAIM_ROLE_ID = "1333017381529976874";

type ClaimCooldownRecord = {
	nextClaimAt?: unknown;
};

type ClaimHolderRecord = {
	userId?: unknown;
};

function getCooldownKey(guildId: string, roleId: string, userId: string) {
	return `claim-cooldown:${guildId}:${roleId}:${userId}`;
}

function getHolderKey(guildId: string, roleId: string) {
	return `claim-holder:${guildId}:${roleId}`;
}

function getRemainingCooldown(record: ClaimCooldownRecord | null) {
	const nextClaimAt = typeof record?.nextClaimAt === "number" ? record.nextClaimAt : 0;
	return Math.max(0, nextClaimAt - Date.now());
}

function formatDuration(milliseconds: number) {
	const totalSeconds = Math.ceil(milliseconds / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;

	return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

async function discordRequest(path: string, init: RequestInit = {}) {
	const token = process.env.DISCORD_BOT_TOKEN;

	if (!token) {
		throw new Error("DISCORD_BOT_TOKEN environment variable is not set.");
	}

	const response = await fetch(`${DISCORD_API_BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bot ${token}`,
			"Content-Type": "application/json",
			...init.headers,
		},
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Discord API error (${response.status}): ${body}`);
	}

	return response;
}

async function removeRoleFromMember(guildId: string, roleId: string, userId: string) {
	await discordRequest(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
		method: "DELETE",
	});
}

async function giveRoleToMember(guildId: string, roleId: string, userId: string) {
	await discordRequest(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
		method: "PUT",
	});
}

const claim: InteractionCommand = {
	data: new CommandBuilder()
		.setDefaultMemberPermissions(null)
		.setDMPermission(false)
		.setName("claim")
		.setDescription("Claim the keyholder role."),

	handler: async (interaction: CommandInteraction) => {
		await interaction.deferReply({ flags: InteractionFlags.Ephemeral });

		const guildId = interaction.guild_id;
		const roleId = CLAIM_ROLE_ID;
		const userId = interaction.member?.user?.id ?? interaction.user?.id;

		if (!guildId || !userId) {
			await interaction.editReply({
				content: "This command can only be used in a server.",
			});
			return;
		}

		const cooldownKey = getCooldownKey(guildId, roleId, userId);
		const holderKey = getHolderKey(guildId, roleId);
		const db = tryGetDb();

		const cooldown = db ? ((await db.get(cooldownKey)) as ClaimCooldownRecord | null) : null;
		const remainingCooldown = getRemainingCooldown(cooldown);

		if (remainingCooldown > 0) {
			await interaction.editReply({
				content: `You are in cooldown. Please wait ${formatDuration(remainingCooldown)} before claiming it again.`,
			});
			return;
		}

		try {
			const holderRecord = db ? ((await db.get(holderKey)) as ClaimHolderRecord | null) : null;
			const previousHolderId = typeof holderRecord?.userId === "string" ? holderRecord.userId : null;

			if (previousHolderId && previousHolderId !== userId) {
				try {
					await removeRoleFromMember(guildId, roleId, previousHolderId);
				} catch (error) {
					// If previous holder already doesn't have the role (or can't be edited), we still proceed.
					console.warn("⚠️ Could not remove role from previous holder:", error);
				}
			}
			await giveRoleToMember(guildId, roleId, userId);

			if (db) {
				const claimedAt = Date.now();
				await db.set(holderKey, {
					userId,
				});
				await db.set(cooldownKey, {
					nextClaimAt: claimedAt + CLAIM_COOLDOWN_MS,
				});
			}

			await interaction.editReply({
				content: `<:db_innkeeper:1506320921617498223> You claimed <@&${roleId}>, have fun with the perks!`,
			});
		} catch (error) {
			console.error("❌ Claim command failed:", error);
			await interaction.editReply({
				content: "❌ Could not claim the role. Make sure the bot has Manage Roles permission and that the claimed role is below the bot's highest role.",
			});
		}
	},
};

export default claim;
