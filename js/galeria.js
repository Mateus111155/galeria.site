// ============================================================
// PHOTOSTUDIO - GALERIA.JS
// ============================================================

const formGaleria = document.getElementById("formGaleria");
const mensagem = document.getElementById("mensagem");

const marcaAgua = document.getElementById("marcaAgua");
const configMarca = document.getElementById("configMarca");


// ============================================================
// MOSTRAR / ESCONDER CONFIGURAÇÃO DA MARCA D'ÁGUA
// ============================================================

function atualizarMarcaAgua() {

    if (!marcaAgua || !configMarca) {
        return;
    }

    if (marcaAgua.checked) {

        configMarca.style.display = "block";

    } else {

        configMarca.style.display = "none";

    }
}


// ============================================================
// EVENTO DA MARCA D'ÁGUA
// ============================================================

if (marcaAgua) {

    marcaAgua.addEventListener(
        "change",
        atualizarMarcaAgua
    );

    atualizarMarcaAgua();
}


// ============================================================
// VERIFICAR SE O USUÁRIO ESTÁ LOGADO
// ============================================================

async function verificarLogin() {

    try {

        const resposta = await fetch(
            "/api/usuario"
        );


        if (!resposta.ok) {

            window.location.href =
                "/login.html";

            return false;
        }


        return true;

    } catch (erro) {

        console.error(
            "Erro ao verificar login:",
            erro
        );


        window.location.href =
            "/login.html";

        return false;
    }
}


// ============================================================
// CRIAR GALERIA
// ============================================================

if (formGaleria) {

    formGaleria.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            // ==================================================
            // PEGAR OS CAMPOS
            // ==================================================

            const clienteNome =
                document
                    .getElementById("clienteNome")
                    .value
                    .trim();


            const clienteEmail =
                document
                    .getElementById("clienteEmail")
                    .value
                    .trim();


            const clienteTelefone =
                document
                    .getElementById("clienteTelefone")
                    .value
                    .trim();


            const nomeGaleria =
                document
                    .getElementById("nomeGaleria")
                    .value
                    .trim();


            const marcaAguaAtivada =
                document
                    .getElementById("marcaAgua")
                    .checked;


            const textoMarca =
                document
                    .getElementById("textoMarca")
                    .value
                    .trim();


            const permitirDownload =
                document
                    .getElementById("permitirDownload")
                    .checked;


            let limiteSelecao =
                parseInt(
                    document
                        .getElementById("limiteSelecao")
                        .value
                );


            // ==================================================
            // VALIDAÇÕES
            // ==================================================

            if (!clienteNome) {

                mostrarMensagem(
                    "Digite o nome do cliente.",
                    "erro"
                );

                return;
            }


            if (!nomeGaleria) {

                mostrarMensagem(
                    "Digite o nome da galeria.",
                    "erro"
                );

                return;
            }


            if (
                isNaN(limiteSelecao) ||
                limiteSelecao < 0
            ) {

                limiteSelecao = 0;
            }


            if (
                marcaAguaAtivada &&
                !textoMarca
            ) {

                mostrarMensagem(
                    "Digite o texto da marca d'água.",
                    "erro"
                );

                return;
            }


            // ==================================================
            // DESABILITAR BOTÃO
            // ==================================================

            const botao =
                formGaleria.querySelector(
                    "button[type='submit']"
                );


            if (botao) {

                botao.disabled = true;

                botao.textContent =
                    "Criando galeria...";
            }


            mostrarMensagem(
                "Criando galeria...",
                "normal"
            );


            // ==================================================
            // ENVIAR PARA O SERVIDOR
            // ==================================================

            try {

                const resposta =
                    await fetch(
                        "/api/galerias",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body: JSON.stringify({

                                clienteNome:
                                    clienteNome,

                                clienteEmail:
                                    clienteEmail,

                                clienteTelefone:
                                    clienteTelefone,

                                nomeGaleria:
                                    nomeGaleria,

                                marcaAgua:
                                    marcaAguaAtivada,

                                textoMarca:
                                    textoMarca,

                                permitirDownload:
                                    permitirDownload,

                                limiteSelecao:
                                    limiteSelecao

                            })

                        }
                    );


                const dados =
                    await resposta.json();


                // ==================================================
                // SESSÃO EXPIRADA
                // ==================================================

                if (
                    resposta.status === 401
                ) {

                    mostrarMensagem(
                        "Sua sessão expirou. Entre novamente.",
                        "erro"
                    );


                    setTimeout(
                        () => {

                            window.location.href =
                                "/login.html";

                        },
                        1500
                    );


                    return;
                }


                // ==================================================
                // ERRO
                // ==================================================

                if (!resposta.ok) {

                    mostrarMensagem(
                        dados.erro ||
                        "Não foi possível criar a galeria.",
                        "erro"
                    );


                    return;
                }


                // ==================================================
                // SUCESSO
                // ==================================================

                mostrarMensagem(
                    "Galeria criada com sucesso!",
                    "sucesso"
                );


                // ==================================================
                // REDIRECIONAR
                // ==================================================

                setTimeout(
                    () => {

                        window.location.href =
                            "/painel.html";

                    },
                    1200
                );


            } catch (erro) {

                console.error(
                    "Erro ao criar galeria:",
                    erro
                );


                mostrarMensagem(
                    "Não foi possível conectar ao servidor.",
                    "erro"
                );

            } finally {

                if (botao) {

                    botao.disabled = false;

                    botao.textContent =
                        "Criar galeria";
                }

            }

        }
    );
}


// ============================================================
// MOSTRAR MENSAGENS
// ============================================================

function mostrarMensagem(
    texto,
    tipo
) {

    if (!mensagem) {
        return;
    }


    mensagem.textContent =
        texto;


    mensagem.classList.remove(
        "mensagem-sucesso",
        "mensagem-erro",
        "mensagem-normal"
    );


    if (tipo === "sucesso") {

        mensagem.classList.add(
            "mensagem-sucesso"
        );

    } else if (tipo === "erro") {

        mensagem.classList.add(
            "mensagem-erro"
        );

    } else {

        mensagem.classList.add(
            "mensagem-normal"
        );

    }

}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

verificarLogin();
