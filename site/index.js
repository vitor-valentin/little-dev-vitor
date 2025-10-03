const connection = require('./models/db');

const util = require('util');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const dayjs = require('dayjs');

const saltRounds = 10;

const app = express();

const query = util.promisify(connection.query).bind(connection);

app.use(express.json());
app.use(cookieParser());

async function requireLogin(req, res, next) {
    const userToken = req.cookies.userToken;
    if (!userToken) {
        return res.redirect('/login');
    } else {
        try {
            const check = await query("SELECT dataToken FROM tbEquipe WHERE tokenAcesso = ?", [userToken]);
            if(!check.length) {
                res.clearCookie('userToken', { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 })
                return res.redirect('/login');
            } else {
                const now = dayjs();
                const date = check[0].dataToken;

                if(now.diff(date, 'day') >= 1) {
                    res.clearCookie('userToken', { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 })
                    return res.redirect('/login');
                } else {
                    next();
                }
            }
        } catch(err) {
            console.error("Erro no MySQL: ", err);
        }
    }
}

async function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 16; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        token += chars[randomIndex];
    }

    try {
        const check = await query("SELECT * FROM tbEquipe WHERE tokenAcesso = ?", [token]);

        if(!check.length) return token;

        return await generateToken();
    } catch(err) {
        console.error("Erro no MySQL: ", err);
    }
}

// GET

app.get('/', requireLogin, async (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.get('/login', async (req, res) => {
    if(req.cookies.userToken) {
        res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'src', 'login.html'));
})

// POST

app.post('/login', async (req, res) => {
    if(req.cookies.userToken) {
        res.status(500).json({error: "Tentativa de login inválida. O usuário já está logado."});
    }

    const { emailValue, passwdValue } = req.body;

    try {
        const results = await query("SELECT * FROM tbEquipe WHERE emailMembro = ?", [emailValue]);

        if(!results.length) return res.status(401).json({error: "Usuário ou senha incorretos."});
        
        const user = results[0];

        const match = await bcrypt.compare(passwdValue, user.senhaMembro);
        if(!match) res.status(401).json({error: "Usuário ou senha incorretos."});

        let newToken = await generateToken();

        const currentDateTime = dayjs().format('YYYY-MM-DD HH:mm')

        await query("UPDATE tbEquipe SET tokenAcesso = ?, dataToken = ? WHERE idMembro = ?", [newToken, currentDateTime, user.idMembro]);

        res.cookie('userToken', newToken, { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 });
        res.status(200).json({message: "Login realizado com sucesso!"});
    } catch(err) {
        console.error("Erro no MySQL:", err);
        res.status(500).json({ error: err.message });
    }
});

// PUT

// DELETE

app.use(express.static(path.join(__dirname, 'src')));

app.listen(8080, async () => {
    console.log(`Servidor rodando em http://localhost:${8080}`);
});