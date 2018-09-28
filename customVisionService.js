'use strict';

var request = require('request-promise').defaults({ encoding: null });

module.exports = {
    predict: predict
}

function predict(stream) {
    console.log(stream);
    var options = {
        method: 'POST',
        url: 'https://southcentralus.api.cognitive.microsoft.com/customvision/v2.0/Prediction/df2904ec-645c-4f1c-ba8e-5fa6794476a8/image?iterationId=5354225e-5931-459b-9cd3-569389c4c99d',        
        headers: {
            'Content-Type': 'application/octet-stream',
            'Prediction-Key': '2425c155cc0d4084906194c54812db08'
        },        
        body: stream
    };

    return request(options);
}