
const express = require('express');
const router = express.Router();


router.get('/', (req, res) => {
  res.render("home.ejs");
});

router.get('/lobby', (req, res) => {
    console.log(req.users);
    let users = req.users;
    res.render("lobby.ejs", {users});
});

router.post("/", (req, res) => {
    const { username } = req.body;
    req.users.push(username)
    res.cookie('username', username, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    });
    res.redirect("/lobby")
})

router.post('/ping', (req, res) => {
    const ip = req.ip;
    const username = req.cookies.username;
    req.active_users[ip] = {
        name: username,
        last_ping: Date.now()
    };
    res.sendStatus(200);
})

module.exports = router;