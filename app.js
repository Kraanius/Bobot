var restify = require('restify');
var builder = require('botbuilder');
var AdaptiveCards = require("adaptivecards");
var confirmed = true;

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

var bot = new builder.UniversalBot(connector, function (session) {
    if (session.message && session.message.value) {
        processSubmitAction(session, session.message.value);
        var confirmed = false;
        return;   
    }

    var msg = new builder.Message(session).addAttachment(idCard);
    session.send(msg);    
});
bot.dialog('id-search', require('./id-search'));


function processSubmitAction(session, value) {
    var defaultErrorMessage = 'Bitte geben Sie eine Auftragsnummer ein';
    switch (value.type) {
        case 'id':
            if(value.id !== '') {
                session.beginDialog('id-search', value);
            } else {
                session.send(defaultErrorMessage);
            }
        break;
        default:
            // A form data was received, invalid or incomplete since the previous validation did not pass
            session.send(defaultErrorMessage);
    }
    
}
