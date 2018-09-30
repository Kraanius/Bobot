var restify = require('restify');
var builder = require('botbuilder');
var AdaptiveCards = require("adaptivecards");
const fs = require('fs');
var data = require('./data.json');
var utils = require('./utils.js');
var moment = require('moment');
var customVisionService = require('./customVisionService.js');
var job = null;

var idCard = require("./cards/id-card.json");
var selectionCard = require("./cards/selection-card.json");
var dateCard = require("./cards/dateCard.json");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
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
        session.send("Willkommen beim B&O Helpdesk");
        session.beginDialog('askForID');
    },
    function (session, results) {
        if(job !== null) {
            if(job.TerminBemerkungen.length > 1){
                var bemerkungen = job.TerminBemerkungen.join(', ')
            }
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
                                ]
                            }
                        ]
                    },
                    {
                        "type": "ColumnSet",
                        "columns": [
                            {
                                "type": "Column",
                                "width": "100",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "wrap": "false",
                                        "weight": "bolder",
                                        "text": "Name:"
                                    },
                                    {
                                        "type": "TextBlock",
                                        "wrap": "false",
                                        "weight": "bolder",
                                        "text": "Datum:"
                                    },
                                    {
                                        "type": "TextBlock",
                                        "wrap": "false",
                                        "weight": "bolder",
                                        "text": "Schaden:"
                                    },
                                    {
                                        "type": "TextBlock",
                                        "wrap": "false",
                                        "weight": "bolder",
                                        "text": "Details:"
                                    },
                                ]
                            },
                            {
                                "type": "Column",
                                "width": "auto",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "wrap": "true",
                                        "text": job.MieterName
                                    },
                                    {
                                        "type": "TextBlock",
                                        "wrap": "true",
                                        "text": job.TerminDatum_absolut
                                    },
                                    {
                                        "type": "TextBlock",
                                        "wrap": "true",
                                        "text": job.Inventar + " " + job.Schaden
                                    },
                                    {
                                        "type": "TextBlock",
                                        "wrap": "true",
                                        "text": bemerkungen
                                    },
                                ]
                            },
                        ]
                    }
                ]
            }
            }
            var msg = new builder.Message(session).addAttachment(damageCard);
            session.send(msg);
            session.beginDialog('askForMore');
        }
    }
]).set('storage', inMemoryStorage); // Register in-memory storage 
    bot.dialog('askForID', [
        function (session) {
            builder.Prompts.number(session, "Bitte geben Sie ihre Auftragsnummer ein.");
        },
        function (session, results) {
            session.dialogData.ID = results.response;
            job = getJob(`${session.dialogData.ID}`);
            if(job !== null){
                session.endDialogWithResult(results);
            } else {
                var msg = "Wir konnten diesen Auftrag leider nicht finden.";
                session.send(msg);
                session.beginDialog('askForID');
            }
        }
    ]);

function getJob(id) {
    var jobAuftrag = null;
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            var job = data[key]
            if(job.AuftragNr === id) {
                if(job.TerminStatus !== 'storniert' ){
                    jobAuftrag = job
                }
            }
        }
    }
    return jobAuftrag;
}

function deleteJob(id) {
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            var job = data[key]
            if(job.AuftragNr === id) {
                job.TerminStatus = "storniert";
                break;
            }
        }
    }
    let dataNew = JSON.stringify(data, null, 2);
    fs.writeFile('data.json', dataNew, (err) => {  
        if (err) throw err;
    });
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
        builder.Prompts.confirm(session, "Sind Sie sicher, dass sie den Termin löschen wollen?");
    }, function(session, result) {
        if(result.response) {
            deleteJob(job.AuftragNr)
            session.send(`Ihr Termin mit der Auftragsnummer ${job.AuftragNr} wurde aus unserem System gelöscht.`);
            session.endDialog();
        } else {
            session.send("Termin wurde nicht gelöscht.");
            session.beginDialog('askForMore');
        }     
    }
]);

bot.dialog('imageComment', [
    function (session) {
        builder.Prompts.confirm(session, "Möchten Sie noch eine Bemerkung zu dem Foto hinzufügen");
    }, function(session, result) {
        if(result.response) {
            builder.Prompts.text(session, "Bitte geben Sie ihre Bemerkung ein.");
        } else {
            session.send("Ich haben keine weitere Bemerkung aufgenommen. Vielen Dank");
            session.endDialog();
        }     
    }, function(session, result) {
        job.TerminBemerkungen.push(result.response);
        let dataNew = JSON.stringify(data, null, 2);
        fs.writeFile('data.json', dataNew, (err) => {  
            if (err) throw err;
        });
        session.send(`Wir haben folgende Bemerkung aufgenommen: ${result.response}. Vielen Dank.`)
        session.endDialog();
    }
]);

bot.dialog('moveAppointment', [
    function (session) {
        if(session.message.value !== undefined) {
            if(session.message && session.message.value.type === "date") {
                submitChangeDate(session, session.message.value)
                return;
            } 
        } else {
            var message = session.send("Bitte geben Sie ein valides Datum in die Karte ein.")
        }
        var msg = new builder.Message(session).addAttachment(dateCard);
        session.send(msg); 
    }
]);

bot.dialog('askForMore',
function (session) {   
    if(session.message && session.message.value) {
        processSubmitAction(session, session.message.value);
        return;
    }
    var msg = new builder.Message(session).addAttachment(selectionCard);
    session.send(msg); 
});

function submitChangeDate(session, value) {
    date = value.DateVal
    let correctDate = moment(date)
    let today = moment()
    if(correctDate.isAfter(today)) {
        let foramtCorrect = moment(correctDate).format("DD-MM-YYYY");
        session.beginDialog('changeDate1',{foramtCorrect});
    } else {
        session.send("Bitte geben Sie ein gültiges Datum ein.") 
    }
}

bot.dialog('changeDate1',function (session, date) {
    let changedDate = changeDateInJson(date.foramtCorrect)
    session.send(`Ihr Termin wurde auf den ${changedDate} verschoben.`)
    session.endDialog();
});

bot.dialog('takePicture', [
    function (session) {
        builder.Prompts.attachment(session, "Bitte laden Sie ihr Bild hoch.");
    },
    function(session, result) {
        if(utils.hasImageAttachment(session)){
            var stream = utils.getImageStreamFromMessage(session.message); 
            customVisionService.predict(stream)
                .then(function (response) {
                    // Convert buffer into string then parse the JSON string to object
                    var jsonObj = JSON.parse(response.toString('utf8'));
                    var topPrediction = jsonObj.predictions[0];
                    // make sure we only get confidence level with 0.80 and above. But you can adjust this depending on your need
                    if (topPrediction.probability >= 0.70) {
                        session.send(`Ich habe folgendes erkannt: ${topPrediction.tagName}`);
                        var check = checkImage(topPrediction.tagName);
                        if(check) {
                            session.send(`Vielen Dank für das Foto. Ich habe erkannt, dass es zu Ihrem aufgenommenen Schaden mit der Auftragsnummer ${job.AuftragNr} passt.`);
                            session.beginDialog('imageComment');
                        } else {
                            session.send('Vielen Dank für das Foto.');
                        }
                    } else {
                        session.send('Vielen Dank für das Foto.');
                    }
                }).catch(function (error) {
                    console.log(error);
                    session.send('Es gab ein Fehler, bitte versuchen Sie es erneut.');
                });
        } else {
            session.send('Ich habe leider kein Bild erhalten.');
        }
        session.endDialog();
}]);

function changeDateInJson(date){
for (var key in data) {
    if (data.hasOwnProperty(key)) {
        var jobs = data[key]
        if(jobs.AuftragNr === job.AuftragNr) {
            jobs.TerminDatum_absolut = date
        }
    }
}

let dataNew = JSON.stringify(data, null, 2);
fs.writeFile('data.json', dataNew, (err) => {  
    if (err) throw err;
});
return date;
}

function checkImage(imgName) {
    let check = false;
            if(job.Inventar === imgName) {
                check = true;
            }
    return check;
}