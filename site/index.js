const connection = require("./models/db");

const util = require("util");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const dayjs = require("dayjs");
const multer = require("multer");
const fs = require("fs");

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

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "src/images/uploads/");
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Formato Inválido"));
    },
});

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

function isEmpty(str) {
    return !str || str.trim() === "";
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

app.get("/getInfo", requireLogin, async (req, res) => {
    try {
        const response = await query(
            "SELECT * FROM tbEquipe WHERE tokenAcesso = ?",
            [req.cookies.userToken]
        );
        const userInfo = response[0];
        res.status(200).send(userInfo);
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar informações do usuário.",
        });
    }
});

app.get("/config/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query(
            "SELECT * FROM tbConfig WHERE idUsuario = ?",
            [id]
        );
        res.status(200).send(result);
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

app.get("/areas/search/:page", async (req, res) => {
    const { page } = req.params;
    const { q } = req.query;

    const itensPerPage = 8;
    const offset = (parseInt(page) - 1) * itensPerPage;

    try {
        const result = await query(
            "SELECT * FROM tbAreas WHERE nomeArea LIKE ? ORDER BY idArea DESC LIMIT ?, ?",
            [`%${q}%`, offset, itensPerPage]
        );

        const result2 = await query(
            "SELECT COUNT(*) AS totalItens FROM tbAreas WHERE nomeArea LIKE ?",
            [`%${q}%`]
        );

        res.status(200).send({ result, result2 });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar buscar áreas no banco de dados",
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

app.get("/equipe/filter/:page", async (req, res) => {
    const { page } = req.params;
    const { q, filter } = req.query;
    const filterJson = filter ? JSON.parse(filter) : null;

    const itensPerPage = 8;
    const offset = (parseInt(page) - 1) * itensPerPage;

    let whereClauses = [];
    let params = [];

    if (q) {
        whereClauses.push(
            "(nomeMembro LIKE ? OR emailMembro LIKE ? OR foneMembro LIKE ?)"
        );
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (filterJson?.areaId) {
        whereClauses.push("idArea = ?");
        params.push(filterJson.areaId);
    }

    const whereSQL = whereClauses.length
        ? "WHERE " + whereClauses.join(" AND ")
        : "";

    try {
        const result = await query(
            `SELECT * FROM tbEquipe ${whereSQL} ORDER BY idMembro DESC LIMIT ?, ?`,
            [...params, offset, itensPerPage]
        );

        const result2 = await query(
            `SELECT COUNT(*) AS totalItens FROM tbEquipe ${whereSQL}`,
            params
        );

        res.status(200).send({ result, result2 });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar buscar membros no banco de dados",
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

app.get("/equipamentos/filter/:page", async (req, res) => {
    const { page } = req.params;
    const { q, filter } = req.query;
    const filterJson = filter ? JSON.parse(filter) : null;
    const { areaId, selectValue, checkState } = filterJson || {};

    const itensPerPage = 8;
    const offset = (parseInt(page) - 1) * itensPerPage;

    let whereClauses = [];
    let params = [];

    let availabilityJoin = "";
    if (selectValue && selectValue !== "ambas") {
        if (selectValue === "indisponivel") {
            availabilityJoin = `
                JOIN tbEmprestimos e 
                ON tbEquipamentos.idEquipamento = e.idEquipamento 
                AND e.dataDevolvido '1900-01-01 01:01:01'
                AND e.dataRecebimento <= NOW()
            `;
        } else {
            whereClauses.push(`NOT EXISTS (
            SELECT 1
            FROM tbEmprestimos emp
            WHERE emp.idEquipamento = tbEquipamentos.idEquipamento
            AND emp.dataDevolvido '1900-01-01 01:01:01'
            AND emp.dataRecebimento <= NOW()
                )`);
        }
    }

    if (q) {
        whereClauses.push("(nomeEquipamento LIKE ? OR codEquipamento LIKE ?)");
        params.push(`%${q}%`, `%${q}%`);
    }

    if (areaId) {
        whereClauses.push("idArea = ?");
        params.push(areaId);
    }

    if (checkState) {
        whereClauses.push("altoValor = 1");
    }

    const whereSQL = whereClauses.length
        ? "WHERE " + whereClauses.join(" AND ")
        : "";

    try {
        const result = await query(
            `SELECT tbEquipamentos.* FROM tbEquipamentos
             ${availabilityJoin}
             ${whereSQL}
             ORDER BY idEquipamento DESC
             LIMIT ?, ?`,
            [...params, offset, itensPerPage]
        );

        const result2 = await query(
            `SELECT COUNT(*) AS totalItens FROM tbEquipamentos
             ${availabilityJoin}
             ${whereSQL}`,
            params
        );

        res.status(200).send({ result, result2 });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar buscar equipamentos no banco de dados",
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

app.get("/emprestimos/filter/:page", async (req, res) => {
    const { page } = req.params;
    const { q, filter } = req.query;
    const filterJson = filter ? JSON.parse(filter) : null;

    const {
        areaId,
        eqId,
        membroId,
        checkV,
        checkA,
        selectValue,
        dateI,
        dateF,
    } = filterJson || {};

    const itensPerPage = 8;
    const offset = (parseInt(page) - 1) * itensPerPage;

    let whereClauses = [];
    let params = [];

    const baseSQL = `
        FROM tbEmprestimos em
        JOIN tbEquipamentos eq ON em.idEquipamento = eq.idEquipamento
        JOIN tbEquipe mb ON em.idMembro = mb.idMembro
    `;

    if (q) {
        whereClauses.push(`(
            eq.nomeEquipamento LIKE ? OR
            eq.codEquipamento LIKE ? OR
            mb.nomeMembro LIKE ? OR
            em.localUso LIKE ?
        )`);
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (areaId) {
        whereClauses.push(`eq.idArea = ?`);
        params.push(areaId);
    }

    if (eqId) {
        whereClauses.push(`eq.idEquipamento = ?`);
        params.push(eqId);
    }

    if (membroId) {
        whereClauses.push(`em.idMembro = ?`);
        params.push(membroId);
    }

    if (checkV) {
        whereClauses.push(`eq.altoValor = 1`);
    }

    if (checkA) {
        whereClauses.push(
            `em.dataDevolucao < NOW() AND (em.dataDevolvido = '1900-01-01 01:01:01' OR em.dataDevolvido > em.dataDevolucao)`
        );
    }

    if (selectValue && selectValue !== "todos") {
        if (selectValue === "finalizados") {
            whereClauses.push("em.dataDevolvido <> '1900-01-01 01:01:01'");
        } else if (selectValue === "agendados") {
            whereClauses.push("em.dataRecebimento > NOW()");
        } else if (selectValue === "em-uso") {
            whereClauses.push(`
                em.dataRecebimento <= NOW()
                AND em.dataDevolucao >= NOW()
                AND em.dataDevolvido <> '1900-01-01 01:01:01'
            `);
        }
    }

    if (dateI) {
        whereClauses.push(`em.dataRecebimento >= ?`);
        params.push(dateI);
    }

    if (dateF) {
        whereClauses.push(`em.dataDevolucao <= ?`);
        params.push(dateF);
    }

    const whereSQL = whereClauses.length
        ? "WHERE " + whereClauses.join(" AND ")
        : "";

    try {
        const result = await query(
            `SELECT em.*, eq.nomeEquipamento, eq.codEquipamento, mb.nomeMembro
             ${baseSQL}
             ${whereSQL}
             ORDER BY idEmprestimo DESC
             LIMIT ?, ?`,
            [...params, offset, itensPerPage]
        );

        const result2 = await query(
            `SELECT COUNT(*) AS totalItens
             ${baseSQL}
             ${whereSQL}`,
            params
        );

        res.status(200).send({ result, result2 });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar buscar empréstimos no banco de dados",
        });
    }
});

app.get("/emprestimos/find/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query(
            "SELECT * FROM tbEmprestimos WHERE idEmprestimo = ?",
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

app.get("/emprestimos/equipamento/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query(
            "SELECT * FROM tbEmprestimos WHERE idEquipamento = ? AND dataDevolvido = '1900-01-01 01:01:01' AND dataRecebimento <= NOW()",
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

//TODO IMPLEMENT THESE
app.get("/emprestimos/vencidos", async (req, res) => {
    try {
        const result = await query(
            "SELECT * FROM tbEmprestimos WHERE dataDevolucao > NOW() AND dataDevolvido = '1900-01-01 01:01:01'"
        );
        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL:", err);
        res.status(500).send({
            message: "Erro ao tentar pegar os emprestimos vencidos.",
        });
    }
});

app.get("/emprestimos/proximos", async (req, res) => {
    try {
        const result = await query(
            "SELECT * FROM tbEmprestimos WHERE DATE(dataDevolucao) = DATE(NOW()) AND dataDevolvido = '1900-01-01 01:01:01';"
        );
        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar os empréstimos próximos.",
        });
    }
});

app.get("/equipamentos/emuso", async (req, res) => {
    try {
        const result = await query(
            `SELECT 
                e.idEquipamento,
                e.nomeEquipamento,
                e.codEquipamento,
                e.imagemEquipamento,
                emp.idEmprestimo,
                emp.dataRecebimento,
                emp.dataDevolucao,
                emp.idMembro,
                emp.localUso
            FROM tbEquipamentos e
            INNER JOIN tbEmprestimos emp 
                ON emp.idEquipamento = e.idEquipamento
            WHERE emp.dataRecebimento < NOW()
              AND (
                    emp.dataDevolvido = '1900-01-01 01:01:01' 
                    
                  )`
        );

        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL:", err);
        res.status(500).send({
            message: "Erro ao tentar pegar os equipamentos em uso.",
        });
    }
});

app.get("/emprestimos/mes", async (req, res) => {
    try {
        const result = await query(
            `SELECT * 
             FROM tbEmprestimos 
             WHERE dataDevolvido <> '1900-01-01 01:01:01'
               AND MONTH(dataDevolucao) = MONTH(CURDATE())
               AND YEAR(dataDevolucao) = YEAR(CURDATE())`
        );

        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar os empréstimos do mês.",
        });
    }
});

app.get("/emprestimos/ultimos", async (req, res) => {
    try {
        const result = await query(
            `SELECT *
             FROM tbEmprestimos
             WHERE dataDevolvido <> '1900-01-01 01:01:01'
             ORDER BY dataDevolvido DESC
             LIMIT 5`
        );

        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL:", err);
        res.status(500).send({
            message: "Erro ao tentar pegar os últimos empréstimos devolvidos.",
        });
    }
});

app.get("/emprestimos/atrasados", async (req, res) => {
    try {
        const result = await query(
            `SELECT *
             FROM tbEmprestimos
             WHERE dataDevolvido = '1900-01-01 01:01:01'
               AND dataDevolucao < NOW()
             ORDER BY dataDevolucao DESC
             LIMIT 15`
        );

        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL:", err);
        res.status(500).send({
            message: "Erro ao tentar pegar os empréstimos atrasados.",
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

app.post("/avisos", requireLogin, async (req, res) => {
    const { userId, mensagemAviso } = req.body;

    try {
        await query(
            "INSERT INTO tbAvisos (avisoSistema, idUsuario, mensagemAviso, dataAviso) VALUES (false, ?, ?, NOW())",
            [userId, mensagemAviso]
        );
        res.status(200).send();
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({ message: "Erro ao tentar postar o aviso." });
    }
});

app.post(
    "/equipamentos",
    requireLogin,
    upload.single("imagem"),
    async (req, res) => {
        const { nome, codigo, areaId, altoValor } = req.body;
        const nomeFile = req.file.filename;

        try {
            await query(
                "INSERT INTO tbEquipamentos (imagemEquipamento, nomeEquipamento, codEquipamento, altoValor, idArea) VALUES (?, ?, ?, ?, ?)",
                [nomeFile, nome, codigo, altoValor, areaId]
            );
            res.status(200).send();
        } catch (err) {
            console.error("Erro no MySQL: ", err);
            res.status(500).send({ error: "Erro ao tentar cadastrar" });
        }

        res.status(200).send();
    }
);

app.post("/equipe", requireLogin, async (req, res) => {
    const { nome, email, fone, area, check, senha } = req.body;
    const params = [nome, email, fone, area, check];
    let sql = "?, ?, ?, ?, ?";
    let hasSenha = "";

    if (!isEmpty(senha)) {
        params.push(await bcrypt.hash(senha, saltRounds));
        sql += ", ?";
        hasSenha = ", senhaMembro";
    }

    try {
        const insert = await query(
            `INSERT INTO tbEquipe (nomeMembro, emailMembro, foneMembro, idArea, acessoSistema${hasSenha}) VALUES (${sql})`,
            params
        );

        const id = insert.insertId;
        await query(
            "INSERT INTO tbConfig (idUsuario, tempoAvisos, notificacoesSistema, modoDaltonismo, temaCor, somNotificacoes, volumeNotificacao) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id, 30, 1, 0, "claro", 1, 100]
        );

        res.status(200).send();
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({ error: "Erro ao tentar cadastrar" });
    }
});

app.post("/emprestimos", requireLogin, async (req, res) => {
    const { idEquipamento, recebimento, devolucao, local, idMembro, obs } =
        req.body;
    const params = [idEquipamento, recebimento, devolucao, "1900-01-01 01:01:01", idMembro, local, "NOT-SET"];
    let sql = "?, ?, ?, ?, ?, ?, ?";
    let hasObs = "";

    if (!isEmpty(obs)) {
        params.push(obs);
        sql += ", ?";
        hasObs = ", infoReserva";
    }

    try {
        await query(
            `INSERT INTO tbEmprestimos (idEquipamento, dataRecebimento, dataDevolucao, dataDevolvido, idMembro, localUso, devolvidoPor${hasObs}) VALUES (${sql})`,
            params
        );
        res.status(200).send();
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({ error: "Erro ao tentar cadastrar" });
    }
});

app.post("/areas", requireLogin, async (req, res) => {
    const { nome } = req.body;

    try {
        await query("INSERT INTO tbAreas (nomeArea) VALUES (?)", [nome]);
        res.status(200).send();
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({ error: "Erro ao tentar cadastrar" });
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

app.put("/areas/:id", requireLogin, async (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;

    try {
        await query("UPDATE tbAreas SET nomeArea = ? WHERE idArea = ?", [
            nome,
            id,
        ]);
        res.status(200).send();
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({ err: "Erro ao tentar editar área" });
    }
});

app.put("/equipe/:id", async (req, res) => {
    const { id } = req.params;
    const { nome, email, fone, area, check, senha } = req.body;

    try {
        let queryStr = `
            UPDATE tbEquipe 
            SET nomeMembro=?, emailMembro=?, foneMembro=?, idArea=?, acessoSistema=?
        `;

        const params = [nome, email, fone, area, check ? 1 : 0];

        if (senha && senha.trim() !== "") {
            queryStr += `, senhaMembro=?`;
            params.push(await bcrypt.hash(senha, saltRounds));
        }

        queryStr += ` WHERE idMembro=?`;
        params.push(id);

        await query(queryStr, params);

        res.status(200).send({ message: "Atualizado com sucesso" });
    } catch (err) {
        res.status(500).send({ message: "Erro", err });
    }
});

app.put(
    "/equipamentos/:id",
    requireLogin,
    upload.single("imagem"),
    async (req, res) => {
        const { id } = req.params;
        const { nome, codigo, areaId, altoValor } = req.body;
        let newFile = req.file ? req.file.filename : null;

        try {
            const [old] = await query(
                "SELECT imagemEquipamento FROM tbEquipamentos WHERE idEquipamento = ?",
                [id]
            );

            if (!old) {
                return res
                    .status(404)
                    .send({ error: "Equipamento não encontrado" });
            }

            if (newFile && old.imagemEquipamento) {
                const fs = require("fs");
                const path = require("path");
                const filePath = path.join(
                    __dirname,
                    "src/images/uploads",
                    old.imagemEquipamento
                );
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            const queryFields = [];
            const queryValues = [];

            if (newFile) {
                queryFields.push("imagemEquipamento = ?");
                queryValues.push(newFile);
            }
            if (nome !== undefined) {
                queryFields.push("nomeEquipamento = ?");
                queryValues.push(nome);
            }
            if (codigo !== undefined) {
                queryFields.push("codEquipamento = ?");
                queryValues.push(codigo);
            }
            if (altoValor !== undefined) {
                queryFields.push("altoValor = ?");
                queryValues.push(altoValor == "true" ? 1 : 0);
            }
            if (areaId !== undefined) {
                queryFields.push("idArea = ?");
                queryValues.push(areaId);
            }

            queryValues.push(id);

            const sql = `UPDATE tbEquipamentos SET ${queryFields.join(
                ", "
            )} WHERE idEquipamento = ?`;

            await query(sql, queryValues);

            res.status(200).send({
                message: "Equipamento atualizado com sucesso",
            });
        } catch (err) {
            console.error("Erro no MySQL: ", err);
            res.status(500).send({
                error: "Erro ao tentar atualizar equipamento",
            });
        }
    }
);

app.put("/emprestimos/:id", requireLogin, async (req, res) => {
    const { id } = req.params;
    const { idEquipamento, recebimento, devolucao, local, idMembro, obs } = req.body;

    try {
        const emprestimoExistente = await query(
            "SELECT * FROM tbEmprestimos WHERE idEmprestimo = ?",
            [id]
        );

        if (emprestimoExistente.length === 0) {
            return res.status(404).send({ message: "Empréstimo não encontrado" });
        }

        await query(
            `UPDATE tbEmprestimos
             SET idEquipamento = ?, dataRecebimento = ?, dataDevolucao = ?, localUso = ?, idMembro = ?, infoReserva = ?
             WHERE idEmprestimo = ?`,
            [idEquipamento, recebimento, devolucao, local, idMembro, obs || null, id]
        );

        res.status(200).send({ message: "Empréstimo atualizado com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar empréstimo:", err);
        res.status(500).send({ message: "Erro ao atualizar empréstimo.", error: err });
    }
});

// DELETE

app.delete("/areas/:id", requireLogin, async (req, res) => {
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

app.delete("/equipe/:id", requireLogin, async (req, res) => {
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

app.delete("/equipamentos/:id", requireLogin, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query(
            "SELECT imagemEquipamento FROM tbEquipamentos WHERE idEquipamento = ?",
            [id]
        );

        if (result.length === 0)
            res.status(500).send({
                message: "Equipamento com este não existe",
            });

        const imagemNome = result[0].imagemEquipamento;

        await query(`DELETE FROM tbEmprestimos WHERE idEquipamento = ?;`, [id]);
        await query(`DELETE FROM tbEquipamentos WHERE idEquipamento = ?;`, [
            id,
        ]);

        const imagePath = path.join(
            __dirname,
            "src/images/uploads",
            imagemNome
        );

        fs.unlink(imagePath, (err) => {
            if (err)
                res.status(500).send({
                    message: "Erro ao tentar deletar a imagem!",
                });
        });

        res.status(200).send({ message: "Equipamento deletado com sucesso!" });
    } catch (err) {
        console.error("Erro no MySQL ou ao tentar deletar a imagem: ", err);
        res.status(500).send({ message: "Erro ao deletar o equipamento." });
    }
});

app.delete("/emprestimos/:id", requireLogin, async (req, res) => {
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
