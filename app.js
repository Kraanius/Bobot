var restify = require('restify');
var builder = require('botbuilder');
var AdaptiveCards = require("adaptivecards");
var nodemailer = require('nodemailer');
const fs = require('fs');
var data = require('./data.json');
var job;

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
        console.log('###1');
        session.send("Wilkommen beim B&O Helpdesk");
        session.beginDialog('askForID');
    },
    function (session, results) {
        console.log('###2');
        session.dialogData.ID = results.response;
        job = getJob(`${session.dialogData.ID}`);
        var msg = "Wir können diesen Auftrag leider nicht finden."
        if(job !== null) {
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
                                        "url": "http://www.maler-wenzel.de/_res/metall/064_Heizkoerper/IMG_0967.jpg"
                                    },
                                    {
                                        "type": "Image",
                                        "url": "http://www.maler-wenzel.de/_res/metall/064_Heizkoerper/IMG_1008.jpg"
                                    },
                                    {
                                        "type": "Image",
                                        "url": "http://www.maler-wenzel.de/_res/metall/064_Heizkoerper/IMG_1007.jpg"
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
        }
        
        session.send(msg);   
        if(job !== null) {
            session.beginDialog('askForMore')
        } else {
            session.beginDialog('askForID')
        }
        
    },
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
            session.endDialogWithResult(results);
            console.log("#####6");
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
    var msg = new builder.Message(session).addAttachment(selectionCard);
    session.send(msg);  
    if(session.message && session.message.value) {
        console.log('###7');
        console.log(session.message.value)
        processSubmitAction(session, session.message.value);
        return;
    }
   

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