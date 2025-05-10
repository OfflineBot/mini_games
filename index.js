
const express = require('express');
const cookie_parser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 8000;


const home_router = require("./routes/home.js")

const users = [];
const active_users = {};

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookie_parser());
app.set('view engine', 'ejs')

app.use((req, res, next) => {
  req.users = users;
  req.active_users = active_users;
  next();
});

app.use("/", home_router)

setInterval(() => {
    const now = Date.now();
    for (const ip in active_users) {
        let last_ping = now - active_users[ip].last_ping;
        console.log("last ping", last_ping);
        if (last_ping > 10000) {
            let username = active_users[ip].name
            delete active_users[ip];
            const index = users.indexOf(username);
            if (index !== -1) {
                users.splice(index, 1); 
            }
            console.log(users)
            console.log("player has been deleted")
        }
    }
}, 5000)

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running...`);
});
