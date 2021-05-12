module.exports = class Plugin {
    constructor(client) {
		this.client = client
	}

	handleReaction(fn) {
		return async (reaction, user) => {
			try {
				if (reaction.partial) await reaction.fetch()
				if (reaction.me || user.bot) return
				const message = reaction.message
				if (message.partial) await message.fetch()
				fn(reaction, user)
			} catch (error) {
				console.error(error)
			}
		}
	}
}
