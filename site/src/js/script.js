document.addEventListener("DOMContentLoaded", () => {
    window.componentsLoaded.then(() => {
        const currentPage = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        const page = params.get("page");

        const sidebar = document.querySelector(".sidebar");
        const headerDashboard = document.getElementById("dashboardHeader");
        const headerEquipe = document.getElementById("equipeHeader");
        const headerEmprestimos = document.getElementById("emprestimosHeader");

        let pagePromise;

        switch(currentPage) {
            case "/":
                headerDashboard.classList.add("active");

                if(page == "2") {
                    pagePromise = fetch('/pages/dashboard-avisos.html')
                    .then(res => res.text())
                    .then(html => {
                        document.getElementById("content-container").innerHTML = html;

                        import('../js/dashboard.js');
                    });
                } else {
                    pagePromise = fetch('/pages/dashboard-main.html')
                    .then(res => res.text())
                    .then(html => {
                        document.getElementById('content-container').innerHTML = html;
                    });
                }
                
                break;
            case "/equipe":
                headerEquipe.classList.add("active");
                break;
            case "/emprestimos":
                headerEmprestimos.classList.add("active");
                break;
            case "/areas":
                pagePromise = fetch('/pages/areas.html')
                .then(res => res.text())
                .then(html => {
                    document.getElementById("content-container").innerHTML = html;
                });

                sidebar.querySelector(".nav-menu .active").classList.remove("active");
                sidebar.querySelector(".nav-menu #sideAreas").classList.add("active");

                break;
        }

        window.pageLoaded = Promise.all([pagePromise]);

        const activeHeader = document.querySelector(".pages.active");
        if(activeHeader){
            const mainPage = activeHeader.querySelector("#page-main");
            const page2 = activeHeader.querySelector("#page-2");
            const page3 = activeHeader.querySelector("#page-3");
        }
        
        try{
            switch(page) {
                case "2":
                    mainPage.classList.remove("active");
                    page2.classList.add("active");
                    break;
                case "3":
                    mainPage.classList.remove("active");
                    page3.classList.add("active");
                    break;
            }
        } catch(err) {
            mainPage.classList.add("active");
            //TODO: Add notification!
            console.error("Nenhuma página com este id nesta seção!");
        }

        if(activeHeader){
            activeHeader.querySelectorAll("p").forEach((element) => {
                element.addEventListener("click", (e) => {
                    const active = e.target.classList.contains("active");

                    if(!active) {
                        const page = e.target.id == "page-main" ? "1" : e.target.id == "page-2" ? "2" : "3";
                        params.set("page", page);
                        window.location.search = params.toString();
                    }

                })
            });
        }

    });
});