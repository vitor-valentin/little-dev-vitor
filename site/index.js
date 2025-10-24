const connection = require("./models/db");

const util = require("util");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const dayjs = require("dayjs");

const saltRounds = 10;
const itensPerPage = 8;

const app = express();

const query = util.promisify(connection.query).bind(connection);

const mainRoutes = [
    "/",
    "/areas",
    "/equipamentos",
    "/equipe",
    "/config",
    "/emprestimos",
    "/vistoria",
];

app.use(express.json());
app.use(cookieParser());

async function requireLogin(req, res, next) {
    const userToken = req.cookies.userToken;
    if (!userToken) {
        return res.redirect("/login");
    } else {
        try {
            const check = await query(
                "SELECT dataToken FROM tbEquipe WHERE tokenAcesso = ?",
                [userToken]
            );
            if (!check.length) {
                res.clearCookie("userToken", {
                    httpOnly: true,
                    sameSite: "lax",
                    maxAge: 1000 * 60 * 60 * 24,
                });
                return res.redirect("/login");
            } else {
                const now = dayjs();
                const date = check[0].dataToken;

                if (now.diff(date, "day") >= 1) {
                    res.clearCookie("userToken", {
                        httpOnly: true,
                        sameSite: "lax",
                        maxAge: 1000 * 60 * 60 * 24,
                    });
                    return res.redirect("/login");
                } else {
                    next();
                }
            }
        } catch (err) {
            console.error("Erro no MySQL: ", err);
        }
    }
}

async function generateToken() {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 16; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        token += chars[randomIndex];
    }

    try {
        const check = await query(
            "SELECT * FROM tbEquipe WHERE tokenAcesso = ?",
            [token]
        );

        if (!check.length) return token;

        return await generateToken();
    } catch (err) {
        console.error("Erro no MySQL: ", err);
    }
}

// GET

mainRoutes.forEach((route) => {
    app.get(route, requireLogin, async (req, res) => {
        res.sendFile(path.join(__dirname, "src", "index.html"));
    });
});

app.get("/login", async (req, res) => {
    if (req.cookies.userToken) {
        res.redirect("/");
    }
    res.sendFile(path.join(__dirname, "src", "pages", "login.html"));
});

app.get("/logout", requireLogin, async (req, res) => {
    try {
        await query(
            "UPDATE tbEquipe SET tokenAcesso = '', dataToken = '' WHERE tokenAcesso = ?",
            [req.cookies.userToken]
        );
    } catch (err) {
        console.error("Erro no MySQL: ", err);
    }

    res.clearCookie("userToken");
    res.redirect("/login");
});

app.get("/getId", requireLogin, async (req, res) => {
    try {
        const response = await query(
            "SELECT idMembro FROM tbEquipe WHERE tokenAcesso = ?",
            [req.cookies.userToken]
        );
        const userId = response[0].idMembro;
        res.status(200).send({ id: userId });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar o id do usuário.",
        });
    }
});

app.get("/config/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query(
            "SELECT * FROM tbConfig WHERE idUsuario = ?",
            [parseInt(2)]
        );
        res.status(200).send(result[0]);
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message:
                "Erro ao tentar pegar as configurações do usuário do banco de dados.",
        });
    }
});

app.get("/areas/:page", async (req, res) => {
    const { page } = req.params;

    try {
        const result = await query(
            "SELECT * FROM tbAreas ORDER BY idArea DESC LIMIT ?, ?",
            [(parseInt(page) - 1) * itensPerPage, itensPerPage]
        );
        const result2 = await query(
            "SELECT COUNT(*) AS totalItens FROM tbAreas"
        );
        res.status(200).send({ result, result2 });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar itens da tabela",
        });
    }
});

app.get("/areas/find/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query("SELECT * FROM tbAreas WHERE idArea = ?", [
            id,
        ]);
        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar item da tabela",
        });
    }
});

app.get("/equipe/:page", async (req, res) => {
    const { page } = req.params;

    try {
        const result = await query(
            "SELECT * FROM tbEquipe ORDER BY idMembro DESC LIMIT ?, ?",
            [(parseInt(page) - 1) * itensPerPage, itensPerPage]
        );
        const result2 = await query(
            "SELECT COUNT(*) AS totalItens FROM tbEquipe"
        );
        res.status(200).send({ result, result2 });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar itens da tabela",
        });
    }
});

app.get("/equipe/find/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query(
            "SELECT * FROM tbEquipe WHERE idMembro = ?",
            [id]
        );
        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar item da tabela",
        });
    }
});

app.get("/equipamentos/:page", async (req, res) => {
    const { page } = req.params;

    try {
        const result = await query(
            "SELECT * FROM tbEquipamentos ORDER BY idEquipamento DESC LIMIT ?, ?",
            [(parseInt(page) - 1) * itensPerPage, itensPerPage]
        );
        const result2 = await query(
            "SELECT COUNT(*) AS totalItens FROM tbEquipamentos"
        );
        res.status(200).send({ result, result2 });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar itens da tabela",
        });
    }
});

app.get("/equipamentos/find/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query(
            "SELECT * FROM tbEquipamentos WHERE idEquipamento = ?",
            [id]
        );
        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar item da tabela",
        });
    }
});

app.get("/emprestimos/:page", async (req, res) => {
    const { page } = req.params;

    try {
        const result = await query(
            "SELECT * FROM tbEmprestimos ORDER BY idEmprestimo DESC LIMIT ?, ?",
            [(parseInt(page) - 1) * itensPerPage, itensPerPage]
        );
        const result2 = await query(
            "SELECT COUNT(*) AS totalItens FROM tbEmprestimos"
        );
        res.status(200).send({ result, result2 });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar itens da tabela",
        });
    }
});

app.get("/emprestimos/equipamento/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query(
            "SELECT * FROM tbEmprestimos WHERE idEquipamento = ? AND dataDevolvido = '0000-00-00 00:00:00' AND dataRecebimento <= NOW()",
            [id]
        );
        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar itens da tabela",
        });
    }
});

// POST

app.post("/login", async (req, res) => {
    if (req.cookies.userToken) {
        res.status(500).json({
            error: "Tentativa de login inválida. O usuário já está logado.",
        });
    }

    const { emailValue, passwdValue } = req.body;

    try {
        const results = await query(
            "SELECT * FROM tbEquipe WHERE emailMembro = ?",
            [emailValue]
        );

        if (!results.length)
            return res
                .status(401)
                .json({ error: "Usuário ou senha incorretos." });

        const user = results[0];

        const match = await bcrypt.compare(passwdValue, user.senhaMembro);
        if (!match)
            res.status(401).json({ error: "Usuário ou senha incorretos." });

        let newToken = await generateToken();

        const currentDateTime = dayjs().format("YYYY-MM-DD HH:mm");

        await query(
            "UPDATE tbEquipe SET tokenAcesso = ?, dataToken = ? WHERE idMembro = ?",
            [newToken, currentDateTime, user.idMembro]
        );

        res.cookie("userToken", newToken, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24,
        });
        res.status(200).json({ message: "Login realizado com sucesso!" });
    } catch (err) {
        console.error("Erro no MySQL:", err);
        res.status(500).json({ error: err.message });
    }
});

// PUT

app.put("/config", requireLogin, async (req, res) => {
    const {
        valueTmpDurAvisos,
        valueNotSistema,
        valueModoDalt,
        valueTema,
        valueSomNot,
        valueVolNot,
    } = req.body;
    const tokenUser = req.cookies.userToken;
    try {
        const res = await query(
            "SELECT idMembro FROM tbEquipe WHERE tokenAcesso = ?",
            [tokenUser]
        );
        const idUser = res[0].idMembro;
        await query(
            "UPDATE tbConfig SET tempoAvisos = ?, notificacoesSistema = ?, modoDaltonismo = ?, temaCor = ?, somNotificacoes = ?, volumeNotificacao = ? WHERE idUsuario = ?",
            [
                valueTmpDurAvisos,
                valueNotSistema,
                valueModoDalt,
                valueTema,
                valueSomNot,
                valueVolNot,
                idUser,
            ]
        );
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Ocorreu um erro ao tentar salvar suas configurações.",
        });
    }

    res.status(200).send({ message: "Configurações salvas com sucesso!" });
});

// DELETE

app.delete("/areas/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await query(
            `
  DELETE emp
  FROM tbEmprestimos emp
  JOIN tbEquipe e ON emp.idMembro = e.idMembro
  WHERE e.idArea = ?;
`,
            [id]
        );
        await query(
            `
  DELETE emp
  FROM tbEmprestimos emp
  JOIN tbEquipamentos eq ON emp.idEquipamento = eq.idEquipamento
  WHERE eq.idArea = ?;
`,
            [id]
        );
        await query(
            `
  DELETE cfg
  FROM tbConfig cfg
  JOIN tbEquipe e ON cfg.idUsuario = e.idMembro
  WHERE e.idArea = ?;
`,
            [id]
        );
        await query(`DELETE FROM tbEquipe WHERE idArea = ?;`, [id]);
        await query(`DELETE FROM tbEquipamentos WHERE idArea = ?;`, [id]);
        await query(`DELETE FROM tbAreas WHERE idArea = ?;`, [id]);

        res.status(200).send({ message: "Área deletada com sucesso!" });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({ message: "Erro ao deletar a área." });
    }
});

app.delete("/equipe/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await query(`DELETE FROM tbAvisos WHERE idUsuario = ?;`, [id]);
        await query(
            `DELETE FROM tbEmprestimos WHERE idMembro = ? OR idMembroVistoria = ?;`,
            [id, id]
        );
        await query(`DELETE FROM tbConfig WHERE idUsuario = ?;`, [id]);
        await query(`DELETE FROM tbEquipe WHERE idMembro = ?;`, [id]);

        res.status(200).send({ message: "Membro deletada com sucesso!" });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({ message: "Erro ao deletar o membro." });
    }
});

app.delete("/equipamentos/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await query(`DELETE FROM tbEmprestimos WHERE idEquipamento = ?;`, [id]);
        await query(`DELETE FROM tbEquipamentos WHERE idEquipamento = ?;`, [
            id,
        ]);

        res.status(200).send({ message: "Equipamento deletado com sucesso!" });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({ message: "Erro ao deletar o equipamento." });
    }
});

app.delete("/equipamentos/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await query(`DELETE FROM tbEmprestimos WHERE idEmprestimo = ?;`, [id]);

        res.status(200).send({ message: "Empréstimo deletado com sucesso!" });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({ message: "Erro ao deletar o empréstimo." });
    }
});

app.use(express.static(path.join(__dirname, "src")));

app.listen(8080, async () => {
    console.log(`Servidor rodando em http://localhost:${8080}`);
});
