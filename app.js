var restify = require('restify');
var builder = require('botbuilder');
var AdaptiveCards = require("adaptivecards");
var confirmed = true;

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
    var card = {
        'contentType': 'application/vnd.microsoft.card.adaptive',
        'content': {
            '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
            'type': 'AdaptiveCard',
            'version': '1.0',
            'body': [
                {
                    'type': 'Container',
                    'speak': '<s>Hi!</s><s>Bitte geben Sie ihre Auftragsnummer ein, damit wir ihnen weiter helfen können.</s>',
                    'items': [
                        {
                            'type': 'ColumnSet',
                            'columns': [
                                {
                                    'type': 'Column',
                                    'size': 'stretch',
                                    'items': [
                                        {
                                            'type': 'TextBlock',
                                            'text': 'Hi!',
                                            'weight': 'bolder',
                                            'isSubtle': true
                                        },
                                        {
                                            'type': 'TextBlock',
                                            'text': 'Bitte geben Sie ihre Auftragsnummer ein, damit wir ihnen weiter helfen können.',
                                            'wrap': true
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            'actions': [
                {
                    'type': 'Action.ShowCard',
                    'title': 'Auftragsnummer',
                    'speak': '<s>Auftragsnummer</s>',
                    'card': {
                        'type': 'AdaptiveCard',
                        'body': [
                            {
                                'type': 'TextBlock',
                                'text': 'Bitte geben Sie ihre Auftragsnummer ein'
                            },
                            {
                                'type': 'Input.Text',
                                'id': 'id',
                                'speak': '<s>Bitte geben Sie ihre Auftragsnummer ein</s>',
                                'placeholder': 'QR-127564',
                                'style': 'text'
                            },
                        ],
                        'actions': [
                            {
                                'type': 'Action.Submit',
                                'title': 'Eingabe',
                                'speak': '<s>Eingabe</s>',
                                'data': {
                                    'type': 'id'
                                }
                            }
                        ]
                    }
                },
            ]
        }
    };
    var msg = new builder.Message(session).addAttachment(card);
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
