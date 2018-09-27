var restify = require('restify');
var builder = require('botbuilder');
var AdaptiveCards = require("adaptivecards");

var data = require('./data.json');

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
        session.send("Wilkommen.");
        session.beginDialog('askForID');
    },
    function (session, results) {
        session.dialogData.ID = results.response;
        var job = getJob(`${session.dialogData.ID}`);
        session.send(`Hallo ${job.MieterName}, ihr Termin ist am ${job.TerminDatum_absolut} und ihr Schaden ist: ${job.Inventar} ${job.Schaden}`);
        session.beginDialog('askForMore')
    },
    function (session) {
        //session.send("Weiter gehts");
    }
        ]).set('storage', inMemoryStorage); // Register in-memory storage 

    bot.dialog('askForID', [
        function (session) {
            builder.Prompts.text(session, "Bitte Auftragsnummer eingeben");
        },
        function (session, results) {
            session.endDialogWithResult(results);
        }
    ]);

    bot.dialog('askForMore', [
        function (session) {
            var msg = new builder.Message(session).addAttachment(selectionCard);
            session.send(msg);
            console.log(selectionCard);
            processSubmitAction(session, session.message.value);
            
            session.endDialog();
        }
    ]);

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
        session.send("Termin wurde gelöscht!");
        session.endDialog();
    }
]);

bot.dialog('moveAppointment', [
    function (session) {
        session.send("Termin wurde verschoben!");
        session.endDialog();
    }
]);
