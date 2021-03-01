const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const port = 3001;
const options = {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
};
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, options);

// app.use(cors());
app.use(bodyParser.json());

io.on("connection", (socket) => {
  socket.join("first");
  // handle the event sent with socket.send()
  const echo = (ev, val) => {
    console.log(ev, val);
    socket.broadcast.to("first").emit(ev, val);
  };
  socket.onAny(echo);
});

httpServer.listen(port, () => {
  console.log("Server is listening on " + port);
});
