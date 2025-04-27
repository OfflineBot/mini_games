
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Mini Games');
});

module.exports = router;