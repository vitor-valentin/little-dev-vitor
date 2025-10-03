
async function login() {
    const emailValue = document.getElementById('email').value;
    const passwdValue = document.getElementById('passwd').value;

    if(!emailValue || !passwdValue) {
        //Mudar para notificação
        console.error("Preencha todos os campos para entrar."); 
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/login', {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({emailValue, passwdValue})
        });

        if(response.status == 200) {
            location.reload();
        }
    } catch (error) {
        console.error('Erro ao tentar logar: ', error);
    }
}