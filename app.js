var restify = require('restify');
var builder = require('botbuilder');
var AdaptiveCards = require("adaptivecards");

var data = require('./data.json');
var job;

var idCard = require("./cards/id-card.json");
var selectionCard = require("./cards/selection-card.json");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
//    console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')

var inMemoryStorage = new builder.MemoryBotStorage();

var bot = new builder.UniversalBot(connector, [

    function (session) {
        console.log('###1');
        session.send("Wilkommen beim B&O Helpdesk");
        session.beginDialog('askForID');
    },
    function (session, results) {
        console.log('###2');
        session.dialogData.ID = results.response;
        job = getJob(`${session.dialogData.ID}`);
        var damageCard = {
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.0",
            "body": [
                {
                    "type": "Container",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Auftragsnummer: " + job.AuftragNr,
                            "weight": "bolder",
                            "size": "medium"
                        },
                        {
                            "type": "ImageSet",
                            "imageSize": "medium",
                            "images": [
                                {
                                    "type": "Image",
                                    "url": job.Link1
                                },
                                {
                                    "type": "Image",
                                    "url": job.Link2
                                },
                                {
                                    "type": "Image",
                                    "url": job.Link3
                                }
                            ]
                        }
                    ]
                },
                {
                    "type": "Container",
                    "items": [
                        {
                            "type": "FactSet",
                            "facts": [
                                {
                                    "title": "Name:",
                                    "value": job.MieterName
                                },
                                {
                                    "title": "Datum:",
                                    "value": job.TerminDatum_absolut
                                },
                                {
                                    "title": "Schaden",
                                    "value": job.Inventar + " " + job.Schaden
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        }
        var msg = new builder.Message(session).addAttachment(damageCard);
        session.send(msg);   
        session.beginDialog('askForMore')
    },
]).set('storage', inMemoryStorage); // Register in-memory storage 

    bot.dialog('askForID', [
        function (session) {
            console.log('###4');
            // var msg = new builder.Message(session).addAttachment(idCard);
            // session.send(msg);   

            builder.Prompts.text(session, "Bitte geben Sie ihre Auftragsnummer ein.");

        },
        function (session, results) {
            console.log('###5');
            session.endDialogWithResult(results);
            console.log("#####6");
        }
    ]);

    bot.dialog('askForMore',
        function (session) {
            console.log('###6');
            if(session.message && session.message.value) {
                console.log('###7');
                console.log(session.message.value)
                processSubmitAction(session, session.message.value);
                return;
            }
            var msg = new builder.Message(session).addAttachment(selectionCard);
            session.send(msg);

        }
    );

    function getJob(id) {
    var jobAuftrag;
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var job = data[key]
                if(job.AuftragNr === id) {
                    jobAuftrag = job
                }
            }
        }
        return jobAuftrag;
}

function deleteJob(id) {
    console.log('###11', id);
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            var job = data[key]
            if(job.AuftragNr === id) {
                job.TerminStatus = "storniert";
                console.log('###12', job.TerminStatus);   
            }
        }
    }
}


function processSubmitAction(session, value) {
    switch (value.type) {
        case 'delete':
            session.beginDialog('deleteAppointment');
        break;
        case 'move':
            session.beginDialog('moveAppointment');
        break;
        case 'picture':
            session.beginDialog('takePicture');
        break;
    }
}

bot.dialog('deleteAppointment', [
    function (session) {
        console.log('###9');
        builder.Prompts.confirm(session, "Sind Sie sicher, dass sie den Termin löschen wollen?");
    }, function(session, result) {
        console.log('###10');
        console.log(result.response)
        console.log(job.AuftragNr)
        if(result.response) {
            deleteJob(job.AuftragNr)
            session.send(`Ihr Termin mit der Auftragsnummer ${job.AuftragNr} wurde aus unserem System gelöscht.`);
        } else {
            session.send("Termin wurde nicht gelöscht gelöscht!");
            session.beginDialog('askForMore');
        }     
        session.endDialog();
    }
]);

bot.dialog('moveAppointment', [
    function (session) {
        session.send("Termin wurde verschoben!");
        session.endDialog();
    }
]);
