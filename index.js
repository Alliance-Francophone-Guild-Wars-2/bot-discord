#!/usr/bin/env node
const dotenv = {}
if ((env = process.env.ENV) != undefined) dotenv["path"] = `.env.${env}`
require('dotenv').config(dotenv)

const {Client, Intents} = require("discord.js")
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
  partials: ["MESSAGE", "CHANNEL", "REACTION"]
})

const path = require('path')
const fs = require('fs')
const pluginsDir = path.join(__dirname, "plugins")
const pluginsFiles = fs.readdirSync(pluginsDir)
const plugins = pluginsFiles.map((pluginFile) => {
	const clazz = require(path.join(pluginsDir, pluginFile))
	return new clazz(client)
})
client.login(process.env.TOKEN)
client.once("ready", async () => {
  console.log("Bot ready!")
})
