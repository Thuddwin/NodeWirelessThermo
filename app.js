const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3');
const PORT = 4000;

var app = express();
var db = new sqlite3.Database('./public/database/temps.db');

const tStamp = Date.now();
db.run('CREATE TABLE IF NOT EXISTS temp_samples (id INTEGER PRIMARY KEY AUTOINCREMENT, sensor_name text not null, temp text, time datetime)');

let pa = path.join(__dirname, 'public');
console.log(`PATH: ${pa}`);
//app.use('static', express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, 'public/views/index.html'));
  });

  // ADD CRUD FUNCTIONS HERE //

  app.listen(PORT, () => {
    console.log(`Betty's Wireless Temperature Monitor listening on port: ${PORT}.`);
  })