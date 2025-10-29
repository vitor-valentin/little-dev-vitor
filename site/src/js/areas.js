const tableBody = document.querySelector("tbody");
const pagination = document.querySelector(".pagination");
const searchInput = document.getElementById("search");

async function deleteArea(id) {
    const confirm = await showConfirm(
        "danger",
        "Confirmar Exclusão",
        "Tem certeza que deseja deletar a área? Essa ação não pode ser desfeita!",
        "Deletar"
    );

    if (!confirm) return;

    const res = await fetch(`http://localhost:8080/areas/${id}`, {
        method: "DELETE",
    });

    if (res.status === 200) {
        showNotification(
            "success",
            "Sucesso!",
            "A área foi deletada com sucesso!"
        );
    } else {
        showNotification(
            "failure",
            "Falha",
            "Houve um erro ao tentar deletar a área!"
        );
    }

    loadAreas();
}

async function editArea(id) {
    try {
        const res = await fetch(`http://localhost:8080/areas/find/${id}`);
        if (!res.ok) throw new Error("Erro ao buscar área no servidor.");

        const [area] = await res.json();
        if (!area) throw new Error("Área não encontrada.");

        nomeArea.value = area.nomeArea;

        const title = document.querySelector(".formEditAdd h2");
        const submitBtn = document.querySelector(".formEditAdd .submit");

        title.textContent = `EDITANDO ÁREA: ${area.nomeArea.toUpperCase()}`;
        submitBtn.textContent = "Editar";

        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

        const pageTable = document.querySelector(".pageTable");
        const pageEditAdd = document.querySelector(".pageEditAdd");
        const returnButton = document.querySelector(".return");
        pageTable.classList.remove("active");
        pageEditAdd.classList.add("active");

        newSubmitBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            const nome = nomeArea.value;

            if (isEmpty(nome)) {
                showNotification(
                    "failure",
                    "Falha!",
                    "O nome da área é obrigatório!"
                );
                return;
            } else if (nome.length > 50) {
                showNotification(
                    "failure",
                    "Falha!",
                    "O nome não pode ter mais de 50 caracteres!"
                );
                return;
            }

            try {
                const result = await fetch(
                    `http://localhost:8080/areas/${id}`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ nome }),
                    }
                );

                if (!result.ok) throw new Error("Erro ao atualizar área.");

                showNotification(
                    "success",
                    "Sucesso!",
                    "A área foi atualizada com sucesso!"
                );
                title.textContent = "EDITANDO ÁREA: " + nome;

                loadAreas(currentPage, currentQuery);
            } catch (err) {
                showNotification(
                    "failure",
                    "Falha!",
                    "Erro ao atualizar a área!"
                );
                console.error(err);
            }
        });

        returnButton.addEventListener("click", () => {
            title.textContent = "ADICIONAR ÁREA";
            newSubmitBtn.textContent = "Criar";
            nomeArea.value = "";
        });
    } catch (err) {
        showNotification(
            "failure",
            "Falha!",
            "Erro ao carregar dados para edição!"
        );
        console.error(err);
    }
}

function setPage(page, query = "") {
    const params = new URLSearchParams(window.location.search);
    params.set("p", parseInt(page));
    if (query) params.set("q", query);
    else params.delete("q");
    window.location.search = params.toString();
}

function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
}

function makeButton(text, opts = {}) {
    const btn = document.createElement("button");
    btn.textContent = text;
    if (opts.disabled) btn.setAttribute("disabled", "disabled");
    if (opts.className) btn.classList.add(opts.className);
    if (typeof opts.onClick === "function")
        btn.addEventListener("click", opts.onClick);
    return btn;
}

function makeEllipsisInput(totalPages, currentPage, onPageChange) {
    const input = document.createElement("input");
    input.type = "number";
    input.className = "ellipsis-input";
    input.placeholder = "...";
    input.min = 1;
    input.max = totalPages;
    input.value = "";
    input.title = `Digite o número da página (1 - ${totalPages}) e pressione Enter`;

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const v = parseInt(input.value);
            if (v >= 1 && v <= totalPages) onPageChange(v);
        }
        if (e.key === "Escape") input.value = "";
    });

    input.addEventListener("blur", () => {
        const v = parseInt(input.value);
        if (v >= 1 && v <= totalPages) onPageChange(v);
    });

    return input;
}

function getVisibleSlots(page, totalPages) {
    if (totalPages <= 7)
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 2) return [1, 2, "ellipsis", totalPages - 1, totalPages];
    if (page >= totalPages - 2)
        return [
            "ellipsis",
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages,
        ];
    return ["ellipsis", page - 1, page, page + 1, "ellipsis"];
}

async function loadAreas(page = 1, query = "") {
    clearChildren(tableBody);
    clearChildren(pagination);

    const endpoint = query
        ? `http://localhost:8080/areas/search/${page}?q=${encodeURIComponent(
              query
          )}`
        : `http://localhost:8080/areas/${page}`;

    const result = await fetch(endpoint);
    const json = await result.json();

    const totalItens = json.result2[0]?.totalItens || 0;
    const totalPages = Math.ceil(totalItens / 8);
    const itens = json.result;

    itens.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.nomeArea}</td>
            <td>
                <button class="delete" data-id="${item.idArea}">
                    <img src="../images/icon-excluir.png" />Excluir
                </button>
                <button class="edit" data-id="${item.idArea}">
                    <img src="../images/icon-editar.png" />Editar
                </button>
            </td>
        `;
        tr.querySelector(".delete").addEventListener("click", () =>
            deleteArea(item.idArea)
        );
        tr.querySelector(".edit").addEventListener("click", () =>
            editArea(item.idArea)
        );
        tableBody.appendChild(tr);
    });

    const onPageChange = (newPage) => {
        if (query) loadAreas(newPage, query);
        else setPage(newPage);
    };

    const btnPrev = makeButton("«", {
        disabled: page === 1,
        onClick: () => onPageChange(page - 1),
    });
    pagination.appendChild(btnPrev);

    const slots = getVisibleSlots(page, totalPages);
    slots.forEach((slot) => {
        if (slot === "ellipsis") {
            pagination.appendChild(
                makeEllipsisInput(totalPages, page, onPageChange)
            );
        } else {
            const pageBtn = makeButton(slot, {
                className: page === slot ? "active" : null,
                onClick: () => onPageChange(slot),
            });
            pagination.appendChild(pageBtn);
        }
    });

    const btnNext = makeButton("»", {
        disabled: page >= totalPages,
        onClick: () => onPageChange(page + 1),
    });
    pagination.appendChild(btnNext);
}

async function searchAreas(query, page = 1) {
    if (query.trim().length === 0) {
        loadAreas(page);
        return;
    }
    loadAreas(page, query);
}

const params = new URLSearchParams(window.location.search);
const currentPage = parseInt(params.get("p")) || 1;
const currentQuery = params.get("q") || "";

searchInput.value = currentQuery;
loadAreas(currentPage, currentQuery);

searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) searchAreas(query);
    else loadAreas();
});

/* =============== FORM HANDLER =============== */
const nomeArea = document.getElementById("nomeArea");
const submitBtn = document.querySelector(".pageEditAdd .submit");

function isEmpty(str) {
    return !str || str.trim() === "";
}

submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const nome = nomeArea.value;

    if (isEmpty(nome)) {
        showNotification(
            "failure",
            "Falha!",
            "O campo nome é obrigatório para criar uma área!"
        );
        return;
    } else if (nome.length > 50) {
        showNotification(
            "failure",
            "Falha!",
            "O campo nome não pode ter mais de 50 caracteres!"
        );
        return;
    }

    try {
        const res = await fetch("http://localhost:8080/areas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome }),
        });

        if (!res.ok) {
            throw new Error("Erro interno no servidor!");
        }

        showNotification(
            "success",
            "Sucesso!",
            "A área foi criada com sucesso!"
        );

        nomeArea.value = "";

        loadAreas(currentPage, currentQuery);
    } catch (err) {
        showNotification(
            "failure",
            "Falha!",
            "Ocorreu um erro ao tentar adicionar o membro!"
        );
        console.error("Erro: ", err);
        return;
    }
});
