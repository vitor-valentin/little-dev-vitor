const connection = require("./models/db");

const util = require("util");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const dayjs = require("dayjs");
const multer = require("multer");
const fs = require("fs");
const puppeteer = require("puppeteer");

const saltRounds = 10;
const itensPerPage = 8;
const INTERVAL = 10 * 60 * 1000;

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

const SEEN_FILE = "./seenNotifications.json";

let seenData = {};
if (fs.existsSync(SEEN_FILE)) {
    seenData = JSON.parse(fs.readFileSync(SEEN_FILE, "utf-8"));
}

app.use(express.json());
app.use(cookieParser());

function saveSeen() {
    fs.writeFileSync(SEEN_FILE, JSON.stringify(seenData, null, 2));
}

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

async function gerarPdf(req, res, filter = {}) {
    try {
        const userToken = req.cookies?.userToken;

        const filterParam = encodeURIComponent(JSON.stringify(filter));
        const url = `http://localhost:8080/relatorio?filter=${filterParam}`;

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.setCookie({
            name: "userToken",
            value: userToken,
            domain: "localhost", 
            path: "/"
        });

        await page.goto(url, {
            waitUntil: "networkidle0",
        });

        const css = fs.readFileSync(
            path.join(__dirname, "src/css/relatorios.css"),
            "utf-8"
        );
        await page.addStyleTag({ content: css });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
        });

        await browser.close();

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="relatorio.pdf"`,
            "Content-Length": pdfBuffer.length,
        });
        res.send(pdfBuffer);
    } catch (err) {
        console.error("Erro ao gerar PDF: ", err);
        res.status(500).send(err);
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

async function getUserId(token) {
    const res = await query(
        "SELECT idMembro FROM tbEquipe WHERE tokenAcesso = ?",
        [token]
    );
    return res[0].idMembro;
}

async function getUserConfig(id) {
    const res = await query("SELECT * FROM tbConfig WHERE idUsuario = ?", [id]);
    return res[0];
}

async function verificarEmprestimos() {
    console.log(`[AVISOS] Verificando empréstimos...`);

    try {
        const rows = await query(`
            SELECT e.idEmprestimo, e.idMembro, e.idEquipamento,
                   e.dataDevolucao, e.dataDevolvido,
                   eq.nomeEquipamento
            FROM tbEmprestimos e
            JOIN tbEquipamentos eq ON e.idEquipamento = eq.idEquipamento
            WHERE e.dataDevolvido = '1900-01-01 01:01:01'
        `);

        const agora = new Date();

        for (const emp of rows) {
            const devolucao = new Date(emp.dataDevolucao);
            const diffHoras = (devolucao - agora) / 36e5;

            if (diffHoras <= 1 && diffHoras >= 0) {
                const msg = JSON.stringify({
                    type: 1,
                    msg: `O empréstimo do equipamento: ${emp.nomeEquipamento} acabará em uma hora!`
                });

                await registrarAviso( msg);
            }

            if (diffHoras < 0) {
                const msg = JSON.stringify({
                    type: 2,
                    msg: `O empréstimo do equipamento: ${emp.nomeEquipamento} está atrasado para devolução!`
                });

                await registrarAviso(emp.idMembro, msg);
            }
        }
    } catch (err) {
        console.error(`[ERRO AO VERIFICAR AVISOS]`, err);
    }
}

async function registrarAviso(idUsuario, mensagemAviso) {
    const existe = await query(`
        SELECT idAviso FROM tbAvisos
        WHERE idUsuario = ? AND mensagemAviso = ?
        AND dataAviso >= (NOW() - INTERVAL 24 HOUR)
        LIMIT 1
    `, [idUsuario, mensagemAviso]);

    if (existe.length > 0) return;

    await query(`
        INSERT INTO tbAvisos (avisoSistema, idUsuario, mensagemAviso, dataAviso)
        VALUES (1, ?, ?, NOW())
    `, [idUsuario, mensagemAviso]);

    console.log(`[AVISO CRIADO] ${mensagemAviso}`);
}

setInterval(verificarEmprestimos, INTERVAL);
verificarEmprestimos();

// GET

mainRoutes.forEach((route) => {
    app.get(route, requireLogin, async (req, res) => {
        res.sendFile(path.join(__dirname, "src", "index.html"));
    });
});

app.get("/relatorio", requireLogin, async (req, res) => {
    try {
        let filter = {};
        if (req.query.filter) {
            try {
                filter = JSON.parse(decodeURIComponent(req.query.filter));
            } catch (e) {
                console.log("Erro ao parsear filtro:", e);
            }
        }

        const { dateI, dateF, eqId, mbId, altoV, devA } = filter;

        let sql = `
            SELECT 
                e.nomeEquipamento,
                e.codEquipamento,
                e.altoValor,
                DATE_FORMAT(em.dataRecebimento, '%d/%m/%Y %H:%i') AS dataRecebimento,
                DATE_FORMAT(em.dataDevolucao, '%d/%m/%Y %H:%i') AS dataDevolucao,
                DATE_FORMAT(em.dataDevolvido, '%d/%m/%Y %H:%i') AS dataDevolvido,
                m.nomeMembro AS recebidoPor,
                em.localUso,
                em.infoReserva AS obs,
                em.devolvidoPor,
                mv.nomeMembro AS vistoriadoPor,
                em.obsVistoria
            FROM tbEmprestimos em
            JOIN tbEquipamentos e ON em.idEquipamento = e.idEquipamento
            JOIN tbEquipe m ON em.idMembro = m.idMembro
            LEFT JOIN tbEquipe mv ON em.idMembroVistoria = mv.idMembro
            WHERE dataDevolvido <> '1900-01-01 01:01:01'
        `;

        const params = [];

        if (dateI && dateI.trim() !== "") {
            sql += " AND em.dataDevolucao >= ?";
            params.push(dateI);
        }

        if (dateF && dateF.trim() !== "") {
            sql += " AND em.dataDevolucao <= ?";
            params.push(dateF);
        }

        if (eqId !== null && eqId !== "" && eqId !== undefined) {
            sql += " AND em.idEquipamento = ?";
            params.push(eqId);
        }

        if (mbId !== null && mbId !== "" && mbId !== undefined) {
            sql += " AND em.idMembro = ?";
            params.push(mbId);
        }

        if (altoV === true) {
            sql += " AND e.altoValor = 1";
        }

        if (devA === true) {
            sql += " AND em.dataDevolvido > em.dataDevolucao";
        }

        const rows = await query(sql, params);

        let html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link href="/css/relatorios.css" type="text/css" rel="stylesheet" />
                <title>SIGEQ</title>
            </head>
            <body>
                <header>
                    <img src="/images/logo_azul.png" />
                    <img class="senai" src="/images/sistema_fiep_senai.png" />
                </header>
                <div class="title">
                    <h2>Relatório de Empréstimos</h2>
                    <p>Período: ${
                        dateI && dateF
                            ? dateI + " - " + dateF
                            : "Todos os registros"
                    }</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Equipamento</th>
                            <th>Código</th>
                            <th>Alto Valor</th>
                            <th>Rec.</th>
                            <th>Dev. Prev.</th>
                            <th>Dev. Real</th>
                            <th>Recebido Por</th>
                            <th>Local</th>
                            <th>Obs</th>
                            <th>Devolvido Por</th>
                            <th>Vistoriado Por</th>
                            <th>Obs Vistoria</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        const obsCompletas = [];

        rows.forEach((r, index) => {
            let obsVistoriaCurta = r.obsVistoria || "";
            const pos = obsVistoriaCurta.indexOf("Observações do Usuário:");
            if (pos !== -1) {
                obsVistoriaCurta = obsVistoriaCurta
                    .slice(pos + "Observações do Usuário:".length)
                    .trim();
            }

            html += `
                <tr>
                    <td>${r.nomeEquipamento}</td>
                    <td>${r.codEquipamento}</td>
                    <td>${r.altoValor ? "Sim" : "Não"}</td>
                    <td>${r.dataRecebimento}</td>
                    <td>${r.dataDevolucao}</td>
                    <td>${r.dataDevolvido}</td>
                    <td>${r.recebidoPor}</td>
                    <td>${r.localUso}</td>
                    <td>${r.obs || ""}</td>
                    <td>${r.devolvidoPor}</td>
                    <td>${r.vistoriadoPor || ""}</td>
                    <td>${obsVistoriaCurta}</td>
                </tr>
            `;

            obsCompletas.push(r.obsVistoria || "");
        });

        html += `
                    </tbody>
                </table>
        `;

        html += `
            <div class="title">
                <h2>Observações Completas</h2>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Posição</th>
                        <th>Obs Vistoria</th>
                    </tr>
                </thead>
                <tbody>
        `;

        obsCompletas.forEach((obs, i) => {
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${obs}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            </body>
            </html>
        `;

        res.send(html);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao gerar relatório");
    }
});

app.get("/relatorio/emitir", requireLogin, async (req, res) => {
    let filter = {};
    if (req.query.filter) {
        try {
            filter = JSON.parse(decodeURIComponent(req.query.filter));
        } catch (e) {
            console.log("Erro ao parsear filtro:", e);
        }
    }

    gerarPdf(req, res, filter);
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

app.get("/config/:id", requireLogin, async (req, res) => {
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

app.get("/areas/:page", requireLogin, async (req, res) => {
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

app.get("/areas/search/:page", requireLogin, async (req, res) => {
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

app.get("/areas/find/:id", requireLogin, async (req, res) => {
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

app.get("/equipe/filter/:page", requireLogin, async (req, res) => {
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

app.get("/equipe/find/:id", requireLogin, async (req, res) => {
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

app.get("/equipe/get-count", requireLogin, async (req, res) => {
    try {
        const result = await query(
            "SELECT COUNT(*) AS totalItens FROM tbEquipe"
        );

        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar buscar equipamentos no banco de dados",
        });
    }
});

app.get("/equipamentos/filter/:page", requireLogin, async (req, res) => {
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

app.get("/equipamentos/find/:id", requireLogin, async (req, res) => {
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

app.get("/equipamentos/emuso", requireLogin, async (req, res) => {
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

app.get("/equipamentos/get-count", requireLogin, async (req, res) => {
    try {
        const result = await query(
            "SELECT COUNT(*) AS totalItens FROM tbEquipamentos"
        );

        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send({
            message: "Erro ao tentar buscar equipamentos no banco de dados",
        });
    }
});

app.get("/emprestimos/filter/:page", requireLogin, async (req, res) => {
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
        whereClauses.push(`em.datadevolucao >= ?`);
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

app.get("/emprestimos/find/:id", requireLogin, async (req, res) => {
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

app.get("/emprestimos/equipamento/:id", requireLogin, async (req, res) => {
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

app.get("/emprestimos/vencidos", requireLogin, async (req, res) => {
    try {
        const result = await query(
            "SELECT * FROM tbEmprestimos WHERE dataDevolucao < NOW() AND dataDevolvido = '1900-01-01 01:01:01'"
        );
        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL:", err);
        res.status(500).send({
            message: "Erro ao tentar pegar os emprestimos vencidos.",
        });
    }
});

app.get("/emprestimos/proximos", requireLogin, async (req, res) => {
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

app.get("/emprestimos/mes", requireLogin, async (req, res) => {
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

app.get("/emprestimos/ultimos", requireLogin, async (req, res) => {
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

app.get("/emprestimos/atrasados", requireLogin, async (req, res) => {
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

app.get("/avisos/equipe", requireLogin, async (req, res) => {
    try {
        const config = await getUserConfig(
            await getUserId(req.cookies.userToken)
        );
        const result = await query(
            "SELECT * FROM tbAvisos WHERE avisoSistema = ? AND dataAviso > DATE_SUB(CURRENT_DATE, INTERVAL ? DAY) ORDER BY idAviso DESC",
            [false, config.tempoAvisos]
        );

        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send(err);
    }
});

app.get("/avisos/sistema", requireLogin, async (req, res) => {
    try {
        const config = await getUserConfig(
            await getUserId(req.cookies.userToken)
        );
        const result = await query(
            "SELECT * FROM tbAvisos WHERE avisoSistema = ? AND dataAviso > DATE_SUB(CURRENT_DATE, INTERVAL ? DAY) ORDER BY idAviso DESC",
            [true, config.tempoAvisos]
        );

        res.status(200).send(result);
    } catch (err) {
        console.error("Erro no MySql: ", err);
        res.status(500).send(err);
    }
});

app.get("/notifications", requireLogin, async (req, res) => {
    const userId = await getUserId(req.cookies.userToken);
    const config = await getUserConfig(userId);

    const param = config.notificacoesSistema == true ? "%%" : '{"type": 2%';

    const sysNotifications = await query(
        "SELECT * FROM tbAvisos WHERE avisoSistema = 1 AND mensagemAviso LIKE ? ORDER BY idAviso DESC",
        [param]
    );
    const eqNotifications = await query(
        "SELECT * FROM tbAvisos WHERE avisoSistema = 0 AND idUsuario <> ?",
        [userId]
    );

    const notifications = sysNotifications.concat(eqNotifications);

    const seen = seenData[userId] || [];

    const unseen = notifications.filter(
        (n) => !seen.includes(String(n.idAviso))
    );

    res.status(200).json(unseen);
});

// POST

app.post("/check-use", async (req, res) => {
    const { idEquipamento, reservas } = req.body;

    if (!idEquipamento || !Array.isArray(reservas) || reservas.length === 0) {
        return res.status(400).json({ error: "Dados inválidos." });
    }

    try {
        const parsedReservas = reservas.map(([start, end]) => [
            new Date(start.replace(" ", "T")),
            new Date(end.replace(" ", "T")),
        ]);

        const q = `
            SELECT dataRecebimento, dataDevolucao
            FROM tbEmprestimos
            WHERE idEquipamento = ?
            AND dataDevolvido = '1900-01-01 01:01:01'
        `;
        const existing = await query(q, [idEquipamento]);

        for (let [newStart, newEnd] of parsedReservas) {
            for (let row of existing) {
                const existingStart = new Date(row.dataRecebimento);
                const existingEnd = new Date(row.dataDevolucao);

                const overlap =
                    newStart < existingEnd && newEnd > existingStart;

                if (overlap) {
                    return res.status(500).json({
                        error: "Conflito detectado.",
                        detalhes: {
                            requisitado: [newStart, newEnd],
                            conflitoCom: [existingStart, existingEnd],
                        },
                    });
                }
            }
        }

        res.status(200).send();
    } catch (err) {
        console.error("Erro ao checar uso de equipamento: ", err);
        res.status(500).send(err);
    }
});

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
    const params = [
        idEquipamento,
        recebimento,
        devolucao,
        "1900-01-01 01:01:01",
        idMembro,
        local,
        "NOT-SET",
    ];
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

app.post("/emprestimos/agendar", requireLogin, async (req, res) => {
    const { idEquipamento, datas, idMembro, local, obs } = req.body;

    if (!Array.isArray(datas) || datas.length === 0) {
        return res.status(400).send({ error: "Datas inválidas." });
    }

    const baseDevolvido = "1900-01-01 01:01:01";
    const devolvidoPor = "NOT-SET";

    try {
        for (const [recebimento, devolucao] of datas) {
            const params = [
                idEquipamento,
                recebimento,
                devolucao,
                baseDevolvido,
                idMembro,
                local,
                devolvidoPor,
            ];

            let sqlCols =
                "(idEquipamento, dataRecebimento, dataDevolucao, dataDevolvido, idMembro, localUso, devolvidoPor";
            let sqlVals = "?, ?, ?, ?, ?, ?, ?";

            if (obs && obs.trim() !== "") {
                sqlCols += ", infoReserva";
                sqlVals += ", ?";
                params.push(obs);
            }

            sqlCols += ")";

            await query(
                `INSERT INTO tbEmprestimos ${sqlCols} VALUES (${sqlVals})`,
                params
            );
        }
        res.status(200).send({ message: "Registros inseridos com sucesso!" });
    } catch (err) {
        console.error("Erro no MySQL:", err);
        res.status(500).send({
            error: "Erro ao tentar cadastrar múltiplos registros",
        });
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

app.post("/notifications/seen", requireLogin, async (req, res) => {
    const userId = await getUserId(req.cookies.userToken);
    const { id } = req.body;
    try {
        if (!seenData[userId]) seenData[userId] = [];
        if (!seenData[userId].includes(String(id))) {
            seenData[userId].push(String(id));
            saveSeen();
        }

        res.status(200).send();
    } catch (err) {
        console.error("Erro ao marcar notificação como vista: ", err);
        res.status(500).send(err);
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

app.put("/equipe/:id", requireLogin, async (req, res) => {
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
    const { idEquipamento, recebimento, devolucao, local, idMembro, obs } =
        req.body;

    try {
        const emprestimoExistente = await query(
            "SELECT * FROM tbEmprestimos WHERE idEmprestimo = ?",
            [id]
        );

        if (emprestimoExistente.length === 0) {
            return res
                .status(404)
                .send({ message: "Empréstimo não encontrado" });
        }

        await query(
            `UPDATE tbEmprestimos
             SET idEquipamento = ?, dataRecebimento = ?, dataDevolucao = ?, localUso = ?, idMembro = ?, infoReserva = ?
             WHERE idEmprestimo = ?`,
            [
                idEquipamento,
                recebimento,
                devolucao,
                local,
                idMembro,
                obs || null,
                id,
            ]
        );

        res.status(200).send({ message: "Empréstimo atualizado com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar empréstimo:", err);
        res.status(500).send({
            message: "Erro ao atualizar empréstimo.",
            error: err,
        });
    }
});

app.put("/vistoria", requireLogin, async (req, res) => {
    const { id, dataDevolvido, devolvidoPor, userId, allObs } = req.body;

    try {
        await query(
            "UPDATE tbEmprestimos SET dataDevolvido = ?, devolvidoPor = ?, idMembroVistoria = ?, obsVistoria = ? WHERE idEmprestimo = ?",
            [dataDevolvido, devolvidoPor, userId, allObs, id]
        );
        res.status(200).send();
    } catch (err) {
        console.error("Erro no MySQL: ", err);
        res.status(500).send(err);
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
                message: "Equipamento com este id não existe",
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
