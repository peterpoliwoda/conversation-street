'use strict';

require('dotenv').config();
require('colors');
const fs = require('fs');

const TEXT_TO_SPEECH_API_KEY = process.env.TEXT_TO_SPEECH_API_KEY;
const TEXT_TO_SPEECH_API_URL = process.env.TEXT_TO_SPEECH_API_URL;
const WATSON_ASSISTANT_API_KEY = process.env.WATSON_ASSISTANT_API_KEY;
const WATSON_ASSISTANT_API_URL = process.env.WATSON_ASSISTANT_API_URL;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');

const assistant = new AssistantV2({
    authenticator: new IamAuthenticator({ apikey: WATSON_ASSISTANT_API_KEY }),
    serviceUrl: WATSON_ASSISTANT_API_URL,
    serviceName: 'assistant',
    version: '2021-01-28'
});
const TextToSpeechV1 = require('ibm-watson/text-to-speech/v1');
const textToSpeech = new TextToSpeechV1({
    authenticator: new IamAuthenticator({ apikey: TEXT_TO_SPEECH_API_KEY }),
    url: TEXT_TO_SPEECH_API_URL,
});

const express = require('express');
const app = express();

// Web UI
app.use(express.static(__dirname + '/public'));
app.get('/', (req, res) => {
    res.sendFile('./public/index.html');
});

const server = app.listen(process.env.PORT || 5000, () => {
    console.log('Assistant'.magenta + ' listening on port %d', server.address().port);
});

let SESSION_ID;

const io = require('socket.io')(server);
io.on('connection', async () => {
    try {
        const response = await assistant.createSession({ assistantId: ASSISTANT_ID });
        SESSION_ID = response.result.session_id;
        console.log('User session created.');
    } catch (sessionErr) {
        console.error('sessionError', sessionErr);
    }
});

io.on('connection', function(socket) {
    socket.on('chat message', async (text) => {
        console.log('Pizza Delivery:'.bold.cyan, text);

        try {
            const assistantResponse = await assistant.message({
                input: { text: text },
                assistantId: ASSISTANT_ID,
                sessionId: SESSION_ID,
            });

            let assistantResp = assistantResponse.result.output.generic[0].text;
            console.log('ASSISTANT:'.bold.magenta, assistantResp);

            const params = {
                text: assistantResp,
                voice: 'en-GB_KateVoice',
                accept: 'audio/wav',
            };

            const audio = await textToSpeech.synthesize(params);
            const repairedWav = await textToSpeech.repairWavHeaderStream(audio.result);
            fs.writeFileSync('./public/speech.wav', repairedWav);
            socket.emit('bot reply', assistantResp);

        } catch (err) {
            console.error('ERROR on ass', err);
            socket.emit('Bot replied with error');
        }
    });
});
