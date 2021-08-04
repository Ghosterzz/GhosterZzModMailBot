const BaseEvent = require("../../utils/structures/BaseEvent");
const openedTickets = new Map();
const MODMAILCHANNEL = "871508279698808943";
const Discord = require("discord.js");
const REJECT = "⛔";
const ACCEPT = "✅";
module.exports = class DirectMessageEvent extends BaseEvent {
  constructor() {
    super("directMessage");
  }

  async run(client, message, args) {
    if (!openedTickets.has(message.author.id)) {
      const ThreadConfirmCreateEmbed = new Discord.MessageEmbed()
        .setTitle("Confirm thread creation")
        .setDescription(
          "React to confirm thread creation which will directly contact the moderators"
        )
        .setColor("#7289DA");

      const ThreadCreatedEmbed = new Discord.MessageEmbed()
        .setTitle("Thread Created")
        .setDescription(
          "The staff team will get back to you as soon as possible."
        )
        .setColor("#2ECC70");

      const reactionMessage = await message.channel.send(
        ThreadConfirmCreateEmbed
      );

      await reactionMessage.react(ACCEPT);
      await reactionMessage.react(REJECT);
      try {
        const ReactionFilter = (reaction, user) =>
          [ACCEPT, REJECT].includes(reaction.emoji.name) && !user.bot;
        const Reactions = await reactionMessage.awaitReactions(ReactionFilter, {
          max: 1,
        });
        const choice = Reactions.get(ACCEPT) || Reactions.get(REJECT);
        if (choice.emoji.name === ACCEPT) {
          reactionMessage.delete();
          message.channel.send(ThreadCreatedEmbed);
          openedTickets.set(message.author.id, message.guild);
          const channel = client.channels.cache.get(MODMAILCHANNEL);
          if (channel) {
            const ThreadFromUser = new Discord.MessageEmbed()
              .setTitle("New Mod Mail Thread")
              .setAuthor(message.author.tag, message.author.displayAvatarURL())
              .setDescription(message.content)
              .setColor("BLUE");
            if (message.attachments) {
              const files = getImageLinks(message.attachments);
              if (files[0] !== undefined) {
                ThreadFromUser.setImage(files[0]);
              }
            } else return;
            const msg = await channel.send(ThreadFromUser);
            await msg.react(ACCEPT);
            await msg.react(REJECT);
            try {
              const reactionFilter = (reaction, user) =>
                [ACCEPT, REJECT].includes(reaction.emoji.name) && !user.bot;
              const reactions = await msg.awaitReactions(reactionFilter, {
                max: 1,
                time: 600000,
                errors: ["time"],
              });
              const choice = reactions.get(ACCEPT) || reactions.get(REJECT);
              if (choice.emoji.name === ACCEPT) {
                message.author.send("Your Mod Mail reqeust was accepted");
                await handleCollectors(channel, message);
              } else if (choice.emoji.name === REJECT) {
                message.author.send(
                  "Your message was rejected. You may try again later"
                );
              }
            } catch (error) {
              console.log(error);
              message.author.send(
                "No one was available to accept your mod mail thread. Please try again"
              );
              openedTickets.delete(message.author.id);
            }
          } else {
            message.channel.send("Somthing went wrong");
          }
          openedTickets.set(message.author.id, message.guild);
        } else if (choice.emoji.name === REJECT) {
          openedTickets.delete(message.author.id);
        }
      } catch (error) {
        openedTickets.delete(message.author.id);
        console.log(error);
      }
    }
  }
};
function handleCollectors(channel, message) {
  const filter = (m) => m.author.id === message.author.id;
  const dmCollector = message.channel.createMessageCollector(filter);

  const guildCollectorFilter = (m) =>
    m.channel.id === channel.id && !m.author.bot;
  const guildChannelCollector =
    channel.createMessageCollector(guildCollectorFilter);

  return new Promise((resolve, reject) => {
    dmCollector.on("collect", (m) => {
      const MessageFromUser = new Discord.MessageEmbed()
        .setTitle("A Message From User")
        .setAuthor(m.author.tag, m.author.displayAvatarURL())
        .setDescription(m.content)
        .setColor("BLUE");
      if (m.attachments) {
        const files = getImageLinks(m.attachments);
        if (files[0] !== undefined) {
          MessageFromUser.setImage(files[0]);
        }
      }
      channel.send(MessageFromUser);
    });
    guildChannelCollector.on("collect", (m) => {
      if (m.content.toLowerCase() === "--stop") {
        const closedEmbed = new Discord.MessageEmbed()
        .setTitle("Thread Closed")
        .setAuthor(m.author.tag, m.author.displayAvatarURL())
        .setColor("RED");
          m.author.send(closedEmbed)
        guildChannelCollector.stop();
        dmCollector.stop();
        resolve();
      } else {

        const MessageFromMod = new Discord.MessageEmbed()
          .setTitle("A Message From Moderaters")
          .setAuthor(m.author.tag, m.author.displayAvatarURL())
          .setDescription(m.content)
          .setColor("RED");

        if (m.attachments) {
          const files = getImageLinks(m.attachments);
          if (files[0] !== undefined) {
            MessageFromMod.setImage(files[0]);
          }
        }
        message.author.send(MessageFromMod);
      }
    });
  });
}
function getImageLinks(attachments) {
  const valid = /^.*(gif|png|jpg|jpeg)$/g;
  return attachments
    .array()
    .filter((attachment) => valid.test(attachment.url))
    .map((attachment) => attachment.url);
}
