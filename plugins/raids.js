const fs = require('fs')
const Discord = require("discord.js")
const Emojis = require("../emojis.js")
const Plugin = require("../plugin.js")
module.exports = class Raids extends Plugin {
	COMMAND = '!!raid'
	CHANNEL_NAME = (date) => `sortie-${date.getDate().toString().padStart(2, "0")}-${(date.getMonth()+1).toString().padStart(2, "0")}`
	CHANNEL_PATTERN = /^sortie-\d{2}-\d{2}$/
 	ROLES = new Map([
		["ranger_druid", "Druide"],
		["guardian_firebrand", "HFB"],
		["revenant", "Alacren"],
		["mesmer_chrono", "Quickness"],
		["warrior_berserker", "Bannerslave"],
		["Protection", "Tank"],
		["guardian_dragonhunter_", "pDPS"],
		["elet_tempest", "cDPS"]
	])
	UNREGISTER = "❌"

	handleReaction(fn) {
		return super.handleReaction(async (reaction, user) => {
			const message = reaction.message
			const channel = reaction.message.channel
			if (!channel.name.match(this.CHANNEL_PATTERN)) return
			const author = message.author
			if (author.id != this.client.user.id) return
			fn(reaction, user)
		})
	}

	async remove_reactions(message, from) {
		const id = from.id
		const reactions = message.reactions.cache
		for (const reaction of reactions.values()) {
			await reaction.users.remove(id)
		}
	}

	async calculate_registrations(message) {
		const reactions = message.reactions.cache
		const registrations = new Map()
		for (const reaction of reactions.values()) {
			const users = await reaction.users.fetch()
			for (const user of users.values()) {
				if (user.id == this.client.user.id) continue
				const name = user.username
				let roles = registrations.get(name)
				if (roles == undefined) {
					roles = []
					registrations.set(name, roles)
				}
				roles.push(reaction.emoji.name)
			}
		}
		return registrations
	}

	async update_registrations(message) {
		const guild = message.guild
		let registrations = await this.calculate_registrations(message)
		registrations = Array.from(registrations)
			.map(([name, roles]) => `${name} ${roles.map(r => Emojis.emoji(guild, r)).join("")}`)
			.join("\n")
		const embed = new Discord.MessageEmbed(message.embeds[0])
		embed.fields = []
		if (registrations != "") embed.addField('Inscrits', registrations)
		message.edit(embed)
	}

	constructor(client) {
		super(client)

	 	let message = fs.readFileSync("./assets/messages/raid.md", "UTF-8")
		this.MESSAGE = message

		this.client.on("message", async message => {
			if (message.author.bot) return
			const content = message.content
			const [command, ...args] = content.trim().split(/\s+/)
			if (command != this.COMMAND) return

			const date = new Date(args[0])
			if (isNaN(date)) return
			message.delete()
			const source_channel = message.channel
			const category = source_channel.parent
			const position = source_channel.position + 1
			const channel_name = this.CHANNEL_NAME(date)
			const guild = message.guild

			const channel = await guild.channels.create(channel_name,
				{ type: "text", parent: category, position: position })

			let text = Emojis.process(guild, this.MESSAGE)
			text = new Discord.MessageEmbed()
				.setTitle(`Sorti du ${date.toLocaleDateString()}`)
				.setDescription(text)
			const registrations = await channel.send(text)
			for (const role of this.ROLES.keys()) {
				const emoji = Emojis.emoji(guild, role)
				if (emoji == undefined) continue
				await registrations.react(emoji)
			}
			await registrations.react(this.UNREGISTER)
		})
		this.client.on("messageReactionAdd", this.handleReaction(async (reaction, user) => {
			const message = reaction.message
			if (reaction.emoji.name == this.UNREGISTER) await this.remove_reactions(message, user)
			await this.update_registrations(message)
		}))
		this.client.on("messageReactionRemove", this.handleReaction(async (reaction, user) => {
			const message = reaction.message
			await this.update_registrations(message)
		}))
	}
}
