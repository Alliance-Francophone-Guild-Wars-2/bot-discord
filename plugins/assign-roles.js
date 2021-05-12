class AssignRole {
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

	findMemberAndRoleFromReaction = async (reaction, user) => {
		const message = reaction.message
		const roles = this.ROLES.get(message.id)
		if (roles == undefined) return Promise.reject()

		const emoji = reaction._emoji.name
		const reaction_role = roles.get(emoji)
		if (reaction_role == undefined) return Promise.reject()

		const guild = message.guild
		const discord_role = guild.roles.cache.find(r => r.name === reaction_role)
		if (discord_role == undefined) return Promise.reject()
		const member = await guild.members.fetch(user.id)
		if (member == undefined) return Promise.reject()

		return Promise.resolve([member, discord_role])
	}

	constructor(client) { this.client = client }

	handleReaction = (fn) => async (reaction, user) => {
		try {
			if (reaction.partial) {
				await reaction.fetch()
			}
			if (reaction.me || user.bot) return
			fn(reaction, user)
		} catch (error) {
			console.error(error)
		}
	}

	once() {
		return new Map([
			["ready", async () => {
				const guild = await this.client.guilds.fetch(this.GUILD_ID)
				const channel = await guild.channels.cache.find(c => c.name === this.ROLES_CHANNEL_NAME)
				if (channel == undefined) return

				for (const [message_id, roles] of this.ROLES.entries()) {
					const message = await channel.messages.fetch(message_id)
					for(const reaction of roles.keys()) {
						const emoji = guild.emojis.cache.find(e => e.name === reaction)
						if (emoji == undefined) continue
						message.react(emoji)
					}
				}
			}]
		])
	}

	on() {
		return new Map([
			["messageReactionAdd", this.handleReaction(async (reaction, user) => {
					this.findMemberAndRoleFromReaction(reaction, user)
						.then(([member, role]) => {
							member.roles.add(role)
							member.send(`Je t’ai ajouté le rôle @${role.name}`)
						})
			})],
			["messageReactionRemove", this.handleReaction(async (reaction, user) => {
					this.findMemberAndRoleFromReaction(reaction, user)
						.then(([member, role]) => {
							member.roles.remove(role)
							member.send(`Je t’ai enlevé le rôle @${role.name}`)
						})
			})]
		])
	}
}

module.exports = (client) => new AssignRole(client)
