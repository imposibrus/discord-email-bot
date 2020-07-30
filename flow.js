const {inspect} = require('util');
const { ImapFlow } = require('imapflow');
const config = require('./config.json');
const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.tls,
    auth: {
        user: config.user,
        pass: config.password,
    }
});

const main = async () => {
    // Wait until client connects and authorizes
    await client.connect();

    // Select and lock a mailbox. Throws if mailbox does not exist
    // let lock = await client.getMailboxLock('INBOX');
    let mailbox = await client.mailboxOpen('INBOX');
    try {
        // fetch latest message source
        // let message = await client.fetchOne('*', { source: true });
        // console.log(message.source.toString());

        // list subjects for all messages
        // uid value is always included in FETCH response, envelope strings are in unicode.
        for await (let message of client.fetch({seen: false}, {
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
        })) {
            console.log(`${message.uid}: ${message.envelope.subject}`);
            console.log('message', inspect(message, false, 8));
            // console.log('source', message.source.toString());
            const res = await client.messageFlagsAdd({uid: message.uid}, ['\\Seen']);
            console.log('res', res);
            if (!res) {
                throw new Error('error mark as seen');
            }
        }
    } finally {
        // Make sure lock is released, otherwise next `getMailboxLock()` never returns
        // lock.release();
    }

    // log out and close connection
    await client.logout();
};

main().catch(err => console.error(err));
