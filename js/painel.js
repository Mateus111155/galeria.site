async function verificarLogin() {

    try {

        const resposta = await fetch("/api/usuario");

        if (!resposta.ok) {
            window.location.href = "/login.html";
            return;
        }

        const dados = await resposta.json();

        document.getElementById("nomeUsuario").textContent =
            `Olá, ${dados.usuario.nome}`;

    } catch (erro) {

        console.error(erro);

        window.location.href = "/login.html";
    }
}

document
    .getElementById("btnSair")
    .addEventListener("click", async () => {

        await fetch("/api/logout", {
            method: "POST"
        });

        window.location.href = "/login.html";
    });

verificarLogin();
