document.addEventListener("DOMContentLoaded", () => {
    window.componentsLoaded.then(async () => {
        const currentPage = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        const page = params.get("page");

        const username = document.querySelector(".user p");
        const sidebar = document.querySelector(".sidebar");
        const headerDashboard = document.getElementById("dashboardHeader");
        const headerEquipe = document.getElementById("equipeHeader");
        const headerEmprestimos = document.getElementById("emprestimosHeader");

        let pagePromise;

        const userInfo = await getUserInfo();
        const nomeMembro = userInfo.nomeMembro.split(" ")[0].toUpperCase();
        username.textContent = nomeMembro;

        switch (currentPage) {
            case "/":
                headerDashboard.classList.add("active");

                if (page == "2") {
                    pagePromise = fetch("/pages/dashboard-avisos.html")
                        .then((res) => res.text())
                        .then((html) => {
                            document.getElementById(
                                "content-container"
                            ).innerHTML = html;

                            import("./dashboard.js");
                        });
                } else {
                    pagePromise = fetch("/pages/dashboard-main.html")
                        .then((res) => res.text())
                        .then((html) => {
                            document.getElementById(
                                "content-container"
                            ).innerHTML = html;
                        });
                }

                break;
            case "/equipe":
                headerEquipe.classList.add("active");

                if (page == "2") {
                    pagePromise = fetch("/pages/equipe-avisos.html")
                        .then((res) => res.text())
                        .then((html) => {
                            document.getElementById(
                                "content-container"
                            ).innerHTML = html;

                            import("./equipe.js");
                        });
                } else {
                    pagePromise = fetch("/pages/equipe-main.html")
                        .then((res) => res.text())
                        .then((html) => {
                            document.getElementById(
                                "content-container"
                            ).innerHTML = html;

                            import("./equipe.js");
                        });
                }

                sidebar
                    .querySelector(".nav-menu .active")
                    .classList.remove("active");
                sidebar
                    .querySelector(".nav-menu #sideEquipe")
                    .classList.add("active");

                break;
            case "/emprestimos":
                headerEmprestimos.classList.add("active");

                if (page == "3") {
                    pagePromise = fetch("/pages/emprestimos-relatorios.html")
                        .then((res) => res.text())
                        .then((html) => {
                            document.getElementById(
                                "content-container"
                            ).innerHTML = html;

                            import("./emprestimos.js");
                        });
                } else if (page == "2") {
                    pagePromise = fetch("/pages/emprestimos-agendar.html")
                        .then((res) => res.text())
                        .then((html) => {
                            document.getElementById(
                                "content-container"
                            ).innerHTML = html;

                            import("./emprestimos.js");
                        });
                } else {
                    pagePromise = fetch("/pages/emprestimos-main.html")
                        .then((res) => res.text())
                        .then((html) => {
                            document.getElementById(
                                "content-container"
                            ).innerHTML = html;

                            import("./emprestimos.js");
                        });
                }

                sidebar
                    .querySelector(".nav-menu .active")
                    .classList.remove("active");
                sidebar
                    .querySelector(".nav-menu #sideEmprestimos")
                    .classList.add("active");

                break;
            case "/areas":
                pagePromise = fetch("/pages/areas.html")
                    .then((res) => res.text())
                    .then((html) => {
                        document.getElementById("content-container").innerHTML =
                            html;

                        import("./areas.js");
                    });

                sidebar
                    .querySelector(".nav-menu .active")
                    .classList.remove("active");
                sidebar
                    .querySelector(".nav-menu #sideAreas")
                    .classList.add("active");

                break;
            case "/equipamentos":
                pagePromise = fetch("/pages/equipamentos.html")
                    .then((res) => res.text())
                    .then((html) => {
                        document.getElementById("content-container").innerHTML =
                            html;
                        
                        import("./equipamentos.js");
                    });

                sidebar
                    .querySelector(".nav-menu .active")
                    .classList.remove("active");
                sidebar
                    .querySelector(".nav-menu #sideEquipamentos")
                    .classList.add("active");
                break;
            case "/config":
                pagePromise = fetch("/pages/config.html")
                    .then((res) => res.text())
                    .then((html) => {
                        document.getElementById("content-container").innerHTML =
                            html;

                        import("./config.js");
                    });

                sidebar
                    .querySelector(".nav-menu .active")
                    .classList.remove("active");
                sidebar
                    .querySelector(".nav-bottom #config")
                    .classList.add("active");
                break;
            case "/vistoria":
                pagePromise = fetch("/pages/vistoria.html")
                    .then((res) => res.text())
                    .then((html) => {
                        document.getElementById("content-container").innerHTML =
                            html;
                    });

                sidebar
                    .querySelector(".nav-menu .active")
                    .classList.remove("active");
                sidebar
                    .querySelector(".nav-menu #sideEmprestimos")
                    .classList.add("active");

                break;
        }

        window.pageLoaded = pagePromise;

        const activeHeader = document.querySelector(".pages.active");
        if (activeHeader) {
            const mainPage = activeHeader.querySelector("#page-main");
            const page2 = activeHeader.querySelector("#page-2");
            const page3 = activeHeader.querySelector("#page-3");

            try {
                switch (page) {
                    case "2":
                        mainPage.classList.remove("active");
                        page2.classList.add("active");
                        break;
                    case "3":
                        mainPage.classList.remove("active");
                        page3.classList.add("active");
                        break;
                }
            } catch (err) {
                mainPage.classList.add("active");
                showNotification("failure", "Falha!", "Nenhuma página com este id nesta seção!");
            }

            activeHeader.querySelectorAll("p").forEach((element) => {
                element.addEventListener("click", (e) => {
                    const active = e.target.classList.contains("active");

                    if (!active) {
                        const page =
                            e.target.id == "page-main"
                                ? "1"
                                : e.target.id == "page-2"
                                ? "2"
                                : "3";
                        params.set("page", page);
                        window.location.search = params.toString();
                    }
                });
            });
        }
        window.pageLoaded.then(async () => {
            const pageTable = document.querySelector(".pageTable");
            const pageEditAdd = document.querySelector(".pageEditAdd");
            const addButton = document.querySelector(".add-button");
            const returnButton = document.querySelector(".return");

            const filterOpen = document.querySelector(".filter");
            const filterClose = document.querySelector(".closeFilter");
            const filterOverlay = document.querySelector(".overlayFilter");

            function togglePage() {
                pageTable.classList.toggle("active");
                pageEditAdd.classList.toggle("active");
            }

            if (pageTable && pageEditAdd) {
                addButton.addEventListener("click", () => {
                    togglePage();
                });

                returnButton.addEventListener("click", () => {
                    togglePage();
                });
            }

            if (filterOverlay) {
                filterOpen.addEventListener("click", () => {
                    filterOverlay.classList.add("active");
                });

                filterClose.addEventListener("click", () => {
                    filterOverlay.classList.remove("active");
                });
            }
        });
    });
});
