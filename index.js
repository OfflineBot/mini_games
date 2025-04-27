
const express = require('express');
const app = express();
const port = process.env.PORT || 8000;

const home_router = require("./routes/home.js")

app.set('view engine', 'ejs')
app.use("/", home_router)



app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running...`);
});
