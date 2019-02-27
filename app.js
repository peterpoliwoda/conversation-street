'use strict';

require('colors');
const fs = require('fs');

require('dotenv').config();
const TEXT_TO_SPEECH_API_KEY = process.env.TEXT_TO_SPEECH_API_KEY;
const WATSON_ASSISTANT_API_KEY = process.env.WATSON_ASSISTANT_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

const AssistantV2 = require('watson-developer-cloud/assistant/v2');
const assistant = new AssistantV2({
    iam_apikey: WATSON_ASSISTANT_API_KEY,
    url: 'https://gateway-fra.watsonplatform.net/assistant/api',
    version: '2018-09-19'
});
const TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1');
const textToSpeech = new TextToSpeechV1({
    iam_apikey: TEXT_TO_SPEECH_API_KEY,
    url: 'https://stream-fra.watsonplatform.net/text-to-speech/api'
});

const { promisify } = require('util');
const createSession = promisify(assistant.createSession.bind(assistant));
const messageWatson = promisify(assistant.message.bind(assistant));
const synthesizeVoice = promisify(textToSpeech.synthesize.bind(textToSpeech));

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
        const response = await createSession({ assistant_id: ASSISTANT_ID });
        SESSION_ID = response.session_id;
        console.log('User session created.');
    } catch (sessionErr) {
        console.error('sessionError', sessionErr);
    }
});

io.on('connection', function(socket) {
    socket.on('chat message', async (text) => {
        console.log('Pizza Delivery:'.bold.cyan, text);

        try {
            const assistantResponse = await messageWatson({
                input: { text: text },
                assistant_id: ASSISTANT_ID,
                session_id: SESSION_ID,
            });

            let assistantResp = assistantResponse.output.generic[0].text;
            console.log('ASSISTANT:'.bold.magenta, assistantResp);

            const params = {
                text: assistantResp,
                voice: 'en-US_AllisonVoice',
                accept: 'audio/mp3',
            };

            const audio = await synthesizeVoice(params);
            fs.writeFileSync('./public/speech.mp3', audio);
            socket.emit('bot reply', assistantResp);

        } catch (err) {
            console.error('ERROR on ass', err);
            socket.emit('bot reply with error');
        }
    });
});
