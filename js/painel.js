// ============================================================
// PHOTOSTUDIO - PAINEL.JS
// ============================================================

const nomeUsuario =
    document.getElementById("nomeUsuario");

const btnSair =
    document.getElementById("btnSair");

const listaGalerias =
    document.getElementById("listaGalerias");

const mensagemPainel =
    document.getElementById("mensagemPainel");

const totalGalerias =
    document.getElementById("totalGalerias");

const totalFotos =
    document.getElementById("totalFotos");

const totalSelecionadas =
    document.getElementById("totalSelecionadas");


// ============================================================
// VERIFICAR LOGIN
// ============================================================

async function verificarLogin() {

    try {

        const resposta =
            await fetch(
                "/api/usuario"
            );


        if (!resposta.ok) {

            window.location.href =
                "/login.html";

            return false;
        }


        const dados =
            await resposta.json();


        if (
            nomeUsuario &&
            dados.usuario
        ) {

            nomeUsuario.textContent =
                `Olá, ${dados.usuario.nome}`;
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
// CARREGAR GALERIAS
// ============================================================

async function carregarGalerias() {

    try {

        const resposta =
            await fetch(
                "/api/galerias"
            );


        if (
            resposta.status === 401
        ) {

            window.location.href =
                "/login.html";

            return;
        }


        const dados =
            await resposta.json();


        if (!resposta.ok) {

            mostrarMensagem(
                dados.erro ||
                "Não foi possível carregar as galerias.",
                "erro"
            );

            return;
        }


        const galerias =
            dados.galerias || [];


        atualizarResumo(
            galerias
        );


        mostrarGalerias(
            galerias
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar galerias:",
            erro
        );


        mostrarMensagem(
            "Não foi possível conectar ao servidor.",
            "erro"
        );

    }
}


// ============================================================
// MOSTRAR GALERIAS
// ============================================================

function mostrarGalerias(
    galerias
) {

    if (!listaGalerias) {
        return;
    }


    listaGalerias.innerHTML =
        "";


    if (
        !galerias ||
        galerias.length === 0
    ) {

        listaGalerias.innerHTML = `

            <div class="galeria-vazia">

                <div class="galeria-vazia-icone">
                    📸
                </div>

                <h3>
                    Nenhuma galeria criada
                </h3>

                <p>
                    Crie sua primeira galeria
                    para começar a enviar fotos
                    aos seus clientes.
                </p>

                <button
                    type="button"
                    onclick="window.location.href='/nova-galeria.html'"
                >
                    + Criar primeira galeria
                </button>

            </div>

        `;

        return;
    }


    galerias.forEach(
        (galeria) => {

            const card =
                document.createElement(
                    "article"
                );


            card.classList.add(
                "card-galeria"
            );


            const marcaAgua =
                galeria.marca_agua
                    ? "Ativada"
                    : "Desativada";


            const download =
                galeria.permitir_download
                    ? "Permitido"
                    : "Bloqueado";


            const limite =
                Number(
                    galeria.limite_selecao
                ) > 0
                    ? galeria.limite_selecao
                    : "Sem limite";


            const statusTexto =
                formatarStatus(
                    galeria.status
                );


            const quantidadeFotos =
                Number(
                    galeria.quantidade_fotos
                ) || 0;


            const selecionadas =
                Number(
                    galeria.quantidade_selecionadas
                ) || 0;


            card.innerHTML = `

                <div class="card-galeria-topo">

                    <div>

                        <span class="galeria-id">
                            Galeria #${galeria.id}
                        </span>

                        <h3>
                            ${escaparHTML(
                                galeria.nome
                            )}
                        </h3>

                    </div>


                    <span class="status-galeria">
                        ${escaparHTML(
                            statusTexto
                        )}
                    </span>

                </div>


                <div class="cliente-galeria">

                    <strong>
                        👤 ${escaparHTML(
                            galeria.cliente_nome
                        )}
                    </strong>

                    ${
                        galeria.cliente_email
                            ? `
                                <span>
                                    ${escaparHTML(
                                        galeria.cliente_email
                                    )}
                                </span>
                            `
                            : ""
                    }

                    ${
                        galeria.cliente_telefone
                            ? `
                                <span>
                                    ${escaparHTML(
                                        galeria.cliente_telefone
                                    )}
                                </span>
                            `
                            : ""
                    }

                </div>


                <div class="dados-galeria">

                    <div>

                        <strong>
                            ${quantidadeFotos}
                        </strong>

                        <span>
                            Fotos
                        </span>

                    </div>


                    <div>

                        <strong>
                            ${selecionadas}
                        </strong>

                        <span>
                            Selecionadas
                        </span>

                    </div>


                    <div>

                        <strong>
                            ${escaparHTML(
                                String(limite)
                            )}
                        </strong>

                        <span>
                            Limite
                        </span>

                    </div>

                </div>


                <div class="configuracoes-galeria">

                    <span>
                        💧 Marca d'água:
                        <strong>
                            ${marcaAgua}
                        </strong>
                    </span>

                    <span>
                        ⬇️ Download:
                        <strong>
                            ${download}
                        </strong>
                    </span>

                </div>


                <div class="acoes-galeria">

                    <button
                        type="button"
                        class="botao-abrir"
                        onclick="abrirGaleria(${galeria.id})"
                    >
                        Abrir galeria
                    </button>


                    <button
                        type="button"
                        class="botao-upload"
                        onclick="enviarFotos(${galeria.id})"
                    >
                        Enviar fotos
                    </button>

                </div>

            `;


            listaGalerias.appendChild(
                card
            );

        }
    );
}


// ============================================================
// RESUMO DO PAINEL
// ============================================================

function atualizarResumo(
    galerias
) {

    let quantidadeGalerias =
        galerias.length;


    let quantidadeFotos =
        0;


    let quantidadeSelecionadas =
        0;


    galerias.forEach(
        (galeria) => {

            quantidadeFotos +=
                Number(
                    galeria.quantidade_fotos
                ) || 0;


            quantidadeSelecionadas +=
                Number(
                    galeria.quantidade_selecionadas
                ) || 0;

        }
    );


    if (totalGalerias) {

        totalGalerias.textContent =
            quantidadeGalerias;
    }


    if (totalFotos) {

        totalFotos.textContent =
            quantidadeFotos;
    }


    if (totalSelecionadas) {

        totalSelecionadas.textContent =
            quantidadeSelecionadas;
    }
}


// ============================================================
// ABRIR GALERIA
// ============================================================

function abrirGaleria(
    galeriaId
) {

    window.location.href =
        `/galeria-admin.html?id=${galeriaId}`;

}


// ============================================================
// ENVIAR FOTOS
// ============================================================

function enviarFotos(
    galeriaId
) {

    window.location.href =
        `/upload.html?id=${galeriaId}`;

}


// ============================================================
// FORMATAR STATUS
// ============================================================

function formatarStatus(
    status
) {

    switch (status) {

        case "aguardando_selecao":

            return "Aguardando seleção";


        case "selecao_finalizada":

            return "Seleção finalizada";


        case "aguardando_valor":

            return "Aguardando valor";


        case "valor_definido":

            return "Valor definido";


        case "aguardando_pagamento":

            return "Aguardando pagamento";


        case "pago":

            return "Pago";


        default:

            return status ||
                "Sem status";

    }

}


// ============================================================
// LOGOUT
// ============================================================

if (btnSair) {

    btnSair.addEventListener(
        "click",
        async () => {

            try {

                await fetch(
                    "/api/logout",
                    {
                        method:
                            "POST"
                    }
                );


                window.location.href =
                    "/login.html";


            } catch (erro) {

                console.error(
                    "Erro ao sair:",
                    erro
                );


                window.location.href =
                    "/login.html";

            }

        }
    );

}


// ============================================================
// MENSAGEM
// ============================================================

function mostrarMensagem(
    texto,
    tipo
) {

    if (!mensagemPainel) {
        return;
    }


    mensagemPainel.textContent =
        texto;


    mensagemPainel.classList.remove(
        "mensagem-sucesso",
        "mensagem-erro",
        "mensagem-normal"
    );


    if (
        tipo === "erro"
    ) {

        mensagemPainel.classList.add(
            "mensagem-erro"
        );

    } else if (
        tipo === "sucesso"
    ) {

        mensagemPainel.classList.add(
            "mensagem-sucesso"
        );

    } else {

        mensagemPainel.classList.add(
            "mensagem-normal"
        );

    }

}


// ============================================================
// ESCAPAR HTML
// ============================================================

function escaparHTML(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";
    }


    return String(
        valor
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// ============================================================
// INICIAR PAINEL
// ============================================================

async function iniciarPainel() {

    const logado =
        await verificarLogin();


    if (!logado) {
        return;
    }


    await carregarGalerias();

}


iniciarPainel();
