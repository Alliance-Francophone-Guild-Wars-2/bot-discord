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
const plugins = pluginsFiles.map((pluginFile) => require(path.join(pluginsDir, pluginFile))(client))

plugins.forEach(plugin => {
	if ((once = plugin.once) != undefined)  {
		once.bind(plugin)().forEach((fn, e) => client.once(e, fn))
	}
	if ((on = plugin.on) != undefined) {
		on.bind(plugin)().forEach((fn, e) => client.on(e, fn))
	}
})
client.login(process.env.TOKEN)
