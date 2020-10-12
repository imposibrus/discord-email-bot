const { ImapFlow } = require('imapflow');
const Discord  = require('discord.js');
const config = require('./config.json');

const DISCORD_TEXT_LIMIT = 2048;
const EMAIL_CHECK_INTERVAL = 1000 * 60;

const bot = new Discord.Client();
bot.login(config.token);

const botReady = new Promise((resolve) => {
    bot.on('ready', () => {
        console.log(`Logged in as ${bot.user.tag}!`);
        resolve();
    });
});

const main = async () => {
    const client = new ImapFlow({
        host: config.host,
        port: config.port,
        secure: config.tls,
        auth: {
            user: config.user,
            pass: config.password,
        }
    });
    // Wait until client connects and authorizes
    await client.connect();
    await botReady;
    const channel = bot.channels.cache.get(config.channel);

    // Select and lock a mailbox. Throws if mailbox does not exist
    let lock = await client.getMailboxLock('INBOX');

    try {
        // fetch latest message source
        let list = await client.search({seen: false});

        for (const seq of list) {
            const messageRange = `${seq}:${seq}`;
            const message = await client.fetchOne(messageRange, {
                envelope: true,
                source: true,
                bodyParts: true,
                headers: true,
                labels: true,
                threadId: true,
                size: true,
                internalDate: true,
                bodyStructure: true,
                flags: true,
                uid: true,
            });
            // console.log(`${message.uid}: ${message.envelope.subject}`);
            // console.log('message', inspect(message, false, 8));

            const exampleEmbed = new Discord.MessageEmbed()
                .setColor('#0099ff')
            ;
            exampleEmbed.setTitle(truncateString(message.envelope.subject));
            exampleEmbed.setAuthor(truncateString(message.envelope.from[0].address));
            exampleEmbed.setTimestamp(new Date(message.envelope.date));

            const textBodyPart = message.bodyStructure.childNodes.find(cn => cn.type === 'text/plain');
            if (textBodyPart && textBodyPart.size < DISCORD_TEXT_LIMIT) {
                const messageText = await downloadMessageContent(client, messageRange, textBodyPart.part);
                exampleEmbed.setDescription(messageText);
            } else {
                exampleEmbed.setDescription('Текст сообщения слишком велик(');
            }

            await channel.send(exampleEmbed);

            const res = await client.messageFlagsAdd(messageRange, ['\\Seen']);
            if (!res) {
                throw new Error('error mark as seen');
            }
        }
    } finally {
        lock.release();
        await client.logout();
        await client.close();
    }
};


setInterval(() => {
    main().catch(catchMain);
}, EMAIL_CHECK_INTERVAL);
main().catch(catchMain);


function catchMain(err) {
    console.error(err);
    process.exit(-1);
}

function truncateString(str, len = 256) {
    const regexp = new RegExp(`^(.{${len - 2}).{2,}`);
    return str.replace(regexp, '$1…');
}

async function downloadMessageContent(client, messageRange, part) {
    return new Promise(async (resolve, reject) => {
        const {content} = await client.download(messageRange, part);
        if (!content) {
            return reject('content not found in email body');
        }
        let messageText = '';
        content.on('data', (chunk) => {
            messageText += chunk.toString();
        });
        content.on('end', () => {
            resolve(messageText);
        });
    });
}
