#!/usr/bin/env node
const dotenv = {}
if ((env = process.env.ENV) != undefined) dotenv["path"] = `.env.${env}`
require('dotenv').config(dotenv)

const {Client, GatewayIntentBits, Partials, Events} = require("discord.js")
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
})

const path = require('path')
const fs = require('fs')
const pluginsDir = path.join(__dirname, "plugins")
const pluginsFiles = fs.readdirSync(pluginsDir)
const plugins = pluginsFiles.map((pluginFile) => {
  if (!pluginFile.endsWith(".js")) {
    return
  }
  const clazz = require(path.join(pluginsDir, pluginFile))
  return new clazz(client)
})
client.login(process.env.TOKEN)
client.once(Events.ClientReady, async () => {
  console.log("Bot ready!")
})
