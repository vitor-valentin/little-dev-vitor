const saveConfigBtn = document.getElementById("saveConfig");
const tempoDuracaoAvisos = document.getElementById("tempoDuracaoAvisos");
const notificacoesSistema = document.getElementById("notificacoesSistema");
const modoDaltonico = document.getElementById("modoDaltonico");
const temaCor = document.getElementById("temaCor");
const somNotificacoes = document.getElementById("somNotificacoes");
const volumeNotificacoes = document.getElementById("volumeNotificacoes");
const testarVolume = document.querySelector(".testar");
const displayVolume = document.querySelector(".configInputBelow span");
const notification = document.getElementById("notification");

async function loadConfig() {
    const id = await window.getUserId();

    const response = await fetch(`http://localhost:8080/config/id=${id}`);
    const json = await response.json();

    tempoDuracaoAvisos.value = json.tempoAvisos;
    notificacoesSistema.checked = json.notificacoesSistema;
    modoDaltonico.checked = json.modoDaltonismo;
    temaCor.value = json.temaCor;
    somNotificacoes.checked = json.somNotificacoes;
    volumeNotificacoes.value = json.volumeNotificacao;
    notification.volume = json.volumeNotificacao / 100;
    displayVolume.textContent = `${json.volumeNotificacao}%`;
}

async function saveConfig() {
    const valueTmpDurAvisos = tempoDuracaoAvisos.value;
    const valueNotSistema = notificacoesSistema.checked;
    const valueModoDalt = modoDaltonico.checked;
    const valueTema = temaCor.value;
    const valueSomNot = somNotificacoes.checked;
    const valueVolNot = volumeNotificacoes.value;

    const values = {valueTmpDurAvisos, valueNotSistema, valueModoDalt, valueTema, valueSomNot, valueVolNot};

    const response = await fetch("http://localhost:8080/config", {
        method: "PUT",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(values)
    });
    //TODO: add success notification
}

tempoDuracaoAvisos.addEventListener("change", () => {
    if(tempoDuracaoAvisos.value > 30) {
        tempoDuracaoAvisos.value = 30;
    } else if(tempoDuracaoAvisos.value < 1) {
        tempoDuracaoAvisos.value = 1;
    }
});

volumeNotificacoes.addEventListener("input", () => {
    let value = volumeNotificacoes.value;
    displayVolume.textContent = `${value}%`;
    notification.volume = value / 100;
});

testarVolume.addEventListener("click", () => {
    notification.play();
})

saveConfigBtn.addEventListener("click", () => {
    saveConfig();
});

loadConfig();