const params = new URLSearchParams(window.location.search);
const page = params.get("page");

if (!page || page == 1) {
    const eqUso = document.getElementById("eq-uso");
    const epVen = document.getElementById("ep-ven");
    const eqReg = document.getElementById("eq-reg");
    const mbReg = document.getElementById("mb-reg");
    const epMes = document.getElementById("ep-mes");
    const epProx = document.getElementById("ep-prox");

    function formatDate(isoDateString) {
        if (!isoDateString) return "";
        const date = new Date(isoDateString);
        return date.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
        });
    }

    function getTodayAndTomorrow() {
        const today = new Date();
        today.setDate(today.getDate());

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const format = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        return {
            today: format(today),
            tomorrow: format(tomorrow),
        };
    }

    const resUso = await fetch("http://localhost:8080/equipamentos/emuso");
    const usoJson = await resUso.json();

    eqUso.textContent = usoJson.length;

    const resVen = await fetch("http://localhost:8080/emprestimos/vencidos");
    const venJson = await resVen.json();

    epVen.textContent = venJson.length;

    const resEq = await fetch("http://localhost:8080/equipamentos/get-count");
    const eqJson = await resEq.json();

    eqReg.textContent = eqJson[0].totalItens;

    const resMb = await fetch("http://localhost:8080/equipe/get-count");
    const mbJson = await resMb.json();

    mbReg.textContent = mbJson[0].totalItens;

    const resMes = await fetch("http://localhost:8080/emprestimos/mes");
    const mesJson = await resMes.json();

    epMes.textContent = mesJson.length;

    const resProx = await fetch("http://localhost:8080/emprestimos/proximos");
    const proxJson = await resProx.json();

    epProx.textContent = proxJson.length;

    const tbUltimosEmprestimos = document.getElementById(
        "tbUltimosEmprestimos"
    );
    const tbEmprestimosVencidos = document.getElementById(
        "tbEmprestimosVencidos"
    );
    const tbEmprestimosProximos = document.getElementById(
        "tbEmprestimosProximos"
    );

    let count = 0;

    proxJson.forEach(async (emp) => {
        const tr = document.createElement("tr");

        for (let i = 0; i < 4; i++) {
            const td = document.createElement("td");

            switch (i) {
                case 0:
                    const res = await fetch(
                        `http://localhost:8080/equipamentos/find/${emp.idEquipamento}`
                    );
                    const json = await res.json();

                    td.textContent = json[0].nomeEquipamento;
                    break;
                case 1:
                    td.textContent = formatDate(emp.dataRecebimento);
                    break;
                case 2:
                    td.textContent = formatDate(emp.dataDevolucao);
                    break;
                case 3:
                    const resMb = await fetch(
                        `http://localhost:8080/equipe/find/${emp.idMembro}`
                    );
                    const jsonMb = await resMb.json();

                    td.textContent = jsonMb[0].nomeMembro;
                    break;
            }

            tr.appendChild(td);
        }

        count++;
        tbEmprestimosProximos.querySelector("tbody").appendChild(tr);
        if (count == 5) return;
    });

    tbEmprestimosProximos.parentElement
        .querySelector(".ver-mais")
        .addEventListener("click", () => {
            const params = new URLSearchParams(window.location.search);
            const baseUrl = "http://localhost:8080/emprestimos";

            const { today, tomorrow } = getTodayAndTomorrow();

            params.set(
                "filter",
                JSON.stringify({
                    areaId: null,
                    eqId: null,
                    membroId: null,
                    checkV: false,
                    checkA: false,
                    selectValue: "todos",
                    dateI: today,
                    dateF: tomorrow,
                })
            );

            const finalUrl = `${baseUrl}?${params.toString()}`;

            window.location.href = finalUrl;
        });

    const resAtrasados = await fetch(
        "http://localhost:8080/emprestimos/atrasados"
    );
    const jsonAtrasados = await resAtrasados.json();

    jsonAtrasados.forEach(async (emp) => {
        const tr = document.createElement("tr");

        for (let i = 0; i < 3; i++) {
            const td = document.createElement("td");

            switch (i) {
                case 0:
                    const res = await fetch(
                        `http://localhost:8080/equipamentos/find/${emp.idEquipamento}`
                    );
                    const json = await res.json();

                    td.textContent = json[0].nomeEquipamento;
                    break;
                case 1:
                    td.textContent = formatDate(emp.dataDevolucao);
                    break;
                case 2:
                    const resMb = await fetch(
                        `http://localhost:8080/equipe/find/${emp.idMembro}`
                    );
                    const jsonMb = await resMb.json();

                    td.textContent = jsonMb[0].nomeMembro;
                    break;
            }

            tr.appendChild(td);
        }

        tbEmprestimosVencidos.querySelector("tbody").appendChild(tr);
    });

    tbEmprestimosVencidos.parentElement
        .querySelector(".ver-mais")
        .addEventListener("click", () => {
            const params = new URLSearchParams(window.location.search);
            const baseUrl = "http://localhost:8080/emprestimos";

            params.set(
                "filter",
                JSON.stringify({
                    areaId: null,
                    eqId: null,
                    membroId: null,
                    checkV: false,
                    checkA: true,
                    selectValue: "todos",
                    dateI: "",
                    dateF: "",
                })
            );

            const finalUrl = `${baseUrl}?${params.toString()}`;

            window.location.href = finalUrl;
        });

    const resUltimos = await fetch("http://localhost:8080/emprestimos/ultimos");
    const jsonUltimos = await resUltimos.json();

    jsonUltimos.forEach(async (emp) => {
        const tr = document.createElement("tr");

        for (let i = 0; i < 4; i++) {
            const td = document.createElement("td");

            switch (i) {
                case 0:
                    const res = await fetch(
                        `http://localhost:8080/equipamentos/find/${emp.idEquipamento}`
                    );
                    const json = await res.json();

                    td.textContent = json[0].nomeEquipamento;
                    break;
                case 1:
                    td.textContent = formatDate(emp.dataRecebimento);
                    break;
                case 2:
                    td.textContent = formatDate(emp.dataDevolvido);
                    break;
                case 3:
                    const resMb = await fetch(
                        `http://localhost:8080/equipe/find/${emp.idMembro}`
                    );
                    const jsonMb = await resMb.json();

                    td.textContent = jsonMb[0].nomeMembro;
                    break;
            }

            tr.appendChild(td);
        }

        tbUltimosEmprestimos.querySelector("tbody").appendChild(tr);
    });

    tbUltimosEmprestimos.parentElement
        .querySelector(".ver-mais")
        .addEventListener("click", () => {
            const params = new URLSearchParams(window.location.search);
            const baseUrl = "http://localhost:8080/emprestimos";

            params.set(
                "filter",
                JSON.stringify({
                    areaId: null,
                    eqId: null,
                    membroId: null,
                    checkV: false,
                    checkA: false,
                    selectValue: "finalizados",
                    dateI: "",
                    dateF: "",
                })
            );

            const finalUrl = `${baseUrl}?${params.toString()}`;

            window.location.href = finalUrl;
        });
} else {
    async function loadAvisosEquipe() {
        const avisosEquipe = document.querySelector(".avisos-wrapper");
        const avisosDots = document.querySelector(".avisos-container .dots");
        const res = await fetch("http://localhost:8080/avisos/equipe");
        const json = await res.json();
        const darkMode = await checkModoEscuro();

        const arrowLeft = document.createElement("img");
        arrowLeft.classList.add("arrow");
        arrowLeft.classList.add("left");
        arrowLeft.src = !darkMode ? "../images/buttonMove.png" : "../images/buttonMove_dark.png";

        avisosEquipe.appendChild(arrowLeft);

        for (const [index, aviso] of json.entries()) {
            const div = document.createElement("div");
            div.classList.add("aviso");

            const dot = document.createElement("dot");
            dot.classList.add("dot");

            if (index == 0) {
                div.classList.add("active");
                dot.classList.add("active");
            }

            const img = document.createElement("img");
            img.classList.add("user-icon");
            img.src = !darkMode ? "../images/userAzul.png" : "../images/userAzul_dark.png";

            const avisoText = document.createElement("div");
            avisoText.classList.add("aviso-text");

            const resMembro = await fetch(
                `http://localhost:8080/equipe/find/${aviso.idUsuario}`
            );
            const jsonMembro = await resMembro.json();

            const strong = document.createElement("strong");
            strong.textContent = jsonMembro[0].nomeMembro;

            const p = document.createElement("p");
            p.textContent = aviso.mensagemAviso;

            avisoText.appendChild(strong);
            avisoText.appendChild(p);

            div.appendChild(img);
            div.appendChild(avisoText);

            avisosEquipe.appendChild(div);
            avisosDots.appendChild(dot);
        }

        const arrowRight = document.createElement("img");
        arrowRight.classList.add("arrow");
        arrowRight.classList.add("right");
        arrowRight.src = !darkMode ? "../images/buttonMove.png" : "../images/buttonMove_dark.png";

        avisosEquipe.appendChild(arrowRight);
    }

    async function loadAvisosSistema() {
        const sistemaNotificacoes = document.getElementById("notificacoes");
        const sistemaAlertas = document.getElementById("alertas");

        const navNotificacoes =
            sistemaNotificacoes.querySelector(".navegacao .dots");
        const navAlertas = sistemaAlertas.querySelector(".navegacao .dots");

        const res = await fetch("http://localhost:8080/avisos/sistema");
        const json = await res.json();

        function createSlide() {
            const slide = document.createElement("div");
            slide.classList.add("notificacoes-slide");
            return slide;
        }

        let slideNot = createSlide();
        let slideAlert = createSlide();
        let countNot = 0;
        let countAlert = 0;

        for (const aviso of json) {
            const msg = JSON.parse(aviso.mensagemAviso);

            const not = document.createElement("div");
            not.classList.add("notificacao");

            const strong = document.createElement("strong");
            strong.textContent = "SISTEMA";

            const p = document.createElement("p");
            p.textContent = msg.msg;

            const tempo = document.createElement("span");
            tempo.classList.add("tempo");

            const dataAviso = new Date(aviso.dataAviso);

            const now = new Date();
            const diffMs = now - dataAviso; 

            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            let displayText = "";

            if (diffMinutes < 1) {
                displayText = "NOW";
            } else if (diffHours < 1) {
                displayText = diffMinutes + " MIN";
            } else if (diffDays < 1) {
                displayText = diffHours + "H";
            } else {
                displayText = diffDays + "D";
            }

            tempo.textContent = displayText;

            not.appendChild(strong);
            not.appendChild(p);
            not.appendChild(tempo);

            if (msg.type == 1) {
                if (countNot % 4 === 0 && countNot !== 0) {
                    sistemaNotificacoes.insertBefore(
                        slideNot,
                        sistemaNotificacoes.querySelector(".navegacao")
                    );
                    slideNot = createSlide();
                }

                slideNot.appendChild(not);
                countNot++;
            } else {
                if (countAlert % 4 === 0 && countAlert !== 0) {
                    sistemaAlertas.insertBefore(
                        slideAlert,
                        sistemaAlertas.querySelector(".navegacao")
                    );
                    slideAlert = createSlide();
                }

                slideAlert.appendChild(not);
                countAlert++;
            }
        }

        if (countNot > 0)
            sistemaNotificacoes.insertBefore(
                slideNot,
                sistemaNotificacoes.querySelector(".navegacao")
            );
        if (countAlert > 0)
            sistemaAlertas.insertBefore(
                slideAlert,
                sistemaAlertas.querySelector(".navegacao")
            );

        for (let i = 0; i < Math.ceil(countNot / 4); i++) {
            const dot = document.createElement("span");
            dot.classList.add("dot");
            if (i === 0) dot.classList.add("active");
            navNotificacoes.appendChild(dot);
        }

        for (let i = 0; i < Math.ceil(countAlert / 4); i++) {
            const dot = document.createElement("span");
            dot.classList.add("dot");
            if (i === 0) dot.classList.add("active");
            navAlertas.appendChild(dot);
        }

        const firstNot = sistemaNotificacoes.querySelector(
            ".notificacoes-slide"
        );
        const firstAlert = sistemaAlertas.querySelector(".notificacoes-slide");

        if (firstNot) firstNot.classList.add("active");
        if (firstAlert) firstAlert.classList.add("active");
    }

    function iniciarCarrossel(containerSelector, options = {}) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        const slides = container.querySelectorAll(
            ".aviso, .notificacoes-slide"
        );

        let dots;
        if (containerSelector == ".avisos-wrapper") {
            dots = document.querySelector(".dots").querySelectorAll(".dot");
        } else {
            dots = container.querySelectorAll(".dot");
        }
        const left = container.querySelector(".arrow.left, .move.left");
        const right = container.querySelector(".arrow.right, .move.right");

        let index = 0;

        function showSlide(n) {
            slides.forEach((s) => s.classList.remove("active"));
            dots.forEach((d) => d.classList.remove("active"));

            if (slides[n]) slides[n].classList.add("active");
            if (dots[n]) dots[n].classList.add("active");
        }

        if (left) {
            left.addEventListener("click", () => {
                index = (index - 1 + slides.length) % slides.length;
                showSlide(index);
            });
        }

        if (right) {
            right.addEventListener("click", () => {
                index = (index + 1) % slides.length;
                showSlide(index);
            });
        }

        dots.forEach((dot, i) => {
            dot.addEventListener("click", () => {
                index = i;
                showSlide(index);
            });
        });

        showSlide(index);
    }

    await loadAvisosEquipe();
    await loadAvisosSistema();

    iniciarCarrossel(".avisos-wrapper");
    iniciarCarrossel("#notificacoes");
    iniciarCarrossel("#alertas");
}
