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

    async function deleteEmprestimo(id) {
        const confirm = await showConfirm(
            "danger",
            "Confirmar Exclusão",
            "Tem certeza que deseja deletar o empréstimo? Essa ação não pode ser desfeita!",
            "Deletar"
        );

        if (confirm) {
            const res = await fetch(`http://localhost:8080/emprestimos/${id}`, {
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

    function altoValorConvert(bool) {
        if (bool) return "Sim";
        else return "Não";
    }

    function devolvidoCheck(dataDevolvido) {
        if (!dataDevolvido) return "Não Devolvido";
        else return formatDatetime(dataDevolvido);
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

    async function loadTable() {
        clearChildren(tableBody);
        clearChildren(pagination);

        const params = new URLSearchParams(window.location.search);
        const page = parseInt(params.get("p")) ? parseInt(params.get("p")) : 1;

        const result = await fetch(`http://localhost:8080/emprestimos/${page}`);
        const json = await result.json();
        const totalItens = json.result2[0].totalItens;
        const totalPages = Math.ceil(totalItens / 8);
        const itens = json.result;

        itens.forEach(async (item) => {
            const res = await fetch(
                `http://localhost:8080/equipamentos/find/${item.idEquipamento}`
            );
            const j = await res.json();
            const eq = j[0];

            const res2 = await fetch(
                `http://localhost:8080/equipe/find/${item.idMembro}`
            );
            const j2 = await res2.json();
            const member = j2[0];

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
        <button class="delete" data-id="${
            item.idEmprestimo
        }"><img src="../images/icon-excluir.png" />Excluir</button>
        <button class="edit" data-id="${
            item.idEmprestimo
        }"><img src="../images/icon-editar.png" />Editar</button>
        <button class="history" data-id="${
            item.idEmprestimo
        }"><img src="../images/vistoria.png" />Vistoria</button>
      </td>
    `;
            tr.querySelector(".delete").addEventListener("click", () =>
                deleteEmprestimo(item.idEmprestimo)
            );
            tr.querySelector(".edit").addEventListener("click", () =>
                editEmprestimo(item.idEmprestimo)
            );
            tr.querySelector(".history").addEventListener("click", () => {
                vistoriaEmprestimo(item.idEmprestimo);
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
