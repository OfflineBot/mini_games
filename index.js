const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const path = require('path');

const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const onlineUsers = {}; // username -> socket.id

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes

// Show login page
app.get('/', (req, res) => {
    res.render('login');
});

// Handle login
app.post('/login', (req, res) => {
    const username = req.body.username.trim();
    if (!username) return res.redirect('/');

    req.session.username = username;
    res.redirect('/lobby');
});

// Show lobby (only if logged in)
app.get('/lobby', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/');
    }
    res.render('lobby', { username: req.session.username });
});

// Socket.io events
io.on('connection', (socket) => {
    console.log('Socket connected: ' + socket.id);

    // User registers after connection
    socket.on('register', (username) => {
        console.log(`User registered: ${username}`);
        onlineUsers[username] = socket.id;
        io.emit('updateUsers', Object.keys(onlineUsers));
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected: ' + socket.id);
        for (const username in onlineUsers) {
            if (onlineUsers[username] === socket.id) {
                delete onlineUsers[username];
                break;
            }
        }
        io.emit('updateUsers', Object.keys(onlineUsers));
    });
});

// Start server
server.listen(port, () => {
    console.log('Server running..');
});
