var util = require('util');
var _ = require('lodash');
var builder = require('botbuilder');
var Store = require('./store');
var App = require('./app');

module.exports = function search(session, id) {
    var auftragsnummer = id.id
    session.send(
        'Danke. Ich suche nach deinem Auftrag, das sollte nicht lange dauern...');
        var card, msg;
    // Async search
    Store
        .searchId(id)
        .then(function (job) {
            msg = new builder.Message(session).text(`Hallo ${job.MieterName}, Ihr Termin ist am ${job.TerminDatum_relativ}, es geht um folgenden Schaden: ${job.Schaden}`);
            session.send(msg);
        }).catch(function(id) {
            msg = new builder.Message(session).text(`Leider konnten wir keinen Auftrag mit der Auftragsnummer ${auftragsnummer} finden.`);
            session.send(msg);
            
        });
    session.endDialog();
};
