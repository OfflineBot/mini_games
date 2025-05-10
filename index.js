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

    function nextRound() {
        playersReady.clear(); // reset für nächste Runde
        currentRound++;

        if (currentRound > maxRounds) {
            // Alle Spieler sehen die vollständige Geschichte
            io.emit('showResults', players);
            gameStarted = false;
            return;
        }

        const sendData = {};
        for (let i = 0; i < playerOrder.length; i++) {
            const currentId = playerOrder[i];
            const prevId = playerOrder[(i - 1 + playerOrder.length) % playerOrder.length];
            sendData[currentId] = players[prevId]?.sentence || "";
        }

        for (const id of playerOrder) {
            io.to(id).emit('newRound', {
                previousSentence: sendData[id],
                round: currentRound,
                totalRounds: maxRounds
            });
        }

        // starte neuen Timer für nächste Runde
        roundTimeout = setTimeout(() => nextRound(), roundTime);
    }
});

http.listen(port, () => console.log(`Server running..`));
