document.addEventListener("DOMContentLoaded", () => {
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
        console.log(type);
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

    const iconSrc =
        {
            success: "images/notSucesso.png",
            failure: "images/notFalha.png",
            information: "images/notInfo.png",
            alert: "images/notAlerta.png",
        }[type] || "images/notInfo.png";

    notification.innerHTML = `
        <img src="${iconSrc}" id="notificationIcon" />
        <div class="notBody">
            <h2>${title}</h2>
            <p>${message}</p>
        </div>
    `;

    document.body.appendChild(notification);

    const id = await window.getUserId();

    const response = await fetch(`http://localhost:8080/config/id=${id}`);
    const json = await response.json();
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
        if (areas.length === 0) {
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
        if (areas.length === 0) {
            const noResult = document.createElement("div");
            noResult.textContent = "Nenhum equipamento encontrado";
            noResult.classList.add("autocomplete-item");
            autocompleteBox.appendChild(noResult);
            return;
        }

        equipamentos.forEach((equipamento) => {
            const item = document.createElement("div");
            item.classList.add("autocomplete-item");
            item.textContent = equipamento.nomeEquipamento;

            item.addEventListener("click", () => {
                inputElement.value = equipamento.nomeEquipamento;
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