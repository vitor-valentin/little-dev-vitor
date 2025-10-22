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

let currentDate = new Date();
let displayDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
);
let selectedDateTimes = []; // [["YYYY-MM-DD HH:MM", "YYYY-MM-DD HH:MM"]]
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
    console.log("Selecionados:", selectedDateTimes);
});

removerDataBtn.addEventListener("click", () => {
    if (!clickedDay) return;

    const dateStr = formatDate(clickedDay);
    selectedDateTimes = selectedDateTimes.filter(
        (dt) => !dt[0].startsWith(dateStr)
    );

    horarioModal.classList.add("hidden");
    updateCalendar();
    console.log("Removido:", selectedDateTimes);
});

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
    console.log("Datas aplicadas:", selectedDateTimes);
}

applyBtn.addEventListener("click", applyConfig);

updateCalendar();
