const connection = require('./models/db');

const util = require('util');
const express = require('express');
const path = require('path');

const app = express();

const query = util.promisify(connection.query).bind(connection);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(8080, () => {
    console.log(`Servidor rodando em http://localhost:${8080}`);
});