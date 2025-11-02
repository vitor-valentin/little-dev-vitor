document.addEventListener("DOMContentLoaded", async () => {
    const sidebarPromise = fetch("/components/sidebar.html")
        .then((res) => res.text())
        .then((html) => {
            document.getElementById("sidebar-container").innerHTML = html;
        });

    const headerPromise = fetch("/components/header.html")
        .then((res) => res.text())
        .then((html) => {
            document.getElementById("headerContent-container").innerHTML = html;
        });

    window.componentsLoaded = Promise.all([sidebarPromise, headerPromise]);

    if (await checkDaltonismo()) {
        const root = document.documentElement;
        root.style.setProperty("--cor-not-sucesso", "#00B7C2");
        root.style.setProperty("--cor-not-falha", "#7B1FA2");
        root.style.setProperty("--cor-not-alerta", "#FFB300");
    }

    if (await checkModoEscuro()) {
        const root = document.documentElement;
        root.style.setProperty("--cor-fundo", "#1E242C");
        root.style.setProperty("--cor-caixas", "#2E3540");
        root.style.setProperty("--cor-primaria", "#252C36");
        root.style.setProperty("--cor-escura", "#2E3540");
        root.style.setProperty("--cor-tabela-1", "#2E3540");
        root.style.setProperty("--cor-tabela-2", "rgba(19, 23, 28, 0.19)");
        root.style.setProperty("--cor-escura-textos", "#FFFFFF");
        root.style.setProperty("--cor-texto-tabela-dash", "#C1CAD6");
        root.style.setProperty("--cor-separacoes", "#13171C");
        root.style.setProperty("--cor-texto-claro", "#8E9AAF");
        root.style.setProperty("--cor-secundaria-textos", "#FFFFFF");
        root.style.setProperty("--cor-ver-mais", "#535B67");
        root.style.setProperty("--cor-secundaria", "rgba(19, 23, 28, 0.19)");
        root.style.setProperty("--cor-avisos-bg", "rgba(19, 23, 28, 0.19)");
        root.style.setProperty("--cor-dot-ativo", "#13171C");
        root.style.setProperty("--cor-dot-inativo", "#535B67");
        root.style.setProperty("--cor-bg-config", "rgba(19, 23, 28, 0.19)");
        root.style.setProperty("--cor-check-cfg-mark", "#1E242C");
        root.style.setProperty("--cor-slider", "#13171C");
        root.style.setProperty("--cor-tabela-3", "rgba(19, 23, 28, 0.19)");
        root.style.setProperty("--cor-botao-excluir", "#b63f3f");
        root.style.setProperty("--cor-botao-editar", "#d89c4f");
        root.style.setProperty("--cor-primaria-bg", "#13171C");
        root.style.setProperty("--cor-bg-input", "rgba(19, 23, 28, 0.19)");
        root.style.setProperty("--cor-btn", "#13171C");
        root.style.setProperty("--cor-botao-historico", "#0099b0");
        root.style.setProperty(
            "--cor-calendario-hover",
            "rgba(19, 23, 28, 0.19)"
        );
        root.style.setProperty("--cor-calendario-selected", "#13171C");
        root.style.setProperty("--cor-not-sucesso", "#4caf50");
        root.style.setProperty("--cor-not-falha", "#e57373");
        root.style.setProperty("--cor-not-alerta", "#ffb74d");
        root.style.setProperty("--cor-not-information", "#64b5f6");

        root.style.setProperty("--buttonMove", `url("../images/buttonMove_dark.png") center/contain no-repeat`)

        window.componentsLoaded.then(async () => {
            document.querySelector(".senai-logo img").src =
                "../images/sistema_fiep_senai_branco.png";

            if (document.getElementById("searchIcon")) {
                document.getElementById("searchIcon").src =
                    "../images/search_dark.png";
            }

            if (document.querySelector(".calendarIcon")) {
                document.querySelectorAll(".calendarIcon").forEach((icon) => {
                    icon.style.backgroundImage = "url(../images/data_dark.png)";
                });
            }

            if (document.querySelector("img.move")) {
                document.querySelectorAll("img.move").forEach((move) => {
                    move.src = "../images/buttonMove_dark.png";
                });
            }

            if (document.getElementById("imgPreview")) {
                document.getElementById("imgPreview").src =
                    "../images/image-upload_dark.png";
                document.getElementById(
                    "imgInput"
                ).style.backgroundImage = `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='white' stroke-width='3' stroke-dasharray='3%2c 12' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`;
            }

            if (
                document.querySelector(
                    '.formEditAdd input[type="datetime-local"]'
                )
            ) {
                document
                    .querySelectorAll(
                        '.formEditAdd input[type="datetime-local"]'
                    )
                    .forEach((item) => (item.style.colorScheme = "dark"));
            }

            if (document.querySelector('.config-form input[type="date"]'))
                document
                    .querySelectorAll('.config-form input[type="date"]')
                    .forEach((item) => (item.style.colorScheme = "dark"));

            if (document.querySelector('.horario-wrapper input[type="time"]'))
                document
                    .querySelectorAll('.horario-wrapper input[type="time"]')
                    .forEach((item) => (item.style.colorScheme = "dark"));

            if (document.querySelector('.inputGroup input[type="date"]'))
                document
                    .querySelectorAll('.inputGroup input[type="date"]')
                    .forEach((item) => item.style.colorScheme = "dark");
        });
    }

    checkNotifications();
    setInterval(checkNotifications, 60000);
});

window.getUserId = async function getUserId() {
    const res = await fetch("http://localhost:8080/getId", {
        method: "GET",
    });
    const response = await res.json();
    return response.id;
};

window.getUserInfo = async function getUserInfo() {
    const res = await fetch("http://localhost:8080/getInfo");
    const json = await res.json();
    return json;
};

window.stripHTMLTags = function stripHTMLTags(string) {
    const parseHTML = new DOMParser().parseFromString(string, "text/html");
    return parseHTML.body.textContent || "";
};

window.showConfirm = async function showConfirm(
    type,
    title = "Confirmar",
    message = "Tem certeza?",
    confirmText = "Confirmar",
    cancelText = "Cancelar"
) {
    return new Promise((resolve) => {
        const icon =
            {
                normal: "images/confirmNormal.png",
                danger: "images/confirmDanger.png",
            }[type] || "images/confirmNormal.png";

        const overlay = document.createElement("div");
        overlay.className = "confirmOverlay";

        const box = document.createElement("div");
        box.className = `confirmBox ${type}`;

        box.innerHTML = `
            ${icon ? `<img src="${icon}" />` : ""}
            <h2>${title}</h2>
            <p>${message}</p>
            <div class="confirmButtons">
                <button class="cBtn bCancel">${cancelText}</button>
                <button class="cBtn bConfirm">${confirmText}</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const btnCancel = box.querySelector(".bCancel");
        const btnConfirm = box.querySelector(".bConfirm");

        btnCancel.addEventListener("click", () => {
            overlay.classList.add("hide");
            overlay.remove();
            resolve(false);
        });

        btnConfirm.addEventListener("click", () => {
            overlay.classList.add("hide");
            overlay.remove();
            resolve(true);
        });
    });
};

window.showNotification = async function showNotification(
    type,
    title,
    message,
    duration = 4000
) {
    const notification = document.createElement("div");
    const sound = document.getElementById("notification");
    notification.className = `notification ${type}`;
    const daltonico = await checkDaltonismo();
    const dark = await checkModoEscuro();

    const iconSrc =
        {
            success:
                !daltonico && !dark
                    ? "images/notSucesso.png"
                    : dark
                    ? "images/notSucesso_dark.png"
                    : "images/notSucesso_dalt.png",
            failure:
                !daltonico && !dark
                    ? "images/notFalha.png"
                    : dark
                    ? "images/notFalha_dark.png"
                    : "images/notFalha_dalt.png",
            information: !dark
                ? "images/notInfo.png"
                : "images/notInfo_dark.png",
            alert:
                !daltonico && !dark
                    ? "images/notAlerta.png"
                    : dark
                    ? "images/notAlerta_dark.png"
                    : "images/notAlerta_dalt.png",
        }[type] || "images/notInfo.png";

    notification.innerHTML = `
        <img src="${iconSrc}" id="notificationIcon" />
        <div class="notBody">
            <h2>${title}</h2>
            <p>${message}</p>
        </div>
    `;

    document.getElementById("notification-container").appendChild(notification);

    const id = await window.getUserId();

    const response = await fetch(`http://localhost:8080/config/${id}`);
    const jsonRes = await response.json();
    const json = jsonRes[0];
    const soundNot = json.volumeNotificacao / 100;

    sound.volume = soundNot;
    if (json.somNotificacoes) sound.play();

    setTimeout(() => {
        notification.classList.add("hide");
        notification.addEventListener("animationend", () => {
            notification.remove();
        });
    }, duration);
};

window.setupAreaAutoComplete = function setupAreaAutocomplete(
    inputElement,
    areaId = 1
) {
    let autocompleteBox;

    function createAutocompleteBox() {
        autocompleteBox = document.createElement("div");
        autocompleteBox.classList.add("autocomplete-list");
        inputElement.parentNode.style.position = "relative";
        inputElement.parentNode.appendChild(autocompleteBox);
    }

    function clearAutocomplete() {
        if (autocompleteBox) autocompleteBox.innerHTML = "";
    }

    async function fetchAreas(query) {
        if (!query.trim()) return [];
        try {
            const res = await fetch(
                `http://localhost:8080/areas/search/${areaId}?q=${encodeURIComponent(
                    query
                )}`
            );
            const json = await res.json();
            return json.result || [];
        } catch (err) {
            console.error("Erro ao buscar áreas:", err);
            return [];
        }
    }

    async function showSuggestions(query) {
        if (!autocompleteBox) createAutocompleteBox();
        clearAutocomplete();
        inputElement.removeAttribute("data-id");

        const areas = await fetchAreas(query);
        if (areas.length === 0) {
            const noResult = document.createElement("div");
            noResult.textContent = "Nenhuma área encontrada";
            noResult.classList.add("autocomplete-item");
            autocompleteBox.appendChild(noResult);
            return;
        }

        areas.forEach((area) => {
            const item = document.createElement("div");
            item.classList.add("autocomplete-item");
            item.textContent = area.nomeArea;

            item.addEventListener("click", () => {
                inputElement.value = area.nomeArea;
                inputElement.dataset.id = area.idArea;
                clearAutocomplete();
            });

            autocompleteBox.appendChild(item);
        });
    }

    // Attach listeners
    inputElement.addEventListener("input", (e) =>
        showSuggestions(e.target.value)
    );

    document.addEventListener("click", (e) => {
        if (
            !inputElement.contains(e.target) &&
            !autocompleteBox?.contains(e.target)
        ) {
            clearAutocomplete();
        }
    });
};

window.setupEquipeAutoComplete = function setupEquipeAutocomplete(
    inputElement,
    equipeId = 1
) {
    let autocompleteBox;

    function createAutocompleteBox() {
        autocompleteBox = document.createElement("div");
        autocompleteBox.classList.add("autocomplete-list");
        inputElement.parentNode.style.position = "relative";
        inputElement.parentNode.appendChild(autocompleteBox);
    }

    function clearAutocomplete() {
        if (autocompleteBox) autocompleteBox.innerHTML = "";
    }

    async function fetchMembro(query) {
        if (!query.trim()) return [];
        try {
            const res = await fetch(
                `http://localhost:8080/equipe/filter/${equipeId}?q=${encodeURIComponent(
                    query
                )}`
            );
            const json = await res.json();
            return json.result || [];
        } catch (err) {
            console.error("Erro ao buscar membro:", err);
            return [];
        }
    }

    async function showSuggestions(query) {
        if (!autocompleteBox) createAutocompleteBox();
        clearAutocomplete();
        inputElement.removeAttribute("data-id");

        const membros = await fetchMembro(query);
        if (membros.length === 0) {
            const noResult = document.createElement("div");
            noResult.textContent = "Nenhum membro encontrado";
            noResult.classList.add("autocomplete-item");
            autocompleteBox.appendChild(noResult);
            return;
        }

        membros.forEach((membro) => {
            const item = document.createElement("div");
            item.classList.add("autocomplete-item");
            item.textContent = membro.nomeMembro;

            item.addEventListener("click", () => {
                inputElement.value = membro.nomeMembro;
                inputElement.dataset.id = membro.idMembro;
                clearAutocomplete();
            });

            autocompleteBox.appendChild(item);
        });
    }

    // Attach listeners
    inputElement.addEventListener("input", (e) =>
        showSuggestions(e.target.value)
    );

    document.addEventListener("click", (e) => {
        if (
            !inputElement.contains(e.target) &&
            !autocompleteBox?.contains(e.target)
        ) {
            clearAutocomplete();
        }
    });
};

window.setupEquipamentosAutoComplete = function setupEquipamentosAutocomplete(
    inputElement,
    equipamentoId = 1
) {
    let autocompleteBox;

    function createAutocompleteBox() {
        autocompleteBox = document.createElement("div");
        autocompleteBox.classList.add("autocomplete-list");
        inputElement.parentNode.style.position = "relative";
        inputElement.parentNode.appendChild(autocompleteBox);
    }

    function clearAutocomplete() {
        if (autocompleteBox) autocompleteBox.innerHTML = "";
    }

    async function fetchEquipamentos(query) {
        if (!query.trim()) return [];
        try {
            const res = await fetch(
                `http://localhost:8080/equipamentos/filter/${equipamentoId}?q=${encodeURIComponent(
                    query
                )}`
            );
            const json = await res.json();
            return json.result || [];
        } catch (err) {
            console.error("Erro ao buscar equipamento:", err);
            return [];
        }
    }

    async function showSuggestions(query) {
        if (!autocompleteBox) createAutocompleteBox();
        clearAutocomplete();
        inputElement.removeAttribute("data-id");

        const equipamentos = await fetchEquipamentos(query);
        if (equipamentos.length === 0) {
            const noResult = document.createElement("div");
            noResult.textContent = "Nenhum equipamento encontrado";
            noResult.classList.add("autocomplete-item");
            autocompleteBox.appendChild(noResult);
            return;
        }

        equipamentos.forEach((equipamento) => {
            const item = document.createElement("div");
            item.classList.add("autocomplete-item");
            item.textContent =
                equipamento.nomeEquipamento +
                ` (${equipamento.codEquipamento})`;

            item.addEventListener("click", () => {
                inputElement.value =
                    equipamento.nomeEquipamento +
                    ` (${equipamento.codEquipamento})`;
                inputElement.dataset.id = equipamento.idEquipamento;
                clearAutocomplete();
            });

            autocompleteBox.appendChild(item);
        });
    }

    // Attach listeners
    inputElement.addEventListener("input", (e) =>
        showSuggestions(e.target.value)
    );

    document.addEventListener("click", (e) => {
        if (
            !inputElement.contains(e.target) &&
            !autocompleteBox?.contains(e.target)
        ) {
            clearAutocomplete();
        }
    });
};

window.checkEqUso = async function checkEqUso(id, dates) {
    const res = await fetch("/check-use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idEquipamento: id, reservas: dates }),
    });

    if (!res.ok) {
        const json = await res.json();
        if (json.error && json.detalhes) {
            let text = `Houve um erro ao agendar empréstimo pois a data selecionada: ${toBrazilianDateTime(
                json.detalhes.requisitado[0]
            )} - ${toBrazilianDateTime(
                json.detalhes.requisitado[1]
            )} conflita com outro agendamento: ${toBrazilianDateTime(
                json.detalhes.conflitoCom[0]
            )} - ${toBrazilianDateTime(json.detalhes.conflitoCom[1])}`;
            showNotification("failure", "Falha!", text, 15000);
            return true;
        } else {
            showNotification(
                "failure",
                "Falha!",
                "Erro interno do servidor ao tentar checar conflito entre agendamentos."
            );
            return true;
        }
    } else {
        return false;
    }
};

async function showPopupAndMark(notification) {
    const msg = notification.mensagemAviso;
    let type;
    let text;
    if (notification.avisoSistema == 1) {
        const json = JSON.parse(msg);
        const tipo = json.type;
        if (tipo == 1) {
            type = "information";
            title = "Notificação";
            text = json.msg;
        } else {
            type = "alert";
            title = "Alerta!";
            text = json.msg;
        }
    } else {
        const res = await fetch(
            `http://localhost:8080/equipe/find/${notification.idUsuario}`
        );
        const resJson = await res.json();

        type = "information";
        title = "Nova postagem!";
        text = `O usuário ${resJson[0].nomeMembro} postou um novo aviso! Cheque seu dashboard para ver a mensagem.`;
    }

    showNotification(type, title, text);

    fetch("/notifications/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification.idAviso }),
    });
}

async function checkNotifications() {
    const res = await fetch("/notifications");
    const notifs = await res.json();
    notifs.forEach(showPopupAndMark);
}

async function checkDaltonismo() {
    const userId = await window.getUserId();
    const response = await fetch(`http://localhost:8080/config/${userId}`);
    const resJson = await response.json();
    const json = resJson[0];
    return json.modoDaltonismo;
}

window.checkModoEscuro = async function checkModoEscuro() {
    const userId = await window.getUserId();
    const response = await fetch(`http://localhost:8080/config/${userId}`);
    const resJson = await response.json();
    const json = resJson[0];
    return json.temaCor == "escuro" ? true : false;
};

function toBrazilianDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}
