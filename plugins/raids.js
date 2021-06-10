const fs = require('fs')
const Discord = require("discord.js")
const Emojis = require("../emojis.js")
const Plugin = require("../plugin.js")

const CSV = require('csv-writer').createArrayCsvStringifier
const Readable = require('stream').Readable

module.exports = class Raids extends Plugin {
	CHANNEL_NAME = (date) => `sortie-${date.getDate().toString().padStart(2, "0")}-${(date.getMonth()+1).toString().padStart(2, "0")}`
	CHANNEL_PATTERN = /^sortie-\d{2}-\d{2}$/
 	ROLES = new Map([
		["ranger_druid", "Druide"],
		["guardian_firebrand", "HFB"],
		["revenant_renegade", "Alac"],
		["mesmer_chronomancer", "Quick"],
		["warrior_berserker", "BS"],
		["Protection", "Tank"],
		["guardian_dragonhunter_", "pDPS"],
		["ele_tempest", "cDPS"],
		["commander_blue", "Com"]
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

	split_in_fields(texts) {
		const fields = []
		let current = ""
		for(let text of texts) {
			const old = current
			if (current.length > 0) current = current.concat("\n")
			current = current.concat(text)
			if (current.length > 1024) {
				fields.push(old)
				current = text
			}
		}
		if (current.length > 0) fields.push(current)
		return fields
	}

	async update_registrations(message) {
		const guild = message.guild
		let registrations = await this.calculate_registrations(message)
		registrations = Array.from(registrations)
			.map(([name, roles]) => `${name} ${roles.map(r => Emojis.emoji(guild, r)).join("")}`)
			.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
		const embed = new Discord.MessageEmbed(message.embeds[0])
		embed.fields = []
		const size = registrations.length
		if (size > 0) {
			const fields = this.split_in_fields(registrations)
			let first = true
			for (const field of fields) {
				embed.addField(first ? `${size} inscrits` : "\u200b", field)
				first = false
			}
		}
		message.edit(embed)
	}

	async create_new_raid(message, date) {
	 	date = new Date(date)
		if (isNaN(date)) return
		message.delete()
		const source_channel = message.channel
		const category = source_channel.parent
		const position = source_channel.position + 1
		const channel_name = this.CHANNEL_NAME(date)
		const guild = message.guild

		const channels = category.children
		const channel = channels.find(c => c.name == channel_name)
		// const channel = await guild.channels.create(channel_name,
		// 	{ type: "text", parent: category, position: position })

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
	}

	async export_registrations(message, url) {
		// https://discord.com/channels/469838481770938368/847105085921820682/847105153613037569
		url = new URL(url)
		const path = url.pathname
		let [_1, _2, guildId, channelId, messageId] = path.split("/")
		const channel = await this.client.channels.fetch(channelId)
		const raid_message = await channel.messages.fetch(messageId)
		const registrations = await this.calculate_registrations(raid_message)
		const headers = ['', ...this.ROLES.values()]
		const csv = CSV({header: headers})
		const records = []
		for (const [name, roles] of registrations) {
			const record = [name]
			for (const emote of this.ROLES.keys()) {
				record.push(roles.includes(emote) ? "X" : "")
			}
			records.push(record)
		}
		const text = csv.getHeaderString() + csv.stringifyRecords(records)
		const attachment = new Discord.MessageAttachment(Readable.from(text), "registrations.csv")
		const embed = new Discord.MessageEmbed()
			.setTitle("Inscriptions")
			.setDescription(text)
			.attachFiles([attachment])
		message.channel.send(embed)
	}

	constructor(client) {
		super(client)

	 	let message = fs.readFileSync("./assets/messages/raid.md", "UTF-8")
		this.MESSAGE = message

		this.client.on("message", async message => {
			if (message.author.bot) return
			const content = message.content
			const [command, ...args] = content.trim().split(/\s+/)
			switch (command) {
				case "!!raid":
					this.create_new_raid(message, ...args)
					break;
				case "!!registrations":
					this.export_registrations(message, ...args)
					break;
			}
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
