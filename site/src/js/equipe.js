const systemUser = document.getElementById("systemUser");
const hiddenForm = document.querySelector(".form-group.hidden");

const params = new URLSearchParams(window.location.search);
const page = params.get("page");

if (!page || page == 1) {
    systemUser.addEventListener("input", () => {
        hiddenForm.classList.toggle("hidden");
        hiddenForm.querySelector("input").setAttribute("required", "required");
    });
}

if (!page || page == 1) {
    const tableBody = document.querySelector("tbody");
    const pagination = document.querySelector(".pagination");

    async function deleteMember(id) {
        const confirm = await showConfirm(
            "danger",
            "Confirmar Exclusão",
            "Tem certeza que deseja deletar o membro? Essa ação não pode ser desfeita!",
            "Deletar"
        );

        if (confirm) {
            const res = await fetch(`http://localhost:8080/equipe/${id}`, {
                method: "DELETE",
            });

            if (res.status == 200) {
                showNotification(
                    "success",
                    "Sucesso!",
                    "O membro foi deletada com sucesso!"
                );
            } else {
                showNotification(
                    "failure",
                    "Falha",
                    "Houve um erro ao tentar deletar o membro!"
                );
            }

            loadTable();
        }
    }

    function setPage(page) {
        const params = new URLSearchParams(window.location.search);
        params.set("p", parseInt(page));
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

    function makeEllipsisInput(totalPages, currentPage) {
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
                if (v >= 1 && v <= totalPages) setPage(v);
            }

            if (e.key === "Escape") input.value = "";
        });

        input.addEventListener("blur", () => {
            const v = parseInt(input.value);
            if (v >= 1 && v <= totalPages) setPage(v);
        });

        input.addEventListener("click", (e) => e.stopPropagation());
        return input;
    }

    function getVisibleSlots(page, totalPages) {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        if (page <= 2) {
            return [1, 2, "ellipsis", totalPages - 1, totalPages];
        }

        if (page >= totalPages - 2) {
            return [
                "ellipsis",
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages,
            ];
        }

        return ["ellipsis", page - 1, page, page + 1, "ellipsis"];
    }

    function formatPhone(number) {
        const numStr = number.toString().replace(/\D/g, "");

        const ddd = numStr.slice(0, 2);
        const firstPart = numStr.slice(2, 7);
        const secondPart = numStr.slice(7);

        return `(${ddd}) ${firstPart}-${secondPart}`;
    }

    async function loadTable() {
        clearChildren(tableBody);
        clearChildren(pagination);

        const params = new URLSearchParams(window.location.search);
        const page = parseInt(params.get("p")) ? parseInt(params.get("p")) : 1;

        const result = await fetch(`http://localhost:8080/equipe/${page}`);
        const json = await result.json();
        const totalItens = json.result2[0].totalItens;
        const totalPages = Math.ceil(totalItens / 8);
        const itens = json.result;

        itens.forEach(async (item) => {
            const res = await fetch(
                `http://localhost:8080/areas/find/${item.idArea}`
            );
            const json2 = await res.json();
            const nomeArea = json2[0].nomeArea;

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
            tr.querySelector(".history").addEventListener("click", () => {
                viewHistoryMember(item.idMembro);
            });
            tableBody.appendChild(tr);
        });

        const btnPrev = makeButton("«", {
            disabled: page === 1,
            onClick: () => setPage(page - 1),
        });
        pagination.appendChild(btnPrev);

        const slots = getVisibleSlots(page, totalPages);
        slots.forEach((slot) => {
            if (slot === "ellipsis") {
                const ell = makeEllipsisInput(totalPages, page);
                pagination.appendChild(ell);
            } else {
                const pageBtn = makeButton(slot, {
                    className: page === slot ? "active" : null,
                    onClick: () => setPage(slot),
                });
                if (page === slot) pageBtn.classList.add("active");
                pagination.appendChild(pageBtn);
            }
        });

        const btnNext = makeButton("»", {
            disabled: page >= totalPages,
            onClick: () => setPage(page + 1),
        });
        pagination.appendChild(btnNext);
    }

    loadTable();
}
