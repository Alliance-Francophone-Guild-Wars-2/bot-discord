module.exports = class Emojis {
    static GUILDS = new Map()

    static emojis(guild) {
        const id = guild.id
        let emojis = Emojis.GUILDS.get(id)
        if (emojis != undefined) return emojis
        emojis = new Map(guild.emojis.cache.map((e) => [e.name, e]))
        Emojis.GUILDS.set(id, emojis)
        return emojis
    }

    static process(guild, text) {
        const emojies = Emojis.emojis(guild)
        for(const [n, e] of emojies) {
            text = text.replace(new RegExp(`:${n}:`, "g"), e)
        }
        return text
    }

    static emoji(guild, name) {
        const emojis = Emojis.emojis(guild)
        return emojis.get(name)
    }
}
