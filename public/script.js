'use strict';

/* eslint no-undef: 0 */
const socket = io();

const outputYou = document.querySelector('.output-you');
const outputBot = document.querySelector('.output-bot');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

document.querySelector('button').addEventListener('click', () => {
    console.log('recognition started');
    recognition.start();
});

recognition.addEventListener('speechstart', () => {
    console.log('Speech has been detected.');
});

recognition.addEventListener('result', (e) => {
    console.log('Result has been detected.');

    let last = e.results.length - 1;
    let text = e.results[last][0].transcript;

    outputYou.textContent = text;
    console.log('Confidence: ' + e.results[0][0].confidence);

    socket.emit('chat message', text);
});

recognition.addEventListener('speechend', () => {
    recognition.stop();
});

recognition.addEventListener('error', (e) => {
    outputBot.textContent = 'Error: ' + e.error;
});

/* eslint-disable no-unused-vars */
function synthVoice(text) {
/* eslint-enable no-unused-vars */
    console.log('Speaking', text);
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = text;
    synth.speak(utterance);
}

socket.on('bot reply', function(replyText) {
    console.log('Bot said', replyText);
    if (replyText == '') replyText = '(No answer...)';
    outputBot.textContent = replyText;

    // Uncomment below to see how Chrome sounds on its own
    // synthVoice(replyText);
    const audio = new Audio('speech.mp3?nocache=' + new Date().getTime());
    audio.play();
});
