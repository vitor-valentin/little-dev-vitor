document.addEventListener("DOMContentLoaded", () => {
    const sidebarPromise = fetch("/components/sidebar.html")
        .then((res) => res.text())
        .then((html) => {
            document.getElementById("sidebar-container").innerHTML = html;
        });

    const headerPromise = fetch("/components/header.html")
        .then((res) => res.text())
        .then((html) => {
            document.getElementById("headerContent-container").innerHTML = html;
        });

    window.componentsLoaded = Promise.all([sidebarPromise, headerPromise]);
});

window.getUserId = async function getUserId() {
    const res = await fetch("http://localhost:8080/getId", {
        method: "GET",
    });
    const response = await res.json();
    return response.id;
};

window.showNotification = async function showNotification(
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

    document.body.appendChild(notification);

    const id = await window.getUserId();

    const response = await fetch(`http://localhost:8080/config/id=${id}`);
    const json = await response.json();
    const soundNot = json.volumeNotificacao / 100;

    sound.volume = soundNot;
    sound.play();

    setTimeout(() => {
        notification.classList.add("hide");
        notification.addEventListener("animationend", () => {
            notification.remove();
        });
    }, duration);
};
