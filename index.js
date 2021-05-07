#!/usr/bin/env node
const dotenv = {}
if ((env = process.env.ENV) != undefined) {
	dotenv["path"] = `.env.${env}`
}
require('dotenv').config(dotenv)

const Discord = require("discord.js");
const client = new Discord.Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"] });

const GUILD_ID = process.env.GUILD_ID
const ROLES_CHANNEL_NAME = "assignation-de-role"
const ROLES = new Map([
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

const findMemberAndRoleFromReaction = async (reaction, user) => {
	const message = reaction.message
	const roles = ROLES.get(message.id)
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

const handleReaction = (fn) => async (reaction, user) => {
	if (reaction.partial) {
		try {
			await reaction.fetch()
		} catch (error) {
			console.error("Something went wrong when fetching the message: ", error)
			return
		}
	}
	if (reaction.me || user.bot) return
	fn(reaction, user)
}

client.once("ready", async () => {
	try {
		const guild = await client.guilds.fetch(GUILD_ID)
		const channel = await guild.channels.cache.find(c => c.name === ROLES_CHANNEL_NAME)
		if (channel == undefined) return

		for (const [message_id, roles] of ROLES.entries()) {
			const message = await channel.messages.fetch(message_id)
			for(const reaction of roles.keys()) {
				const emoji = guild.emojis.cache.find(e => e.name === reaction)
				if (emoji == undefined) continue
				message.react(emoji)
			}
		}
	} catch (e) {
		console.error(e)
	}

	console.info("Ready!")
})

client.on("messageReactionAdd", handleReaction(async (reaction, user) => {
	try {
		findMemberAndRoleFromReaction(reaction, user)
			.then(([member, role]) => member.roles.add(role))
	} catch (e) {
		console.error(e)
	}
}))
client.on("messageReactionRemove", handleReaction(async (reaction, user) => {
	try {
		findMemberAndRoleFromReaction(reaction, user)
			.then(([member, role]) => member.roles.remove(role))
	} catch (e) {
		console.error(e)
	}
}))

client.login(process.env.TOKEN)
