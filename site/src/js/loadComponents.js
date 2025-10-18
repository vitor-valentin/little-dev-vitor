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
