const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const port = 3001;
const http = require("http").Server(app);
const io = require("socket.io")(http);

app.use(cors());
app.use(bodyParser.json());

http.listen(port, function () {
  console.log("Server is listening on " + port);
});
