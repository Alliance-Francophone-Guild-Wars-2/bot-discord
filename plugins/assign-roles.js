const Emojis = require("../emojis.js")
const Plugin = require("../plugin.js")
module.exports = class AssignRole extends Plugin {
 	GUILD_ID = process.env.GUILD_ID
 	ROLES_CHANNEL_NAME = "assignation-de-role"
 	ROLES = new Map([
		[process.env.MESSAGE_ROLES, new Map([
		    ["catmander_red", "PvE"],
		    ["Protection", "McM"],
		    ["ranger_druid", "Raideurs"],
		    ["guardian_firebrand", "Fractales"]
		])],

		[process.env.MESSAGE_ROLES_WvW, new Map([
			["commander_green", "MerDeJade"],
			["commander_white", "RocheAugure"],
			["commander_cyan", "FortRanik"],
			["commander_pink", "PierreArborea"],
			["commander_yellow", "Vizunah"]
		])]
	])

	handleReaction(fn) {
		return super.handleReaction(async (reaction, user) => {
			const message = reaction.message
			const channel = reaction.message.channel
			if (channel.name != this.ROLES_CHANNEL_NAME) return
			fn(reaction, user)
		})
	}

	async findMemberAndRoleFromReaction(reaction, user) {
		const message = reaction.message
		const roles = this.ROLES.get(message.id)
		if (roles == undefined) return

		const emoji = reaction._emoji.name
		const reaction_role = roles.get(emoji)
		if (reaction_role == undefined) return

		const guild = message.guild
		const discord_role = guild.roles.cache.find(r => r.name === reaction_role)
		if (discord_role == undefined) return Promise.reject()
		const member = await guild.members.fetch(user.id)
		if (member == undefined) return

		return [member, discord_role]
	}

	constructor(client) {
		super(client)
		this.client.once("ready", async () => {
			const guild = await this.client.guilds.fetch(this.GUILD_ID)
			const channel = await guild.channels.cache.find(c => c.name === this.ROLES_CHANNEL_NAME)
			if (channel == undefined) return

			for (const [message_id, roles] of this.ROLES.entries()) {
				const message = await channel.messages.fetch(message_id)
				for(const reaction of roles.keys()) {
					const emoji = Emojis.emoji(guild, reaction)
					if (emoji == undefined) continue
					await message.react(emoji)
				}
			}
		})
		this.client.on("messageReactionAdd", this.handleReaction(async (reaction, user) => {
			const result = await this.findMemberAndRoleFromReaction(reaction, user)
			if (result == undefined) return
			const [member, role] = result
			member.roles.add(role)
			member.send(`Je t’ai ajouté le rôle @${role.name}`)
		}))
		this.client.on("messageReactionRemove", this.handleReaction(async (reaction, user) => {
			const result = await this.findMemberAndRoleFromReaction(reaction, user)
			if (result == undefined) return
			const [member, role] = result
			member.roles.remove(role)
			member.send(`Je t’ai enlevé le rôle @${role.name}`)
		}))
	}
}
