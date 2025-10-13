// Função genérica para carrossel
function iniciarCarrossel(containerSelector, options = {}) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const slides = container.querySelectorAll(
        ".aviso, .notificacoes-slide"
    );
    let dots;
    if(containerSelector == ".avisos-wrapper") {
        dots = document.querySelector(".dots").querySelectorAll(".dot");
    }else {
        dots = container.querySelectorAll(".dot");
    }
    const left = container.querySelector(".arrow.left, .move.left");
    const right = container.querySelector(".arrow.right, .move.right");

    let index = 0;

    function showSlide(n) {
        slides.forEach((s) => s.classList.remove("active"));
        dots.forEach((d) => d.classList.remove("active"));

        if (slides[n]) slides[n].classList.add("active");
        if (dots[n]) dots[n].classList.add("active");
    }

    if (left) {
        left.addEventListener("click", () => {
            index = (index - 1 + slides.length) % slides.length;
            showSlide(index);
        });
    }

    if (right) {
        right.addEventListener("click", () => {
            index = (index + 1) % slides.length;
            showSlide(index);
        });
    }

    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => {
            index = i;
            showSlide(index);
        });
    });

    // Inicializa o primeiro slide
    showSlide(index);
}

// Inicializa os carrosséis
iniciarCarrossel(".avisos-wrapper");
iniciarCarrossel("#notificacoes");
iniciarCarrossel("#alertas");
