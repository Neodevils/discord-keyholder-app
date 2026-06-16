import {
	CommandBuilder,
	InteractionFlags,
	MiniPermFlags,
} from "@minesa-org/mini-interaction";
import type { CommandInteraction, InteractionCommand } from "@minesa-org/mini-interaction";
import { db } from "../utils/database.js";

const CLAIM_COOLDOWN_MS = 15 * 60 * 1000;
const DISCORD_API_BASE = "https://discord.com/api/v10";

type GuildMember = {
	user?: {
		id?: string;
	};
	roles?: string[];
};

type ClaimCooldownRecord = {
	guildId?: unknown;
	roleId?: unknown;
	claimedBy?: unknown;
	claimedAt?: unknown;
	nextClaimAt?: unknown;
};

function getCooldownKey(guildId: string, roleId: string) {
	return `claim:${guildId}:${roleId}`;
}

function getRemainingCooldown(record: ClaimCooldownRecord | null) {
	const nextClaimAt = typeof record?.nextClaimAt === "number" ? record.nextClaimAt : 0;
	return Math.max(0, nextClaimAt - Date.now());
}

function formatDuration(milliseconds: number) {
	const totalSeconds = Math.ceil(milliseconds / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;

	return `${minutes}dk ${seconds.toString().padStart(2, "0")}sn`;
}

async function discordRequest(path: string, init: RequestInit = {}) {
	const token = process.env.DISCORD_BOT_TOKEN;

	if (!token) {
		throw new Error("DISCORD_BOT_TOKEN ortam değişkeni ayarlı değil.");
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
		throw new Error(`Discord API hatası (${response.status}): ${body}`);
	}

	return response;
}

async function fetchMembersWithRole(guildId: string, roleId: string) {
	const members: GuildMember[] = [];
	let after = "0";

	while (true) {
		const response = await discordRequest(
			`/guilds/${guildId}/members?limit=1000&after=${after}`
		);
		const page = (await response.json()) as GuildMember[];

		if (page.length === 0) {
			break;
		}

		for (const member of page) {
			if (member.roles?.includes(roleId)) {
				members.push(member);
			}
		}

		const lastUserId = page.at(-1)?.user?.id;
		if (page.length < 1000 || !lastUserId) {
			break;
		}

		after = lastUserId;
	}

	return members;
}

async function removeRoleFromMembers(guildId: string, roleId: string, excludedUserId: string) {
	const members = await fetchMembersWithRole(guildId, roleId);
	let removedCount = 0;

	for (const member of members) {
		const userId = member.user?.id;
		if (!userId || userId === excludedUserId) {
			continue;
		}

		await discordRequest(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
			method: "DELETE",
		});
		removedCount += 1;
	}

	return removedCount;
}

async function giveRoleToMember(guildId: string, roleId: string, userId: string) {
	await discordRequest(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
		method: "PUT",
	});
}

const claim: InteractionCommand = {
	data: new CommandBuilder()
		.setDefaultMemberPermissions(MiniPermFlags.ManageRoles)
		.setDMPermission(false)
		.setName("claim")
		.setDescription("Seçilen rolü herkesten alıp size verir.")
		.addRoleOption((option) =>
			option
				.setName("rol")
				.setDescription("Claimlenecek rol")
				.setRequired(true)
		),

	handler: async (interaction: CommandInteraction) => {
		await interaction.deferReply({ flags: InteractionFlags.Ephemeral });

		const guildId = interaction.guild_id;
		const role = interaction.options.getRole("rol", true);

		if (!role) {
			await interaction.editReply({
				content: "Claimlenecek rol bulunamadı.",
			});
			return;
		}

		const userId = interaction.member?.user?.id ?? interaction.user?.id;

		if (!guildId || !userId) {
			await interaction.editReply({
				content: "Bu komut sadece sunucu içinde kullanılabilir.",
			});
			return;
		}

		const cooldownKey = getCooldownKey(guildId, role.id);
		const cooldown = (await db.get(cooldownKey)) as ClaimCooldownRecord | null;
		const remainingCooldown = getRemainingCooldown(cooldown);

		if (remainingCooldown > 0) {
			await interaction.editReply({
				content: `Bu rol yakın zamanda claimlendi. Tekrar kullanmak için ${formatDuration(remainingCooldown)} bekleyin.`,
			});
			return;
		}

		try {
			const removedCount = await removeRoleFromMembers(guildId, role.id, userId);
			await giveRoleToMember(guildId, role.id, userId);

			const claimedAt = Date.now();
			await db.set(cooldownKey, {
				guildId,
				roleId: role.id,
				claimedBy: userId,
				claimedAt,
				nextClaimAt: claimedAt + CLAIM_COOLDOWN_MS,
			});

			await interaction.editReply({
				content: `✅ <@&${role.id}> rolü claimlendi. Rol ${removedCount} kişiden alındı ve size verildi. 15dk bekleme süresi başladı.`,
			});
		} catch (error) {
			console.error("❌ Claim command failed:", error);
			await interaction.editReply({
				content: "❌ Rol claimlenemedi. Botun Manage Roles yetkisi olduğundan ve rolün bot rolünün altında kaldığından emin olun.",
			});
		}
	},
};

export default claim;
