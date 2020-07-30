const Discord  = require('discord.js');
const Imap     = require('imap');
// const inspect  = require('util').inspect;
const fs       = require('fs');
// const MailParser = require("mailparser").MailParser;

const EMAIL_CHECK_INTERVAL = 1000 * 10;
// const IMAP_LINE_SEPARATOR = '\r\n';
// const IMAP_HEADERS_SEPARATOR = IMAP_LINE_SEPARATOR.repeat(2);
const config = require('./config.json');
const imap = new Imap({
    user: config.user,
    password: config.password,
    host: config.host,
    port: config.port,
    tls: config.tls
});

const bot = new Discord.Client();
bot.login(config.token);

const botReady = new Promise((resolve) => {
    bot.on('ready', () => {
        console.log(`Logged in as ${bot.user.tag}!`);
        resolve();
    });
});

function openInbox(callback) {
    imap.openBox('INBOX', false, callback);
}
  
// Send the newest message to discord
function sendNewest() {
    openInbox(function(err, box) {
        if (err) throw err;

        imap.search([ 'UNSEEN' ], function(err, results) {
            if (err) throw err;

            if (!results.length) {
                imap.end();
                return;
            }

            const f = imap.fetch(results, {
                bodies: [''],
                struct: true,
            })

            f.on('message', (message, index) => {
                // const prefix = '(#' + index + ') ';
                const exampleEmbed = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                ;
                const attrsDefer = new Deferred();

                message.on('body', (stream, info) => {
                    // console.log('info', info);
                    let buffer = '', count = 0;

                    stream.on('data', function(chunk) {
                        count += chunk.length;
                        buffer += chunk.toString('utf8');
                        // console.log(prefix + 'Body [%s] (%d/%d)', inspect(info.which), count, info.size);
                    });

                    stream.on('end', async () => {
                        await botReady;
                        const channel = bot.channels.cache.get(config.channel); // announcments channel
                        const header = Imap.parseHeader(buffer);
                        exampleEmbed.setTitle(truncateString(header.subject[0]));
                        exampleEmbed.setAuthor(truncateString(header.from[0]));
                        exampleEmbed.setTimestamp(new Date(header.date[0]));
                        // console.log('channel', channel);
                        // console.log('buffer', buffer);
                        // const messageBody = buffer.split(IMAP_HEADERS_SEPARATOR).filter(String).pop();
                        // // console.log('messageBody', messageBody);
                        // const messageText = Buffer.from(messageBody, 'base64').toString('utf-8');
                        // console.log('buffer decoded', messageText);
                        // if (messageText.length < 2048) {
                        //     exampleEmbed.setDescription(messageText);
                        // } else {
                        //     exampleEmbed.setDescription('Текст сообщения слишком велик(');
                        // }
                        channel.send(exampleEmbed);
                        // console.log(prefix + 'Body [%s] Finished', inspect(info.which));
                        // console.log(prefix + 'Parsed header: %s', inspect(header));

                        attrsDefer.promise.then((attrs) => {
                            imap.setFlags(attrs.uid, ['\\Seen'], function(err) {
                                if (err) {
                                    throw err;
                                }
                            });
                        });
                    });
                });
                message.on('attributes', function(attrs) {
                    // console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
                    attrsDefer.resolve(attrs);
                });
                message.on('end', function() {
                    // console.log(prefix + 'Finished');
                });
            });

            f.on('error', function(err) {
                console.log('Fetch error: ' + err);
            });
            f.on('end', function() {
                // console.log('Done fetching all messages!');
                imap.end();
            });
        });
    });
}

imap.on('ready', function() {
    sendNewest();
});
imap.on('end', function() {
    // console.log('Connection ended');
});

setInterval(() => {
    imap.connect();
}, EMAIL_CHECK_INTERVAL);

imap.connect();

function truncateString(str, len = 256) {
    const regexp = new RegExp(`^(.{${len - 2}).{2,}`);
    return str.replace(regexp, '$1…');
}


function Deferred() {
    this.resolve = null;
    this.reject = null;
    this.promise = new Promise(function(resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;
    }.bind(this));
    Object.freeze(this);
}
