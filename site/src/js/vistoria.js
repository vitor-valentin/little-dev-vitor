const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const equipamento = document.getElementById("equipmentInfo");
const membro = document.getElementById("memberInfo");
const codigo = document.getElementById("codeEqInfo");
const recebimento = document.getElementById("dateReceived");
const devolucao = document.getElementById("dateDevolution");
const dataAtual = document.getElementById("dateNow");
const textAtrasado = document.querySelector("#timeNow p");
const condDeclarationUsr = document.querySelector(
    "label[for='conditionDeclaration'] span"
);
const userInfo = await getUserInfo();
const finalizar = document.querySelector(".buttonsVistoria .done");
const voltar = document.querySelector(".buttonsVistoria .return");

const resEp = await fetch(`http://localhost:8080/emprestimos/find/${id}`);
const jsonEp = await resEp.json();

const emp = jsonEp[0];

const resEq = await fetch(
    `http://localhost:8080/equipamentos/find/${emp.idEquipamento}`
);
const jsonEq = await resEq.json();

const resMb = await fetch(`http://localhost:8080/equipe/find/${emp.idMembro}`);
const jsonMb = await resMb.json();

function formatDate(value) {
    const date = new Date(value);

    const pad = (n) => n.toString().padStart(2, "0");

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function currentDatetimeLocal() {
    const date = new Date();

    const pad = (n) => n.toString().padStart(2, "0");

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function atrasoEntre(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    if (d1 <= d2) return null;

    const diffMs = d1 - d2;

    const diffMinutes = Math.floor(diffMs / 1000 / 60);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    let texto = "Atraso de ";

    if (hours > 0) texto += `${hours} hora${hours > 1 ? "s" : ""}`;
    if (hours > 0 && minutes > 0) texto += " e ";
    if (minutes > 0) texto += `${minutes} minuto${minutes > 1 ? "s" : ""}`;

    return texto;
}

function isEmpty(str) {
    return !str || str.trim() === "";
}

function toMySQLDatetime(datetimeLocal) {
    let mysqlDatetime = datetimeLocal.replace("T", " ");
    if (!mysqlDatetime.match(/:\d{2}$/)) {
        mysqlDatetime += ":00";
    }
    return mysqlDatetime;
}

voltar.addEventListener("click", () => {
    window.location.href = "http://localhost:8080/emprestimos";
});

equipamento.value = jsonEq[0].nomeEquipamento;
membro.value = jsonMb[0].nomeMembro;
codigo.value = jsonEq[0].codEquipamento;
recebimento.value = formatDate(emp.dataRecebimento);
devolucao.value = formatDate(emp.dataDevolucao);

if (emp.dataDevolvido == "1900-01-01T04:07:29.000Z") {
    dataAtual.value = currentDatetimeLocal();
    textAtrasado.textContent = atrasoEntre(dataAtual.value, devolucao.value);
    if (textAtrasado.textContent) dataAtual.classList.add("atrasado");

    dataAtual.addEventListener("input", () => {
        textAtrasado.textContent = atrasoEntre(
            dataAtual.value,
            devolucao.value
        );
        if (textAtrasado.textContent) dataAtual.classList.add("atrasado");
        else dataAtual.classList.remove("atrasado");
    });

    condDeclarationUsr.style.margin = "0 -7px";
    condDeclarationUsr.textContent = userInfo.nomeMembro;

    finalizar.addEventListener("click", async () => {
        const workingEquipment =
            document.getElementById("workingEquipment").checked;
        const degradationSigns =
            document.getElementById("degradationSigns").checked;
        const cleanWorkingCond =
            document.getElementById("cleanWorkingCond").checked;
        const acessoriesPresent =
            document.getElementById("acessoriesPresent").checked;
        const idTag = document.getElementById("idTag").checked;
        const fallingGear = document.getElementById("fallingGear").checked;
        const rippedCables = document.getElementById("rippedCables").checked;
        const turningOn = document.getElementById("turningOn").checked;
        const badSmell = document.getElementById("badSmell").checked;
        const mobileParts = document.getElementById("mobileParts").checked;
        const transportBag = document.getElementById("transportBag").checked;
        const workingDisplays =
            document.getElementById("workingDisplays").checked;
        const workingBattery =
            document.getElementById("workingBattery").checked;
        const conditionDeclaration = document.getElementById(
            "conditionDeclaration"
        ).checked;
        const obsVistoria = stripHTMLTags(
            document.getElementById("obsVistoria").value
        );
        const devolvidoPor = stripHTMLTags(
            document.getElementById("devolvidoPor").value
        );

        if (isEmpty(devolvidoPor)) {
            showNotification(
                "failure",
                "Falha!",
                "Você deve preencher quem devolveu o equipamento!"
            );
            return;
        }

        let allObs = "";

        if (!workingEquipment)
            allObs += "A opção de funcionamento correto não foi marcada\n";
        if (!degradationSigns)
            allObs += "A opção de sinais de degradação não foi marcada\n";
        if (!cleanWorkingCond)
            allObs +=
                "A opção de limpeza e condições adequadas não foi marcada\n";
        if (!acessoriesPresent)
            allObs += "A opção de acessórios presentes não foi marcada\n";
        if (!idTag)
            allObs += "A opção de identificação/etiqueta não foi marcada\n";
        if (!fallingGear)
            allObs += "A opção de peças soltas ou com folga não foi marcada\n";
        if (!rippedCables)
            allObs += "A opção de cabos/fios em bom estado não foi marcada\n";
        if (!turningOn)
            allObs += "A opção de ligar/desligar normalmente não foi marcada\n";
        if (!badSmell)
            allObs += "A opção de mau cheiro ou ruídos não foi marcada\n";
        if (!mobileParts)
            allObs += "A opção de partes móveis funcionando não foi marcada\n";
        if (!transportBag)
            allObs += "A opção de estojo/capa de transporte não foi marcada\n";
        if (!workingDisplays)
            allObs += "A opção de displays funcionando não foi marcada\n";
        if (!workingBattery)
            allObs +=
                "A opção de bateria/carregamento em bom estado não foi marcada\n";
        if (!conditionDeclaration)
            allObs +=
                "A opção de declaração de boas condições não foi marcada\n";
        if (atrasoEntre(dataAtual.value, devolucao.value))
            allObs += `O equipamento foi devolvido com um ${atrasoEntre(
                dataAtual.value,
                devolucao.value
            )}\n`;
        console.log(devolvidoPor != jsonMb[0].nomeMembro);
        if (devolvidoPor != jsonMb[0].nomeMembro)
            allObs += `O equipamento não foi devolvido por quem o recebeu, foi devolvido por: ${devolvidoPor}\n`;

        allObs += `Observações do Usuário: ${
            !isEmpty(obsVistoria) ? obsVistoria : "Nenhuma"
        }`;

        const dataDevolvido = toMySQLDatetime(dataAtual.value);
        const userId = userInfo.idMembro;

        const confirm = await showConfirm(
            "normal",
            "Confirmar Vistoria",
            "Tem certeza que deseja finalizar a vistoria?"
        );

        if (confirm) {
            try {
                const res = await fetch("http://localhost:8080/vistoria", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id,
                        dataDevolvido,
                        devolvidoPor,
                        userId,
                        allObs,
                    }),
                });

                if (!res.ok) throw new Error(await res.json());

                showNotification(
                    "success",
                    "Sucesso!",
                    "A vistoria foi realizada com sucesso!"
                );
                finalizar.remove();
                dataAtual.setAttribute("disabled", "true");
                document
                    .querySelector("#devolvidoPor")
                    .setAttribute("disabled", "true");
            } catch (err) {
                console.error(err);
                showNotification(
                    "failure",
                    "Falha!",
                    "Houve um erro interno no servidor ao tentar validar a vistoria!"
                );
            }
        }
    });
} else {
    function marcarCheckboxesPorObs(obsVistoria) {
        const workingEquipment = document.getElementById("workingEquipment");
        const degradationSigns = document.getElementById("degradationSigns");
        const cleanWorkingCond = document.getElementById("cleanWorkingCond");
        const acessoriesPresent = document.getElementById("acessoriesPresent");
        const idTag = document.getElementById("idTag");
        const fallingGear = document.getElementById("fallingGear");
        const rippedCables = document.getElementById("rippedCables");
        const turningOn = document.getElementById("turningOn");
        const badSmell = document.getElementById("badSmell");
        const mobileParts = document.getElementById("mobileParts");
        const transportBag = document.getElementById("transportBag");
        const workingDisplays = document.getElementById("workingDisplays");
        const workingBattery = document.getElementById("workingBattery");
        const conditionDeclaration = document.getElementById(
            "conditionDeclaration"
        );
        const mapping = [
            {
                phrase: "A opção de funcionamento correto não foi marcada",
                checkbox: workingEquipment,
            },
            {
                phrase: "A opção de sinais de degradação não foi marcada",
                checkbox: degradationSigns,
            },
            {
                phrase: "A opção de limpeza e condições adequadas não foi marcada",
                checkbox: cleanWorkingCond,
            },
            {
                phrase: "A opção de acessórios presentes não foi marcada",
                checkbox: acessoriesPresent,
            },
            {
                phrase: "A opção de identificação/etiqueta não foi marcada",
                checkbox: idTag,
            },
            {
                phrase: "A opção de peças soltas ou com folga não foi marcada",
                checkbox: fallingGear,
            },
            {
                phrase: "A opção de cabos/fios em bom estado não foi marcada",
                checkbox: rippedCables,
            },
            {
                phrase: "A opção de ligar/desligar normalmente não foi marcada",
                checkbox: turningOn,
            },
            {
                phrase: "A opção de mau cheiro ou ruídos não foi marcada",
                checkbox: badSmell,
            },
            {
                phrase: "A opção de partes móveis funcionando não foi marcada",
                checkbox: mobileParts,
            },
            {
                phrase: "A opção de estojo/capa de transporte não foi marcada",
                checkbox: transportBag,
            },
            {
                phrase: "A opção de displays funcionando não foi marcada",
                checkbox: workingDisplays,
            },
            {
                phrase: "A opção de bateria/carregamento em bom estado não foi marcada",
                checkbox: workingBattery,
            },
            {
                phrase: "A opção de declaração de boas condições não foi marcada",
                checkbox: conditionDeclaration,
            },
        ];

        mapping.forEach((item) => {
            if (obsVistoria.includes(item.phrase)) {
                item.checkbox.checked = false;
            } else {
                item.checkbox.checked = true;
            }
        });
    }

    function getUsuarioObs(obsVistoria) {
        const marker = "Observações do Usuário:";
        const index = obsVistoria.indexOf(marker);

        if (index === -1) return "";
        return obsVistoria.slice(index + marker.length).trim();
    }

    const res = await fetch(`http://localhost:8080/equipe/find/${emp.idMembroVistoria}`);
    const json = await res.json();

    condDeclarationUsr.style.margin = "0 -7px";
    condDeclarationUsr.textContent = json[0].nomeMembro;

    dataAtual.setAttribute("disabled", "true");
    dataAtual.value = formatDate(emp.dataDevolvido);
    textAtrasado.textContent = atrasoEntre(dataAtual.value, devolucao.value);
    if (textAtrasado.textContent) dataAtual.classList.add("atrasado");

    document.querySelector("#devolvidoPor").setAttribute("disabled", "true");
    document.querySelector("#devolvidoPor").value = emp.devolvidoPor;

    document.querySelectorAll("input[type='checkbox']").forEach((item) => {
        item.setAttribute("disabled", "true");
    });
    marcarCheckboxesPorObs(emp.obsVistoria);

    document.getElementById("obsVistoria").setAttribute("disabled", "true");
    document.getElementById("obsVistoria").value = getUsuarioObs(
        emp.obsVistoria
    );

    finalizar.remove();
}
