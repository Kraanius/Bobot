var restify = require('restify');
var builder = require('botbuilder');
var AdaptiveCards = require("adaptivecards");
var nodemailer = require('nodemailer');
const fs = require('fs');
var data = require('./data.json');
var utils = require('./utils.js');
var customVisionService = require('./customVisionService.js');
var job = null;

var idCard = require("./cards/id-card.json");
var selectionCard = require("./cards/selection-card.json");
var dateCard = require("./cards/dateCard.json");

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
        session.send("Wilkommen beim B&O Helpdesk");
        session.beginDialog('askForID');
    },
    function (session, results) {
        console.log('###2', job); 
        if(job !== null) {
            console.log("###3")
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
            session.beginDialog('askForMore');
        }
   
            
        
    }
]).set('storage', inMemoryStorage); // Register in-memory storage 

    bot.dialog('askForID', [
        function (session) {
            console.log('###4');
            // var msg = new builder.Message(session).addAttachment(idCard);
            // session.send(msg);   
            builder.Prompts.number(session, "Bitte geben Sie ihre Auftragsnummer ein.");
        },
        function (session, results) {
            console.log('###5');
            session.dialogData.ID = results.response;
            job = getJob(`${session.dialogData.ID}`);
            if(job !== null){
                session.endDialogWithResult(results);
            } else {
                var msg = "Wir können diesen Auftrag leider nicht finden.";
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
    console.log('###11', id);
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            var job = data[key]
            if(job.AuftragNr === id) {
                job.TerminStatus = "storniert";
                break;
            }
        }
    }
    console.log("###1000", data)
    let data2 = JSON.stringify(data, null, 2);
    fs.writeFile('data.json', data2, (err) => {  
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
        case 'date':
            session.beginDialog('changeDate');
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
        } else {
            session.send("Termin wurde nicht gelöscht!");
            session.beginDialog('askForMore');
        }     
        session.endDialog();
    }
]);

bot.dialog('moveAppointment', [
    function (session) {
        if(session.message && session.message.value.type === "date") {
            submitChangeDate(session, session.message.value)
            return;
        }
        var msg = new builder.Message(session).addAttachment(dateCard);
        session.send(msg); 
        
    }
]);

bot.dialog('askForMore',
function (session) {   
    if(session.message && session.message.value) {
        console.log('###7');
        console.log(session.message.value)
        processSubmitAction(session, session.message.value);
        return;
    }
    var msg = new builder.Message(session).addAttachment(selectionCard);
    session.send(msg); 
});

function submitChangeDate(session, value){
    date = value.DateVal
    session.beginDialog('changeDate1',{date});
}

bot.dialog('changeDate1',function (session, date) {
    console.log('###6', date.date);    
    let changedDate = changeDateInJson(date.date)
    session.send(`Ihr Termin wurde auf den ${changedDate} verschoben.`)
    session.endDialog();
});

bot.dialog('takePicture', [
    function (session) {
        builder.Prompts.attachment(session, "Bitte laden Sie ihre Bilder hoch");
    },
    function(session, result) {
        if(utils.hasImageAttachment(session)){
            var stream = utils.getImageStreamFromMessage(session.message); 
            customVisionService.predict(stream)
                .then(function (response) {
                    // Convert buffer into string then parse the JSON string to object
                    var jsonObj = JSON.parse(response.toString('utf8'));
                    console.log("JSONOBJ: ###### " + JSON.stringify(jsonObj));
                    var topPrediction = jsonObj.predictions[0];
        
                    // make sure we only get confidence level with 0.80 and above. But you can adjust this depending on your need
                    if (topPrediction.probability >= 0.80) {
                        session.send('Ok, ich glaube, dass ist ${topPrediction.tagName}!');
                    } else {
                        session.send('Hmm, ich weiß nicht, was das ist :(');
                    }
                }).catch(function (error) {
                    console.log(error);
                    session.send('Oops, there\'s something wrong with processing the image. Please try again.');
                });
        
        } else {
            session.send('Ich habe leider kein Bild erhalten');
        }
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

let data3 = JSON.stringify(data, null, 2);
fs.writeFile('data.json', data3, (err) => {  
    if (err) throw err;
});
return date;
}