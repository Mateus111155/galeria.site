const formCadastro = document.getElementById("formCadastro");
const mensagem = document.getElementById("mensagem");

formCadastro.addEventListener("submit", async (event) => {

    event.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    mensagem.textContent = "Criando sua conta...";

    try {

        const resposta = await fetch("/api/cadastro", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                nome,
                email,
                senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            mensagem.textContent = dados.erro;
            return;
        }

        mensagem.textContent = "Conta criada! Redirecionando...";

        setTimeout(() => {
            window.location.href = "/login.html";
        }, 1200);

    } catch (erro) {

        console.error(erro);

        mensagem.textContent =
            "Não foi possível conectar ao servidor.";
    }
});
