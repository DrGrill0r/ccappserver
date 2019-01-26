var express = require("express");
var app = express();
var cors = require("cors");
var bodyParser = require("body-parser");
var data = new Array;

app.use(cors());
app.use(bodyParser.json({ type: 'application/json' }));

function Category(id, name) {
  this.id = id;
  this.name = name;
}

var Categories = new Array;

app.get("/v1/categories", (req, res, next) => {
  res.json(Categories);
  res.statusCode = 200;
});

app.post("/v1/categories", (req, res) => {
  console.log(req.body);
  Categories = req.body;
  req.statusCode = 200;
});

app.delete("/v1/categories", (req, res) => {
  console.log(req.body);
  req.statusCode = 200;
});

var port = 80;

app.listen(port, () => {
 console.log("Server running on port ",port);
});
