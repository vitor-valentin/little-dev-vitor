const systemUser = document.getElementById("systemUser");
const hiddenForm = document.querySelector(".form-group.hidden");

systemUser.addEventListener("input", () => {
    hiddenForm.classList.toggle("hidden");
    hiddenForm.querySelector("input").setAttribute("required","required");
});