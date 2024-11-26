const envPath = process.env.NODE_ENV === 'development'?
'.env' : `.env.${process.env.NODE_ENV}`
require('dotenv').config({path: envPath})
const express = require("express");
const app = express();
const path = require("path");
const cors = require('cors');
const routes = require('./src/routes')
const errorHandler = require("./src/middlewares/errorHandler");

const { PORT = 3000 } = process.env;

// const server = http.createServer(app);

// untuk meregistrasi global variable untuk error handling
require("./src/helpers/errors");
require("./src/config/firebase")

app.use(cors())
app.use(express.json());

app.use("/public", express.static(path.resolve(__dirname, "public")));

app.get('/', async (req, res) => {
  res.status(200).send('Car Rental API')
})

app.use('/api/v1', routes)

//application level middleware unuk error handling
app.use(errorHandler)

app.use((req, res, next) => {
  next(new NotFoundError(null, "Sorry, page not found!"));
})

const server = app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});

module.exports = server; // untuk dapat di gunakan pada testing