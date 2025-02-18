// @Bot Version 1
// Procedurally coded bot in a true scripting format with a basic permission-based rank system for command authority
//

/*
1)
    Check `ls`
    Should NOT see `Desktop`, `Documents`, `Downloads`, etc
    If you DO see these folders
        1.5) Use `cd Desktop`
 
2)
    Use `nano bot.js` to create the file
    Input the required source code
    Then exit and save the file following the prompts at the bottom of the terminal
 
3)
    Install the required modules:
        `npm install discord.js`
        `npm install express`
        `npm install mysql`
        `npm install dotenv`
        `npm install pm2`
    
4)
    Run the bot
    `pm2 start bot.js`
    
5)
    Monitor for errors
    `pm2 monit`
*/
require('dotenv').config();

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const mysql = require('mysql');

const TOKEN = process.env.TOKEN;

const PORT = process.env.PORT;

const MYSQL_USERNAME = process.env.MYSQL_USERNAME;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;

const Galaxy = {
    "Roles": {
        "Root": {
            "Rank": 3,
            "Permissions": [
                { "type": "other", "value": "OWNER" },
                { "type": "other", "value": "CREATOR" }
            ],
        },

        "Administrator": {
            "Rank": 2,
            "Permissions": [
                { "type": "permission", "value": PermissionsBitField.Flags.Administrator }
            ],
        },

        "Moderator": {
            "Rank": 1,
            "Permissions": [
                { "type": "permission", "value": PermissionsBitField.Flags.KickMembers },
                { "type": "permission", "value": PermissionsBitField.Flags.BanMembers }
            ]
        },

        "User": {
            "Rank": 0,
            "Permissions": [
                { "type": "permission", "value": PermissionsBitField.Flags.SendMessages }
            ]
        }
    },

    "Settings": {
        "Prefix": ";",
        "CommandErrors": {
            "NotifyRankExceeds": true, //Notify the speaker if their rank is exceeded by command's requirement
            "NotifyGeneralError": true, //Notify the speaker of command execution errors 
            "NotifyParsedError": true //Notify the speaker of passed errors thrown by Error("Galaxy: error message here")
        }
    },

    "Commands": {},
}

function createCommand(name, rank, list, description, callback) {
    Galaxy.Commands[name] = { rank, list, description, callback }
};

function writeErrorMessage(message, channel, member) {
    return channel.send({
        content: `<\x40${member.id}>, `,
        embeds: [
            {
                title: "Error",
                description: message,
                color: 0xFF0000,
                footer: {

                }
            }
        ]
    });
};

function onChatted(message) {
    var guild = message.guild,
        author = message.author,
        member = message.member,
        channel = message.channel;

    if (!message.content.startsWith(Galaxy.Settings.Prefix) || author.bot)
        return;

    var content = message.content.substring(Galaxy.Settings.Prefix.length);
    var match = content.match(/(\S+)\s*(.*)/);
    var role = getRole(member, guild);

    for (var name in Galaxy.Commands) {
        let command = Galaxy.Commands[name];

        for (var i in command.list) {
            let identifier = command.list[i];

            if (match[1].toLowerCase() == identifier.toLowerCase()) {
                if (role.rank < command.rank) {
                    if (Galaxy.Settings.CommandErrors.NotifyRankExceeds)
                        writeErrorMessage("You do not have the required rank for this command!", channel, member);

                    return;
                };

                try {
                    let rtn = command.callback(match[2], member, channel, guild, message);
                    if (rtn instanceof Promise) {
                        rtn.catch(error => {
                            let errorString = error.toString();
                            if (errorString.startsWith("[Galaxy]: ")) {
                                if (Galaxy.Settings.CommandErrors.NotifyParsedError)
                                    writeErrorMessage(errorString, channel, member);
                            } else if (Galaxy.Settings.CommandErrors.NotifyGeneralError)
                                writeErrorMessage(errorString, channel, member);
                        });
                    };
                } catch (error) {
                    let errorString = error.toString();
                    if (errorString.startsWith("[Galaxy]: ")) {
                        if (Galaxy.Settings.CommandErrors.NotifyParsedError)
                            writeErrorMessage(errorString, channel, member);
                    } else if (Galaxy.Settings.CommandErrors.NotifyGeneralError)
                        writeErrorMessage(errorString, channel, member);
                };
            };
        };
    };
};

function getRole(user, guild) {
    for (var name in Galaxy.Roles) {
        let role = Galaxy.Roles[name];
        for (var i in role.Permissions) {
            let permission = role.Permissions[i];
            let pass = false;

            if (permission.type == "other") {
                if (permission.value == "CREATOR") {
                    pass = user.id == "";
                } else if (permission.value == "OWNER") {
                    pass = user.id == guild.ownerId;
                }
            } else {
                pass = user.permissions.has(permission.value);
            };

            if (pass)
                return ({
                    "name": name,
                    "rank": role.Rank
                });
        };
    };

    return ({
        "name": "User",
        "rank": 0
    });
};

const sql = mysql.createPool({
    connectionLimit: 50,
    database: "db0",
    host: "localhost",
    user: MYSQL_USERNAME,
    password: MYSQL_PASSWORD
});

function getString(id) {
    return new Promise(function (a, b) {
        sql.query('select * from strings where id = ?', [id], function (err, results) {
            if (results[0])
                a(results[0].str);
            else
                a();
        });
    });
};

function setString(id, string) {
    return new Promise(async function (a, b) {
        let result = await getString(id);
        if (!result) {
            sql.query('insert into strings(id, str) values(?, ?)', [id, string], function (err, results) { a() });
        } else {
            sql.query('update strings set str = ? where id = ?', [string, id], function (err, results) { a() });
        };
    });
};

// Command initialization

createCommand("Ping", 0, ["ping"], "Pings you", function (message, speaker, channel) {
    channel.send({
        content: `<\x40${speaker.id}>, ` + (message.length == 0 ? "Pong" : message)
    });
});

createCommand("PrintString", 2, ["printstring", "getstring"], "Get $users string", async function (message, speaker, channel, guild) {
    let id = message.match(/(\d+)/)[1];
    if (id != null) {
        let member = await guild.members.fetch(id);
        if (member != null) {
            channel.send(`<\x40${speaker.id}>, <\x40${member.id}>'s string is [${await getString(member.id)}]!`);
        } else {
            throw ("Galaxy: cannot find member!");
        };
    } else
        throw ("Galaxy: no member specified!");
});

createCommand("SetString", 3, ["setstring"], "Set $user's string to $message", async function (message, speaker, channel, guild) {
    let split = message.match(/^(\S+)\s+(.+)/);
    if (!split) {
        throw ("Galaxy: incorrect command input");
    } else {
        let id = split[1].match(/(\d+)/)[1];
        if (id != null) {
            let member = await guild.members.fetch(id);
            if (member != null) {
                setString(member.id, split[2]);
                channel.send(`<\x40${speaker.id}>, <\x40${member.id}>'s string is set to [${await getString(member.id)}]!`);
            } else {
                throw ("Galaxy: cannot find member!");
            };
        } else
            throw ("Galaxy: no member specified!");
    };
});

// Bot initialization

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.on("messageCreate", onChatted);
client.login(TOKEN);

// Embedded website

const express = require('express')
const app = express()

app.get('/', async function (req, res) {
    res.send(`Galaxy V1: ${await getString(1341270334158012436n)}`);
})

app.listen(PORT)