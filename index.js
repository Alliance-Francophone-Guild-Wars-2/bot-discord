#!/usr/bin/env node
const dotenv = {}
if ((env = process.env.ENV) != undefined) dotenv["path"] = `.env.${env}`
require('dotenv').config(dotenv)

const Discord = require("discord.js")
const client = new Discord.Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"] })

const path = require('path')
const fs = require('fs')
const pluginsDir = path.join(__dirname, "plugins")
const pluginsFiles = fs.readdirSync(pluginsDir)
const plugins = pluginsFiles.map((pluginFile) => {
	const clazz = require(path.join(pluginsDir, pluginFile))
	return new clazz(client)
})
client.login(process.env.TOKEN)
client.once("ready", async () => { console.log("Bot ready!") })
