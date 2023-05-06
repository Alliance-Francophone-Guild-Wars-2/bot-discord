const fs = require('fs')
const {Discord, Events, ChannelType, EmbedBuilder} = require("discord.js")
const Emojis = require("../emojis.js")
const Plugin = require("../plugin.js")

const CSV = require('csv-writer').createArrayCsvStringifier
const Readable = require('stream').Readable

module.exports = class Raids extends Plugin {
  CHANNEL_NAME = (date) => `sortie-${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}`
  CHANNEL_PATTERN = /^sortie-\d{2}-\d{2}$/
  ROLES = new Map([
    ["ranger_druid", "Druide"],
    ["guardian_firebrand", "HFB"],
    ["Alacrity", "Alac"],
    ["Quickness", "Quick"],
    ["warrior_berserker", "BS"],
    ["Protection", "Tank"],
    ["Might", "pDPS"],
    ["burning", "cDPS"],
    ["commander_blue", "Com"]
  ])
  LEVELS = new Map([["1️⃣", "1"], ["2️⃣", 2], ["3️⃣", 3]])
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
    const guild = message.guild
    const reactions = message.reactions.cache
    const registrations = new Map()
    for (const reaction of reactions.values()) {
      const users = await reaction.users.fetch()
      for (const user of users.values()) {
        if (user.id == this.client.user.id) continue

        let member = guild.members.resolve(user)
        const name = member.displayName || user.username

        let registration = registrations.get(name)
        if (registration == undefined) {
          registration = [[], undefined]
          registrations.set(name, registration)
        }

        const emoji = reaction.emoji
        const n = emoji.name
        const level = this.LEVELS.get(n)
        if (level) registration[1] = emoji
        const role = this.ROLES.get(n)
        if (role) registration[0].push(emoji)
      }
    }
    return registrations
  }

  split_in_fields(texts) {
    const fields = []
    let current = ""
    for (let text of texts) {
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
    let registrations = await this.calculate_registrations(message)
    registrations = Array.from(registrations)
      .map(([name, registration]) => {
        let [roles, level] = registration
        if (level == undefined) {
          level = ''
        } else {
          level = ` ${level}`
        }
        if (roles.length == 0) {
          roles = ''
        } else {
          roles = ` ${roles.join("")}`
        }
        return `${name}${level}${roles}`
      })
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    const embed = new EmbedBuilder(message.embeds[0])
    const size = registrations.length
    let result = []
    if (size > 0) {
      const fields = this.split_in_fields(registrations)
      let first = true
      for (const field of fields) {
        result.push({
          name: first ? `${size} inscrits` : "\u200b",
          value: field
        })
        first = false
      }
    }
    embed.setFields(result)
    message.edit({embeds: [embed]})
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
    // const channel = channels.find(c => c.name == channel_name)
    const channel = await guild.channels.create({
      name: channel_name,
      type: ChannelType.GuildText,
      parent: category,
      position: position,
    })

    let text = Emojis.process(guild, this.MESSAGE)
    text = new EmbedBuilder()
      .setTitle(`Sorti du ${date.toLocaleDateString()}`)
      .setDescription(text)
    const registrations = await channel.send({embeds: [text]})
    for (const role of this.ROLES.keys()) {
      const emoji = Emojis.emoji(guild, role)
      if (emoji == undefined) continue
      await registrations.react(emoji)
    }
    for (const level of this.LEVELS.keys()) {
      await registrations.react(level)
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
    const headers = ["name", "level", ...this.ROLES.values()]
    const csv = CSV({header: headers})
    const records = []
    for (const [name, registration] of registrations) {
      const record = [name]
      const [roles, level] = registration
      record.push(level == undefined ? "" : level.name)
      for (const emote of this.ROLES.keys()) {
        record.push(roles.map(r => r.name).includes(emote) ? "X" : "")
      }
      records.push(record)
    }
    const text = csv.getHeaderString() + csv.stringifyRecords(records)
    const attachment = new Discord.MessageAttachment(Readable.from(text), "registrations.csv")
    const embed = new Discord.MessageEmbed()
      .setTitle("Inscriptions")
      .setDescription(text)
    message.channel.send({embeds: [embed], files: [attachment]})
  }

  constructor(client) {
    super(client)

    let message = fs.readFileSync("./assets/messages/raid.md", "UTF-8")
    this.MESSAGE = message

    this.client.on(Events.MessageCreate, async message => {
      if (message.author.bot) return
      const content = message.content
      const [command, ...args] = content.trim().split(/\s+/)
      switch (command) {
        case "!!raid":
          await this.create_new_raid(message, ...args)
          break;
        case "!!registrations":
          await this.export_registrations(message, ...args)
          break;
      }
    })
    this.client.on(Events.MessageReactionAdd, this.handleReaction(async (reaction, user) => {
      const message = reaction.message
      if (reaction.emoji.name == this.UNREGISTER) await this.remove_reactions(message, user)
      await this.update_registrations(message)
    }))
    this.client.on(Events.MessageReactionRemove, this.handleReaction(async (reaction, user) => {
      const message = reaction.message
      await this.update_registrations(message)
    }))
  }
}
