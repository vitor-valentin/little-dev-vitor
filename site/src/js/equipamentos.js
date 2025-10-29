/* ====================== TABLE HANDLING ====================== */
const tableBody = document.querySelector("tbody");
const pagination = document.querySelector(".pagination");
const searchInput = document.getElementById("search");
const applyFilterBtn = document.querySelector(".applyFilter");
const closeFilterBtn = document.querySelector(".closeFilter");
const overlayFilter = document.querySelector(".overlayFilter");
const inputArea = document.getElementById("inputArea");
const selectDisp = document.getElementById("selectDisponibilidade");
const checkValor = document.getElementById("checkValor");

let autocompleteBox;

async function deleteEquipment(id) {
    const confirm = await showConfirm(
        "danger",
        "Confirmar Exclusão",
        "Tem certeza que deseja deletar o equipamento? Essa ação não pode ser desfeita!",
        "Deletar"
    );

    if (confirm) {
        const res = await fetch(`http://localhost:8080/equipamentos/${id}`, {
            method: "DELETE",
        });

        if (res.status == 200) {
            showNotification(
                "success",
                "Sucesso!",
                "O equipamento foi deletada com sucesso!"
            );
        } else {
            showNotification(
                "failure",
                "Falha",
                "Houve um erro ao tentar deletar o equipamento!"
            );
        }

        loadEquipamentos("", getCurrentFilter());
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

function altoValorConvert(bool) {
    if (bool) return "Sim";
    else return "Não";
}

function eqDisponivel(res) {
    if (!res) return "Sim";
    else return "Não";
}

async function loadEquipamentos(query = "", filter = {}) {
    clearChildren(tableBody);
    clearChildren(pagination);

    const params = new URLSearchParams(window.location.search);

    if (query) params.set("q", query);
    const page = parseInt(params.get("p")) ? parseInt(params.get("p")) : 1;

    const result = await fetch(
        `http://localhost:8080/equipamentos/filter/${page}?${params.toString()}`
    );
    const json = await result.json();

    const totalItens = json.result2[0].totalItens;
    const totalPages = Math.ceil(totalItens / 8);
    const itens = json.result;

    if (page > totalPages && totalPages != 0) setPage(totalPages);

    itens.forEach(async (item) => {
        const res = await fetch(
            `http://localhost:8080/areas/find/${item.idArea}`
        );
        const json2 = await res.json();
        const nomeArea = json2[0].nomeArea;

        const res2 = await fetch(
            `http://localhost:8080/emprestimos/equipamento/${item.idEquipamento}`
        );
        const json3 = await res2.json();

        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td class="showImg">
            <img src="../images/uploads/${item.imagemEquipamento}" />
        </td>
      <td>${item.nomeEquipamento}</td>
      <td>${item.codEquipamento}</td>
      <td>${altoValorConvert(item.altoValor)}</td>
      <td>${nomeArea}</td>
      <td>${eqDisponivel(json3[0])}</td>
      <td>
        <button class="delete" data-id="${
            item.idEquipamento
        }"><img src="../images/icon-excluir.png" />Excluir</button>
        <button class="edit" data-id="${
            item.idEquipamento
        }"><img src="../images/icon-editar.png" />Editar</button>
        <button class="history" data-id="${
            item.idEquipamento
        }"><img src="../images/history.png" />Histórico</button>
      </td>
    `;
        tr.querySelector(".delete").addEventListener("click", () =>
            deleteEquipment(item.idEquipamento)
        );
        tr.querySelector(".edit").addEventListener("click", () =>
            editEquipment(item.idEquipamento)
        );
        tr.querySelector(".history").addEventListener("click", () => {
            viewHistoryEquipment(item.idEquipamento);
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

async function filterValueLoad(idArea, checkState, selectValue) {
    const areaRes = await fetch(`http://localhost:8080/areas/find/${idArea}`);
    const areaJson = await areaRes.json();
    const nomeArea = areaJson[0]?.nomeArea || "";

    inputArea.value = nomeArea;
    checkValor.checked = checkState;
    selectDisp.value = selectValue;
}

async function searchEquipamentos(query) {
    if (query.trim().length === 0) {
        loadEquipamentos();
        return;
    }
    loadEquipamentos(query, getCurrentFilter());
}

searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) searchEquipamentos(query);
    else loadEquipamentos("", getCurrentFilter());
});

applyFilterBtn.addEventListener("click", () => {
    const areaId = inputArea.dataset.id;
    const checkState = checkValor.checked;
    const selectValue = selectDisp.value;

    const params = new URLSearchParams(window.location.search);

    if (!areaId && !checkState && selectValue == "ambas") {
        params.delete("filter");
    } else {
        params.set(
            "filter",
            JSON.stringify({
                areaId: parseInt(areaId),
                checkState: checkState,
                selectValue: selectValue,
            })
        );
    }
    window.location.search = params.toString();
});

setupAreaAutoComplete(inputArea);

const params = new URLSearchParams(window.location.search);
const currentPage = parseInt(params.get("p")) || 1;
const currentQuery = params.get("q") || "";
const currentFilter = getCurrentFilter();

searchInput.value = currentQuery;
if (
    currentFilter.areaId ||
    currentFilter.checkState ||
    currentFilter.selectValue
) {
    inputArea.dataset.id = currentFilter.areaId || undefined;
    filterValueLoad(
        currentFilter.areaId,
        currentFilter.checkState,
        currentFilter.selectValue
    );
}

loadEquipamentos(currentQuery, currentFilter);

/* ====================== FORM HANDLING ====================== */

const nomeEquip = document.getElementById("nomeEquipamento");
const codEquipe = document.getElementById("codId");
const areaInput = document.getElementById("area");
const imgEquip = document.getElementById("imagem");
const checkAlto = document.getElementById("altoValor");
const submit = document.querySelector(".formEditAdd .submit");

setupAreaAutoComplete(areaInput);

function isEmpty(str) {
    return !str || str.trim() === "";
}

async function processImage(file) {
    return new Promise((resolve, object) => {
        const img = new Image();
        img.onload = () => {
            const scale = 70 / img.width;
            const canvas = document.createElement("canvas");
            canvas.width = 70;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
                (blob) =>
                    resolve(
                        new File([blob], "image.webp", { type: "image/webp" })
                    ),
                "image/webp",
                0.8
            );
        };

        img.onerror = () => reject("Erro ao carregar imagem");
        img.src = URL.createObjectURL(file);
    });
}

imgEquip.addEventListener("change", () => {
    const file = imgEquip.files[0];
    if (!file) return;

    const maxSize = 20;
    const maxSizeBytes = maxSize * 1024 * 1024;

    if (file.size > maxSizeBytes) {
        showNotification(
            "failure",
            "Falha!",
            "O arquivo não pode ser maior que 20MB!"
        );
        imgEquip.value = "";
        return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
        showNotification(
            "failure",
            "Falha!",
            "Formato inválido de arquivo! Use .jpg/.jpeg, .png ou .webp!"
        );
        imgEquip.value = "";
        return;
    }
});

submit.addEventListener("click", async (e) => {
    e.preventDefault();

    const { name, code, area, check } = {
        name: stripHTMLTags(nomeEquip.value),
        code: stripHTMLTags(codEquipe.value),
        area: areaInput.dataset.id,
        check: checkAlto.checked,
    };

    const img = imgEquip.files[0];

    if (isEmpty(name)) {
        showNotification(
            "failure",
            "Falha!",
            "O campo nome é obrigatório para adicionar um equipamento!"
        );
        return;
    } else if (!area) {
        showNotification(
            "failure",
            "Falha!",
            "O campo área é obrigatório para adicionar um equipamento!"
        );
        return;
    } else if (!img) {
        showNotification(
            "failure",
            "Falha!",
            "O campo imagem é obrigatório para adicionar um equipamento!"
        );
        return;
    }else if (name.length > 70) {
        showNotification(
            "failure",
            "Falha!",
            "O campo nome não pode ter mais de 70 caracteres!"
        );
        return;
    }else if (code.length > 50) {
        showNotification(
            "failure",
            "Falha!",
            "O campo código não pode ter mais de 50 caracteres!"
        );
        return;
    }

    if (isEmpty(code)) code = 1;

    const optmizedImage = await processImage(img);

    const formData = new FormData();

    formData.append("imagem", optmizedImage);
    formData.append("nome", name);
    formData.append("codigo", code);
    formData.append("areaId", area);
    formData.append("altoValor", check);

    try {
        const res = await fetch("http://localhost:8080/equipamentos", {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            throw new Error("Erro interno no servidor");
        }

        showNotification(
            "success",
            "Sucesso!",
            "O equipamento foi cadastrado com sucesso!"
        );

        nomeEquip.value = "";
        codEquipe.value = "";
        areaInput.value = "";
        areaInput.dataset.id = "";
        checkAlto.checked = false;
        imgEquip.value = "";

        loadEquipamentos(currentQuery, currentFilter);
    } catch (err) {
        showNotification(
            "failure",
            "Falha!",
            "Ocorreu um erro ao tentar adicionar o equipamento!"
        );
        console.error("Erro: ", err);
        return;
    }
});

/* ====================== Drag and Drop ====================== */
const dropArea = document.getElementById("imgInput");
const imgPreview = document.getElementById("imgPreview");

function previewSelectedImage(file) {
    const reader = new FileReader();
    reader.onload = () => {
        imgPreview.src = reader.result;
    };
    reader.readAsDataURL(file);
}

dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragover");
});

dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("dragover");

    const file = e.dataTransfer.files[0];
    if (file) {
        imgEquip.files = e.dataTransfer.files; 
        imgPreview.src = URL.createObjectURL(file);
        imgEquip.dispatchEvent(new Event("change"));
    }
});

imgEquip.addEventListener("change", () => {
    const file = imgEquip.files[0];
    if (file) previewSelectedImage(file);
});
