# Discord Email Bot
Send emails to a discord channel. 

## Prerequisites

Create `config.json` from template and fill it with your credentials:
```bash
cp config.example.json config.json
```

## Note
Always run with Node.js flag `--unhandled-rejections=strict`:
```bash
node --unhandled-rejections=strict index.js
```

### config.json
The bot uses a json file to store configuration information. Below are their configurable paramenters:

| parameter   |      descreption                    |  type   |
|-------------|:------------------------------------|:--------|
| user        | The email address to get email from | string  |
| password    | The password of that email          | string  |
| host        | The imap host for the email service (i.e. 'imap.gmail.com') | string |
| port        | Mail port of the host               | Number  |
| tls         | If a TLS connection should be used  | Boolean |
| token       | The discord bot token               | Boolean |
| channel     | The id for the channel to send to    | string  |
