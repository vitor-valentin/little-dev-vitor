
async function showNotification(
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

    document.getElementById("notification-container").appendChild(notification);

    setTimeout(() => {
        notification.classList.add("hide");
        notification.addEventListener("animationend", () => {
            notification.remove();
        });
    }, duration);
};

async function login() {
    const emailValue = document.getElementById('email').value;
    const passwdValue = document.getElementById('passwd').value;

    if(!emailValue || !passwdValue) {
        window.showNotification("failure", "Falha!", "Preencha todos os campos para entrar.");
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/login', {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({emailValue, passwdValue})
        });
        
        if(!response.ok) throw new Error("");

        if(response.status == 200) {
            location.reload();
        }
    } catch (error) {
        showNotification("failure", "Falha!", "Login ou senha incorretos!");
        console.error('Erro ao tentar logar: ', error);
    }
}