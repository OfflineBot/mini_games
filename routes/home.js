
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render("home.ejs");
});

router.get('/clear-all-rooms', (req, res) => {
    res.redirect("/")
})

module.exports = router;