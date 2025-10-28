const connection = require("./models/db");

const util = require("util");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const dayjs = require("dayjs");
const multer = require("multer");

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
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Formato Inválido"));
    }
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

app.get("/equipamentos/search/:page", async (req, res) => {
    const { page } = req.params;
    const { q } = req.query;

    const itensPerPage = 8;
    const offset = (parseInt(page) - 1) * itensPerPage;

    try {
        const result = await query(
            "SELECT * FROM tbEquipamentos WHERE nomeEquipamento LIKE ? OR codEquipamento LIKE ? ORDER BY idEquipamento DESC LIMIT ?, ?",
            [`%${q}%`, `%${q}%`, offset, itensPerPage]
        );

        const result2 = await query(
            "SELECT COUNT(*) AS totalItens FROM tbEquipamentos WHERE nomeEquipamento LIKE ? OR codEquipamento LIKE ?",
            [`%${q}%`, `%${q}%`]
        );

        res.status(200).send({ result, result2 });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar buscar equipamentos no banco de dados",
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
                AND e.dataDevolvido IS NULL
                AND e.dataRecebimento <= NOW()
            `;
        } else {
            whereClauses.push(`NOT EXISTS (
            SELECT 1
            FROM tbEmprestimos emp
            WHERE emp.idEquipamento = tbEquipamentos.idEquipamento
            AND emp.dataDevolvido IS NULL
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

app.get("/emprestimos/search/:page", async (req, res) => {
    const { page } = req.params;
    const { q } = req.query;
    const itensPerPage = 8;
    const offset = (parseInt(page) - 1) * itensPerPage;

    try {
        const searchTerm = `%${q}%`;

        const sql = `
            SELECT e.*, eq.nomeEquipamento, eq.codEquipamento, eq.altoValor, m.nomeMembro
            FROM tbEmprestimos e
            JOIN tbEquipamentos eq ON e.idEquipamento = eq.idEquipamento
            JOIN tbEquipe m ON e.idMembro = m.idMembro
            WHERE m.nomeMembro LIKE ? 
               OR eq.nomeEquipamento LIKE ? 
               OR eq.codEquipamento LIKE ? 
               OR e.localUso LIKE ?
            ORDER BY e.idEmprestimo DESC
            LIMIT ?, ?
        `;

        const sqlCount = `
            SELECT COUNT(*) AS totalItens
            FROM tbEmprestimos e
            JOIN tbEquipamentos eq ON e.idEquipamento = eq.idEquipamento
            JOIN tbEquipe m ON e.idMembro = m.idMembro
            WHERE m.nomeMembro LIKE ? 
               OR eq.nomeEquipamento LIKE ? 
               OR eq.codEquipamento LIKE ? 
               OR e.localUso LIKE ?
        `;

        const result = await query(sql, [
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            offset,
            itensPerPage,
        ]);
        const result2 = await query(sqlCount, [
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
        ]);

        res.status(200).send({ result, result2 });
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao buscar empréstimos no banco de dados",
        });
    }
});

app.get("/emprestimos/equipamento/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query(
            "SELECT * FROM tbEmprestimos WHERE idEquipamento = ? AND dataDevolvido IS NULL AND dataRecebimento <= NOW()",
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
            "SELECT * FROM tbEmprestimos WHERE dataDevolucao > NOW() AND dataDevolvido IS NULL"
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
            "SELECT * FROM tbEmprestimos WHERE dataDevolucao >= CURDATE() AND dataDevolucao < NOW();"
        );
        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar pegar os empréstimos próximos.",
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

app.post("/avisos", async (req, res) => {
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

app.post("/equipamentos", upload.single("imagem"), (req, res) => {
    console.log(req.body);
    console.log(req.file);
    res.status(200).send();
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

app.delete("/emprestimos/:id", async (req, res) => {
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
