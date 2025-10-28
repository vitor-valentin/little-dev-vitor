const params = new URLSearchParams(window.location.search);
const page = params.get("page");

if (!page || page == 1) {
    const systemUser = document.getElementById("systemUser");
    const hiddenForm = document.querySelector(".form-group.hidden");
    
    const tableBody = document.querySelector("tbody");
    const pagination = document.querySelector(".pagination");
    const searchInput = document.getElementById("search");
    const inputArea = document.getElementById("inputArea");
    const applyFilterBtn = document.querySelector(".applyFilter");

    // ========================= DELETE MEMBER =========================
    async function deleteMember(id) {
        const confirm = await showConfirm(
            "danger",
            "Confirmar Exclusão",
            "Tem certeza que deseja deletar o membro? Essa ação não pode ser desfeita!",
            "Deletar"
        );
        if (!confirm) return;

        const res = await fetch(`http://localhost:8080/equipe/${id}`, {
            method: "DELETE",
        });

        if (res.status === 200) {
            showNotification(
                "success",
                "Sucesso!",
                "O membro foi deletado com sucesso!"
            );
        } else {
            showNotification(
                "failure",
                "Falha",
                "Houve um erro ao tentar deletar o membro!"
            );
        }

        loadEquipe();
    }

    // ========================= PAGINATION HELPERS =========================
    function setPage(page, queryParams = {}) {
        const params = new URLSearchParams(window.location.search);
        params.set("p", parseInt(page));

        Object.entries(queryParams).forEach(([key, value]) => {
            if (value) params.set(key, value);
            else params.delete(key);
        });

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

    function formatPhone(number) {
        const numStr = number?.toString().replace(/\D/g, "") || "";
        if (numStr.length < 10) return number;
        const ddd = numStr.slice(0, 2);
        const firstPart = numStr.slice(2, numStr.length === 11 ? 7 : 6);
        const secondPart = numStr.slice(numStr.length === 11 ? 7 : 6);
        return `(${ddd}) ${firstPart}-${secondPart}`;
    }

    // ========================= LOAD EQUIPE =========================
    async function loadEquipe(query = "", filter = {}) {
        clearChildren(tableBody);
        clearChildren(pagination);

        // Construct endpoint
        const params = new URLSearchParams(window.location.search);

        let page;
        if (query) params.set("q", query);
        if (parseInt(params.get("p"))) page = parseInt(params.get("p"));
        else page = 1;

        const endpoint = `http://localhost:8080/equipe/filter/${page}?${params.toString()}`;
        const result = await fetch(endpoint);
        const json = await result.json();

        const totalItens = json.result2[0]?.totalItens || 0;
        const totalPages = Math.ceil(totalItens / 8);
        const itens = json.result;

        if (page > totalPages && totalPages != 0) setPage(totalPages);

        for (const item of itens) {
            const areaRes = await fetch(
                `http://localhost:8080/areas/find/${item.idArea}`
            );
            const areaJson = await areaRes.json();
            const nomeArea = areaJson[0]?.nomeArea || "—";

            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${item.nomeMembro}</td>
            <td>${item.emailMembro}</td>
            <td>${formatPhone(item.foneMembro)}</td>
            <td>${nomeArea}</td>
            <td>
                <button class="delete" data-id="${
                    item.idMembro
                }"><img src="../images/icon-excluir.png" />Excluir</button>
                <button class="edit" data-id="${
                    item.idMembro
                }"><img src="../images/icon-editar.png" />Editar</button>
                <button class="history" data-id="${
                    item.idMembro
                }"><img src="../images/history.png" />Histórico</button>
            </td>
        `;

            tr.querySelector(".delete").addEventListener("click", () =>
                deleteMember(item.idMembro)
            );
            tr.querySelector(".edit").addEventListener("click", () =>
                editMember(item.idMembro)
            );
            tr.querySelector(".history").addEventListener("click", () =>
                viewHistoryMember(item.idMembro)
            );

            tableBody.appendChild(tr);
        }

        const btnPrev = makeButton("«", {
            disabled: page === 1,
            onClick: () => setPage(page - 1, filter),
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
                    onClick: () => setPage(slot, filter),
                });
                pagination.appendChild(pageBtn);
            }
        });

        const btnNext = makeButton("»", {
            disabled: page >= totalPages,
            onClick: () => setPage(page + 1, filter),
        });
        pagination.appendChild(btnNext);
    }

    // ========================= SEARCH =========================
    async function searchEquipe(query, page = 1) {
        if (query.trim().length === 0) {
            loadEquipe();
            return;
        }
        loadEquipe(query, getCurrentFilter());
    }

    function getCurrentFilter() {
        const params = new URLSearchParams(window.location.search);
        const filterStr = params.get("filter");
        if (!filterStr) return {};
        try {
            return JSON.parse(filterStr);
        } catch {
            return {};
        }
    }
    setupAreaAutoComplete(inputArea);

    // ========================= FILTER =========================
    applyFilterBtn.addEventListener("click", (e) => {
        const areaId = inputArea.dataset.id;
        const params = new URLSearchParams(window.location.search);
        if (areaId) {
            if (inputArea.value == "") params.delete("filter");
            else
                params.set(
                    "filter",
                    JSON.stringify({ areaId: parseInt(areaId) })
                );
            window.location.search = params.toString();
        } else if(params.get("filter") && inputArea.value == "") {
            params.delete("filter");
            window.location.search = params.toString();
        } else {
            showNotification(
                "alert",
                "Alerta!",
                "Por favor, selecione uma área válida antes de aplicar o filtro."
            );
        }
    });

    async function filterValueLoad(idArea) {
        const areaRes = await fetch(
            `http://localhost:8080/areas/find/${idArea}`
        );
        const areaJson = await areaRes.json();
        const nomeArea = areaJson[0]?.nomeArea || "—";

        inputArea.value = nomeArea;
    }

    // ========================= INITIAL LOAD =========================
    const currentQuery = params.get("q") || "";
    const currentFilter = getCurrentFilter();

    searchInput.value = currentQuery;
    if (currentFilter.areaId && inputArea) {
        inputArea.dataset.id = currentFilter.areaId;
        filterValueLoad(currentFilter.areaId);
    }

    loadEquipe(currentQuery, currentFilter);

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) searchEquipe(query);
        else loadEquipe("", getCurrentFilter());
    });

    systemUser.addEventListener("input", () => {
        hiddenForm.classList.toggle("hidden");
        hiddenForm.querySelector("input").setAttribute("required", "required");
    });
} else {
    const nomeMembro = document.getElementById("nomeMembro");
    const avisoText = document.getElementById("avisoText");
    const postAviso = document.querySelector(".buttonGroup .submit");

    const userInfo = await getUserInfo();
    const username = userInfo.nomeMembro.split(" ")[0].toUpperCase();

    nomeMembro.value = username;


    postAviso.addEventListener("click", async (e) => {
        e.preventDefault();

        if(avisoText.value.replaceAll(" ", '') != "") {
            const textAviso = stripHTMLTags(avisoText.value);
            
            try {
                await fetch("http://localhost:8080/avisos", {
                    method: "POST",
                    headers: {'Content-Type': "application/json"},
                    body: JSON.stringify({mensagemAviso: textAviso, userId: userInfo.idMembro})
                });

                showNotification("success", "Sucesso!", "Seu aviso foi postado com sucesso!");
                avisoText.value = "";
            } catch (err) {
                console.error("Erro ao tentar postar aviso: ", err);
                showNotification("failure", "Falha!", "Houve um erro ao tentar postar o aviso! Cheque os logs para mais informações");
            }
        } else {
            showNotification("failure", "Falha!", "Por favor preencha o campo aviso!");
        }
    });
}
