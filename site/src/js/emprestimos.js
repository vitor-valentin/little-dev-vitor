const calendarDates = document.querySelector(".calendar-dates");
const monthYearLabel = document.querySelector(".month-year");
const prevBtn = document.querySelectorAll(".arrow-btn")[0];
const nextBtn = document.querySelectorAll(".arrow-btn")[1];

const horarioModal = document.getElementById("horarioModal");
const confirmarHorarioBtn = document.getElementById("confirmarHorario");
const removerDataBtn = document.getElementById("removerData");
const inputHorarioRetirada = document.getElementById("horarioRetirada");
const inputHorarioDevolucao = document.getElementById("horarioDevolucao");

const applyBtn = document.querySelector(".btn-apply");
const applyUntilInput = document.getElementById("applyDate");
const useWeekCheckbox = document.querySelectorAll('input[type="checkbox"]')[0];
const useMonthCheckbox = document.querySelectorAll('input[type="checkbox"]')[1];

const params = new URLSearchParams(window.location.search);
const page = params.get("page");

let currentDate = new Date();
let displayDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
);
let selectedDateTimes = [];
let clickedDay = null;

function formatDate(date) {
    return date.toISOString().split("T")[0];
}

function updateCalendar() {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(new Date().setHours(0, 0, 0, 0));

    const monthNames = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
    ];
    monthYearLabel.innerHTML = `${monthNames[month]} <strong>${year}</strong>`;

    calendarDates.innerHTML = "";

    for (let i = 0; i < firstDayIndex; i++) {
        calendarDates.appendChild(document.createElement("span"));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const span = document.createElement("span");
        const date = new Date(year, month, day);
        const fullDate = formatDate(date);
        const isPast = date < today;
        const isSelected = selectedDateTimes.find((dt) =>
            dt[0].startsWith(fullDate)
        );

        span.textContent = day;

        if (isPast) {
            span.classList.add("disabled");
        } else {
            if (isSelected) span.classList.add("selected");
            span.addEventListener("click", () => {
                clickedDay = date;
                if (isSelected) {
                    inputHorarioRetirada.value = isSelected[0].split(" ")[1];
                    inputHorarioDevolucao.value = isSelected[1].split(" ")[1];
                } else {
                    inputHorarioRetirada.value = "";
                    inputHorarioDevolucao.value = "";
                }
                horarioModal.classList.remove("hidden");
            });
        }

        calendarDates.appendChild(span);
    }

    const isSameMonth =
        displayDate.getFullYear() === currentDate.getFullYear() &&
        displayDate.getMonth() === currentDate.getMonth();

    prevBtn.disabled = isSameMonth;
    prevBtn.style.opacity = isSameMonth ? 0.3 : 1;
}

function getSampleTimesByConfig(dates) {
    const config = {};
    dates.forEach((dt) => {
        const date = new Date(dt[0]);
        const weekday = date.getDay();
        const weekNum = Math.floor((date.getDate() - 1) / 7);
        const key = useWeekCheckbox.checked ? weekday : `${weekday}-${weekNum}`;
        config[key] = [dt[0].split(" ")[1], dt[1].split(" ")[1]]; // retirada, devolução
    });
    return config;
}

function applyConfig() {
    const limitDate = new Date(applyUntilInput.value);
    limitDate.setHours(23, 59, 59, 999);
    if (!limitDate || isNaN(limitDate))
        return alert("Selecione uma data final válida.");

    const month = displayDate.getMonth();
    const year = displayDate.getFullYear();

    const selectedThisMonth = selectedDateTimes.filter((dt) => {
        const d = new Date(dt[0]);
        return (
            d.getMonth() === month &&
            d.getFullYear() === year &&
            d >= new Date()
        );
    });

    if (selectedThisMonth.length === 0)
        return alert("Selecione dias válidos no mês atual como modelo.");

    const sampleTimes = getSampleTimesByConfig(selectedThisMonth);

    const newSelections = [];
    const selectedModelDates = selectedDateTimes
        .map((dt) => new Date(dt[0]))
        .filter((d) => d.getFullYear() === year && d.getMonth() === month)
        .sort((a, b) => a - b);

    if (selectedModelDates.length === 0)
        return alert("Selecione dias válidos no mês atual como modelo.");

    const startDate = selectedModelDates[0];

    const now = new Date(year, month, 1);
    while (now <= limitDate) {
        const y = now.getFullYear();
        const m = now.getMonth();
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(y, m, day);
            const dStr = formatDate(d);
            const startStr = formatDate(startDate);
            const limitStr = formatDate(limitDate);

            if (dStr < startStr || dStr > limitStr) continue;

            const weekday = d.getDay();
            const weekNum = Math.floor((day - 1) / 7);
            const key = useWeekCheckbox.checked
                ? weekday
                : `${weekday}-${weekNum}`;

            if (sampleTimes[key]) {
                const [retirada, devolucao] = sampleTimes[key];
                const dtRetirada = `${formatDate(d)} ${retirada}`;
                const dtDevolucao = `${formatDate(d)} ${devolucao}`;

                if (
                    !selectedDateTimes.some(
                        (existing) => existing[0] === dtRetirada
                    )
                ) {
                    newSelections.push([dtRetirada, dtDevolucao]);
                }
            }
        }

        now.setMonth(now.getMonth() + 1);
    }

    selectedDateTimes.push(...newSelections);
    updateCalendar();
}

if (calendarDates) {
    prevBtn.addEventListener("click", () => {
        if (displayDate > currentDate) {
            displayDate.setMonth(displayDate.getMonth() - 1);
            updateCalendar();
        }
    });

    nextBtn.addEventListener("click", () => {
        displayDate.setMonth(displayDate.getMonth() + 1);
        updateCalendar();
    });

    confirmarHorarioBtn.addEventListener("click", () => {
        if (
            !inputHorarioRetirada.value ||
            !inputHorarioDevolucao.value ||
            !clickedDay
        )
            return;

        const dateStr = formatDate(clickedDay);
        const retirada = `${dateStr} ${inputHorarioRetirada.value}`;
        const devolucao = `${dateStr} ${inputHorarioDevolucao.value}`;

        if (retirada >= devolucao) {
            alert("A devolução deve ser após a retirada.");
            return;
        }

        const existingIndex = selectedDateTimes.findIndex((dt) =>
            dt[0].startsWith(dateStr)
        );

        if (existingIndex !== -1) {
            selectedDateTimes[existingIndex] = [retirada, devolucao];
        } else {
            selectedDateTimes.push([retirada, devolucao]);
        }

        horarioModal.classList.add("hidden");
        updateCalendar();
    });

    removerDataBtn.addEventListener("click", () => {
        if (!clickedDay) return;

        const dateStr = formatDate(clickedDay);
        selectedDateTimes = selectedDateTimes.filter(
            (dt) => !dt[0].startsWith(dateStr)
        );

        horarioModal.classList.add("hidden");
        updateCalendar();
    });

    applyBtn.addEventListener("click", applyConfig);

    updateCalendar();
}

if (!page || page == 1) {
    const tableBody = document.querySelector("tbody");
    const pagination = document.querySelector(".pagination");
    const searchInput = document.getElementById("search");

    const checkValor = document.getElementById("checkValor");
    const checkAtraso = document.getElementById("checkAtraso");
    const selectStatus = document.getElementById("selectStatus");
    const areaInput = document.getElementById("inputArea");
    const membroInput = document.getElementById("inputMembro");
    const eqInput = document.getElementById("inputEq");
    const dataI = document.getElementById("dataInicio");
    const dataF = document.getElementById("dataFim");
    const applyFilterBtn = document.querySelector(".filterBox .applyFilter");

    async function deleteEmprestimo(id) {
        const confirm = await showConfirm(
            "danger",
            "Confirmar Exclusão",
            "Tem certeza que deseja deletar o empréstimo? Essa ação não pode ser desfeita!",
            "Deletar"
        );

        if (!confirm) return;

        const res = await fetch(`http://localhost:8080/emprestimos/${id}`, {
            method: "DELETE",
        });

        if (res.status == 200) {
            showNotification(
                "success",
                "Sucesso!",
                "O empréstimo foi deletado com sucesso!"
            );
        } else {
            showNotification(
                "failure",
                "Falha",
                "Houve um erro ao tentar deletar o empréstimo!"
            );
        }

        loadEmprestimos();
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

    function altoValorConvert(bool) {
        return bool ? "Sim" : "Não";
    }

    function devolvidoCheck(dataDevolvido) {
        return dataDevolvido == '1900-01-01T04:07:29.000Z' ? "Não Devolvido" : formatDatetime(dataDevolvido);
    }

    function formatDatetime(datetime) {
        const dt = new Date(datetime);
        if (isNaN(dt)) return "";
        const day = String(dt.getDate()).padStart(2, "0");
        const month = String(dt.getMonth() + 1).padStart(2, "0");
        const year = dt.getFullYear();
        const hours = String(dt.getHours()).padStart(2, "0");
        const minutes = String(dt.getMinutes()).padStart(2, "0");
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    async function loadEmprestimos(query = "", filter = {}) {
        clearChildren(tableBody);
        clearChildren(pagination);

        const params = new URLSearchParams(window.location.search);

        let page;
        if (query) params.set("q", query);
        if (parseInt(params.get("p"))) page = parseInt(params.get("p"));
        else page = 1;

        const endpoint = `http://localhost:8080/emprestimos/filter/${page}?${params.toString()}`;
        const result = await fetch(endpoint);
        const json = await result.json();

        const totalItens = json.result2[0]?.totalItens || 0;
        const totalPages = Math.ceil(totalItens / 8);
        const itens = json.result;

        if (page > totalPages && totalPages != 0) setPage(totalPages);

        for (const item of itens) {
            const [equipamentoRes, membroRes] = await Promise.all([
                fetch(
                    `http://localhost:8080/equipamentos/find/${item.idEquipamento}`
                ),
                fetch(`http://localhost:8080/equipe/find/${item.idMembro}`),
            ]);

            const eq = (await equipamentoRes.json())[0];
            const member = (await membroRes.json())[0];

            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${eq.nomeEquipamento}</td>
            <td>${eq.codEquipamento}</td>
            <td>${altoValorConvert(eq.altoValor)}</td>
            <td>${formatDatetime(item.dataRecebimento)}</td>
            <td>${formatDatetime(item.dataDevolucao)}</td>
            <td>${devolvidoCheck(item.dataDevolvido)}</td>
            <td>${member.nomeMembro}</td>
            <td>${item.localUso}</td>
            <td>
                <button class="delete" data-id="${item.idEmprestimo}">
                    <img src="../images/icon-excluir.png" />Excluir
                </button>
                <button class="edit" data-id="${item.idEmprestimo}">
                    <img src="../images/icon-editar.png" />Editar
                </button>
                <button class="history" data-id="${item.idEmprestimo}">
                    <img src="../images/vistoria.png" />Vistoria
                </button>
            </td>
        `;

            tr.querySelector(".delete").addEventListener("click", () =>
                deleteEmprestimo(item.idEmprestimo)
            );
            tr.querySelector(".edit").addEventListener("click", () =>
                editEmprestimo(item.idEmprestimo)
            );
            tr.querySelector(".history").addEventListener("click", () =>
                vistoriaEmprestimo(item.idEmprestimo)
            );

            tableBody.appendChild(tr);
        }

        const onPageChange = (newPage) => {
            if (query) searchEmprestimos(query, newPage);
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

    async function filterValueLoad(
        idArea,
        idMembro,
        idEq,
        checkV,
        checkA,
        selectValue,
        dateI,
        dateF
    ) {
        const areaRes = await fetch(
            `http://localhost:8080/areas/find/${idArea}`
        );
        const areaJson = await areaRes.json();
        const nomeArea = areaJson[0]?.nomeArea || "";

        const membroRes = await fetch(
            `http://localhost:8080/equipe/find/${idMembro}`
        );
        const membroJson = await membroRes.json();
        const nomeMembro = membroJson[0]?.nomeMembro || "";

        const eqRes = await fetch(
            `http://localhost:8080/equipamentos/find/${idEq}`
        );
        const eqJson = await eqRes.json();
        const nomeEq = eqJson[0]?.nomeEquipamento || "";

        areaInput.value = nomeArea;
        eqInput.value = nomeEq;
        membroInput.value = nomeMembro;
        checkAtraso.checked = checkA;
        checkValor.checked = checkV;
        selectStatus.value = selectValue;
        dataI.value = dateI;
        dataF.value = dateF;
    }

    async function searchEmprestimos(query) {
        if (query.trim().length === 0) {
            loadEmprestimos("", getCurrentFilter());
            return;
        }
        loadEmprestimos(query, getCurrentFilter());
    }

    setupAreaAutoComplete(areaInput);
    setupEquipamentosAutoComplete(eqInput);
    setupEquipeAutoComplete(membroInput);

    const params = new URLSearchParams(window.location.search);
    const currentQuery = params.get("q") || "";
    const currentFilter = getCurrentFilter();

    searchInput.value = currentQuery;
    if (
        currentFilter.areaId ||
        currentFilter.eqId ||
        currentFilter.membroId ||
        currentFilter.checkV ||
        currentFilter.checkA ||
        currentFilter.selectValue ||
        currentFilter.dateI ||
        currentFilter.dateF
    ) {
        areaInput.dataset.id = currentFilter.areaId || undefined;
        eqInput.dataset.id = currentFilter.eqId || undefined;
        membroInput.dataset.id = currentDate.membroId || undefined;

        filterValueLoad(
            currentFilter.areaId,
            currentFilter.membroId,
            currentFilter.eqId,
            currentFilter.checkV,
            currentFilter.checkA,
            currentFilter.selectValue,
            currentFilter.dateI,
            currentFilter.dateF
        );
    }
    loadEmprestimos(currentQuery, currentFilter);

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) searchEmprestimos(query);
        else loadEmprestimos("", getCurrentFilter());
    });

    applyFilterBtn.addEventListener("click", () => {
        const areaId = areaInput.dataset.id;
        const eqId = eqInput.dataset.id;
        const membroId = membroInput.dataset.id;
        const checkV = checkValor.checked;
        const checkA = checkAtraso.checked;
        const selectValue = selectStatus.value;
        const dateI = dataI.value;
        const dateF = dataF.value;

        const params = new URLSearchParams(window.location.search);
        if (
            (areaId == "undefined" || !areaId) &&
            (eqId == "undefined" || !eqId) &&
            (membroId == "undefined" || !membroId) &&
            !checkV &&
            !checkA &&
            isEmpty(dateI) &&
            isEmpty(dateF) &&
            selectValue == "todos"
        ) {
            params.delete("filter");
        } else {
            params.set(
                "filter",
                JSON.stringify({
                    areaId: parseInt(areaId),
                    eqId: parseInt(eqId),
                    membroId: parseInt(membroId),
                    checkV,
                    checkA,
                    selectValue,
                    dateI,
                    dateF,
                })
            );
        }
        window.location.search = params.toString();
    });

    /* ==================== FORM HANDLER ==================== */

    const inputEquip = document.getElementById("nomeEquipamento");
    const dataRecebimento = document.getElementById("dataRecebimento");
    const dataDevolucao = document.getElementById("dataDevolucao");
    const salaLocal = document.getElementById("salaLocal");
    const inputMembro = document.getElementById("membro");
    const obsText = document.getElementById("obsText");
    const submitBtn = document.querySelector(".formEditAdd .submit");

    function setDataNow() {
        const now = new Date();

        const options = { timeZone: "America/Sao_Paulo", hour12: false };

        const formatter = new Intl.DateTimeFormat("en-CA", {
            ...options,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });

        const parts = formatter.formatToParts(now);
        const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));

        const formatted = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;

        dataRecebimento.value = formatted;
    }

    function isEmpty(str) {
        return !str || str.trim() === "";
    }

    setupEquipamentosAutoComplete(inputEquip);
    setupEquipeAutoComplete(inputMembro);
    setDataNow();

    let editingEmpId = null;

    submitBtn.addEventListener("click", (e) => {
        if (editingEmpId) {
            console.log("a");
            updateEmprestimo(e, editingEmpId);
        } else {
            addEmprestimo(e);
        }
    });

    function clearEmprestimoForm() {
        inputEquip.value = "";
        inputEquip.dataset.id = "";
        setDataNow();
        dataDevolucao.value = "";
        salaLocal.value = "";
        inputMembro.value = "";
        inputMembro.dataset.id = "";
        obsText.value = "";
    }

    async function addEmprestimo(e) {
        e.preventDefault();

        const idEquipamento = inputEquip.dataset.id;
        const recebimento = stripHTMLTags(dataRecebimento.value);
        const devolucao = stripHTMLTags(dataDevolucao.value);
        const local = stripHTMLTags(salaLocal.value);
        const idMembro = inputMembro.dataset.id;
        const obs = stripHTMLTags(obsText.value);

        switch (true) {
            case isEmpty(idEquipamento):
                showNotification(
                    "failure",
                    "Falha!",
                    "O campo equipamento é obrigatório para registrar um empréstimo!"
                );
                return;
            case isEmpty(recebimento):
                showNotification(
                    "failure",
                    "Falha!",
                    "A data de recebimento é obrigatório para registrar um empréstimo!"
                );
                return;
            case isEmpty(devolucao):
                showNotification(
                    "failure",
                    "Falha!",
                    "A data de devolucao é obrigatório para registrar um empréstimo!"
                );
                return;
            case isEmpty(local):
                showNotification(
                    "failure",
                    "Falha!",
                    "O campo local é obrigatório para registrar um empréstimo!"
                );
                return;
            case isEmpty(idMembro):
                showNotification(
                    "failure",
                    "Falha!",
                    "O campo membro é obrigatório para registrar um empréstimo!"
                );
                return;
        }
        const dateReceb = new Date(recebimento);
        const dateDev = new Date(devolucao);
        if (dateDev < dateReceb) {
            showNotification(
                "failure",
                "Falha!",
                "A data de devolução deve ser maior que a data de recebimento!"
            );
            return;
        } else if (obs.length > 200) {
            showNotification(
                "failure",
                "Falha!",
                "O campo observações não pode conter mais do que 200 caracteres!"
            );
            return;
        } else if (local.length > 30) {
            showNotification(
                "failure",
                "Falha!",
                "O campo local não pode contar mais do que 30 caracteres!"
            );
            return;
        }

        try {
            const res = await fetch("http://localhost:8080/emprestimos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idEquipamento,
                    recebimento,
                    devolucao,
                    local,
                    idMembro,
                    obs,
                }),
            });

            if (!res.ok) throw new Error();

            showNotification(
                "success",
                "Sucesso!",
                "Empréstimo criado com sucesso!"
            );

            clearEmprestimoForm();
            loadEmprestimos(currentQuery, currentFilter);
        } catch (err) {
            showNotification(
                "failure",
                "Falha!",
                "Erro ao registrar o empréstimo!"
            );
        }
    }

    async function updateEmprestimo(e, id) {
        e.preventDefault();

        const idEquipamento = inputEquip.dataset.id;
        const recebimento = stripHTMLTags(dataRecebimento.value);
        const devolucao = stripHTMLTags(dataDevolucao.value);
        const local = stripHTMLTags(salaLocal.value);
        const idMembro = inputMembro.dataset.id;
        const obs = stripHTMLTags(obsText.value);

        switch (true) {
            case isEmpty(idEquipamento):
                showNotification(
                    "failure",
                    "Falha!",
                    "O campo equipamento é obrigatório para registrar um empréstimo!"
                );
                return;
            case isEmpty(recebimento):
                showNotification(
                    "failure",
                    "Falha!",
                    "A data de recebimento é obrigatório para registrar um empréstimo!"
                );
                return;
            case isEmpty(devolucao):
                showNotification(
                    "failure",
                    "Falha!",
                    "A data de devolucao é obrigatório para registrar um empréstimo!"
                );
                return;
            case isEmpty(local):
                showNotification(
                    "failure",
                    "Falha!",
                    "O campo local é obrigatório para registrar um empréstimo!"
                );
                return;
            case isEmpty(idMembro):
                showNotification(
                    "failure",
                    "Falha!",
                    "O campo membro é obrigatório para registrar um empréstimo!"
                );
                return;
        }
        const dateReceb = new Date(recebimento);
        const dateDev = new Date(devolucao);
        if (dateDev < dateReceb) {
            showNotification(
                "failure",
                "Falha!",
                "A data de devolução deve ser maior que a data de recebimento!"
            );
            return;
        } else if (obs.length > 200) {
            showNotification(
                "failure",
                "Falha!",
                "O campo observações não pode conter mais do que 200 caracteres!"
            );
            return;
        } else if (local.length > 30) {
            showNotification(
                "failure",
                "Falha!",
                "O campo local não pode contar mais do que 30 caracteres!"
            );
            return;
        }

        try {
            const res = await fetch(`http://localhost:8080/emprestimos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idEquipamento,
                    recebimento,
                    devolucao,
                    local,
                    idMembro,
                    obs,
                }),
            });

            if (!res.ok) throw new Error();

            showNotification("success", "Sucesso!", "Empréstimo atualizado!");

            loadEmprestimos(currentQuery, currentFilter);
        } catch (err) {
            showNotification(
                "failure",
                "Falha!",
                "Erro ao atualizar empréstimo!"
            );
            console.error(err);
        }
    }

    async function editEmprestimo(id) {
        try {
            const res = await fetch(
                `http://localhost:8080/emprestimos/find/${id}`
            );
            if (!res.ok) throw new Error("Erro ao buscar empréstimo");
            const data = await res.json();
            const emp = data[0];

            if (!emp) return;

            const resEq = await fetch(`http://localhost:8080/equipamentos/find/${emp.idEquipamento}`);
            if (!resEq.ok) throw new Error("Falha ao buscar equipamento");

            const dataEq = await resEq.json();
            const eq = dataEq[0];

            inputEquip.value = eq.nomeEquipamento || "";
            inputEquip.dataset.id = emp.idEquipamento;

            dataRecebimento.value = emp.dataRecebimento.slice(0, 16);
            dataDevolucao.value = emp.dataDevolucao.slice(0, 16);

            salaLocal.value = emp.localUso || "";

            const resMembro = await fetch(`http://localhost:8080/equipe/find/${emp.idMembro}`);
            if (!resMembro.ok) throw new Error("Falha ao buscar equipamento");

            const dataMembro = await resMembro.json();
            const membro = dataMembro[0];

            inputMembro.value = membro.nomeMembro || "";
            inputMembro.dataset.id = emp.idMembro;

            obsText.value = emp.obsVistoria || "";

            editingEmpId = id;
            submitBtn.textContent = "Editar";
            document.querySelector(
                ".formEditAdd h2"
            ).textContent = `Editando Empréstimo: ${id}`;

            document.querySelector(".pageTable").classList.remove("active");
            document.querySelector(".pageEditAdd").classList.add("active");

            document.querySelector(".return").addEventListener("click", () => {
                editingEmpId = null;
                submitBtn.textContent = "Criar";
                document.querySelector(".formEditAdd h2").textContent =
                    "ADICIONAR EMPRÉSTIMO";
                clearEmprestimoForm();
            });
        } catch (err) {
            showNotification(
                "failure",
                "Falha!",
                "Erro ao carregar empréstimo!"
            );
            console.error(err);
        }

        
    }
}
