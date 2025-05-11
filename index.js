const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const cookieParser = require('cookie-parser');

const port = process.env.PORT || 8000;

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

let players = {}; // socket.id -> { username, sentence, story }
let gameStarted = false;
let roundTime = 30000; // default 10s
let currentRound = 0;
let maxRounds = 0;
let playerOrder = []; // array of socket ids
let playersReady = new Set(); // neu: Set für Spieler, die fertig sind
let roundTimeout; // für den Timer jeder Runde
let timerInterval;

app.get('/', (req, res) => {
    res.render('index');
});

io.on('connection', socket => {
    console.log('User connected', socket.id);

    socket.on('register', (username) => {
        players[socket.id] = { username, sentence: "", story: [] }; // hinzugefügt: story
        io.emit('playersUpdate', Object.values(players).map(p => p.username));
    });

    socket.on('setTime', (time) => {
        roundTime = parseInt(time) * 1000;
        io.emit('timeUpdate', time); // update für alle Spieler
    });

    socket.on('startGame', () => {
        if (gameStarted) return;
        gameStarted = true;
        playerOrder = Object.keys(players);
        maxRounds = playerOrder.length;
        currentRound = 0;
        io.emit('startGame');

        clearInterval(timerInterval);
        startRoundTimer();
        setTimeout(() => nextRound(), 1000); // kleiner Wartezeit
    });

    socket.on('submitSentence', (sentence) => {
        if (players[socket.id]) {
            players[socket.id].sentence = sentence;
            players[socket.id].story.push(sentence); // füge Satz zur Story hinzu
        }

        playersReady.add(socket.id); // markiere Spieler als "fertig"

        // Wenn alle Spieler fertig sind, überspringe den Timer und starte die nächste Runde
        if (playersReady.size === playerOrder.length) {
            console.log("Alle Spieler fertig, nächste Runde!");
            clearTimeout(roundTimeout); // stoppe alten Timer
            nextRound();
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected', socket.id);
        delete players[socket.id];
        playersReady.delete(socket.id);
        io.emit('playersUpdate', Object.values(players).map(p => p.username));
    });

    function startRoundTimer() {
        let remainingTime = roundTime; // Setze die verbleibende Zeit

        // Sende regelmäßig die verbleibende Zeit an alle Clients
        timerInterval = setInterval(() => {
            remainingTime -= 1000; // Verringere die Zeit um 1 Sekunde

            // Sende die verbleibende Zeit an alle Clients
            io.emit('timerUpdate', remainingTime);

            // Wenn die Zeit abgelaufen ist, stoppe den Timer und gehe zur nächsten Runde
            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                nextRound(); // Nächste Runde starten
            }
        }, 1000);
    }

    function buildStories() {
        const stories = {};

        for (let i = 0; i < playerOrder.length; i++) {
            const startPlayerId = playerOrder[i];
            const story = [];

            // Erste Zeile: Starter mit dem Startsatz
            story.push({ name: players[startPlayerId].username, story: players[startPlayerId].story[0] });

            // Jetzt der Reihe nach ergänzen
            for (let r = 1; r < maxRounds; r++) {
                const nextPlayerId = playerOrder[(i + r) % playerOrder.length];
                story.push({ name: players[nextPlayerId].username, story: players[nextPlayerId].story[r] });
            }

            stories[startPlayerId] = story;
        }

        return stories;
    }

    function nextRound() {
        playersReady.clear();
        currentRound++;

        if (currentRound > maxRounds) {
            // Alle sehen am Ende die vollständige Story
            const final_stories = buildStories();
            io.emit('showResults', final_stories);
            gameStarted = false;
            clearInterval(timerInterval);
            clearTimeout(roundTimeout);
            console.log("Spiel abgeschlossen, alle Storys werden angezeigt.");
            return;
        }

        const sendData = {};

        for (let i = 0; i < playerOrder.length; i++) {
            const currentId = playerOrder[i];

            if (currentRound === 1) {
                // Runde 1: Alle starten neu, kein vorheriger Satz
                sendData[currentId] = "";
            } else {
                // Runde 2, 3, 4, ...: Satz vom richtigen Vorgänger holen
                const offset = currentRound - 1;
                const prevId = playerOrder[(i + offset) % playerOrder.length];
                sendData[currentId] = players[prevId]?.sentence || "";
            }
        }

        for (const id of playerOrder) {
            io.to(id).emit('newRound', {
                previousSentence: sendData[id],
                round: currentRound,
                totalRounds: maxRounds
            });
        }

        // Timer für automatische nächste Runde (falls nicht alle vorher fertig sind)
        //roundTimeout = setTimeout(() => nextRound(), roundTime);
        clearInterval(timerInterval);
        clearTimeout(roundTimeout);
        startRoundTimer();
    }

});

http.listen(port, () => console.log(`Server running..`));
