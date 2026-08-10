// ============================================================
// PHOTOSTUDIO - SERVER.JS
// ============================================================

const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();

const PORT = process.env.PORT || 3000;


// ============================================================
// PASTAS DO PROJETO
// ============================================================

const PUBLIC_DIR = path.join(__dirname, "public");
const CSS_DIR = path.join(__dirname, "css");
const JS_DIR = path.join(__dirname, "js");
const DATABASE_DIR = path.join(__dirname, "database");


// Cria a pasta database caso não exista
if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR, {
        recursive: true
    });
}


// ============================================================
// BANCO DE DADOS
// ============================================================

const DATABASE_PATH = path.join(
    DATABASE_DIR,
    "banco.db"
);


const db = new sqlite3.Database(
    DATABASE_PATH,
    (erro) => {

        if (erro) {

            console.error(
                "❌ Erro ao abrir banco de dados:",
                erro
            );

        } else {

            console.log(
                "✅ Banco de dados conectado."
            );

            criarTabelas();
        }
    }
);


// ============================================================
// CRIAÇÃO DAS TABELAS
// ============================================================

function criarTabelas() {

    db.serialize(() => {

        // ====================================================
        // USUÁRIOS / FOTÓGRAFOS
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS usuarios (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                nome TEXT NOT NULL,

                email TEXT NOT NULL UNIQUE,

                senha TEXT NOT NULL,

                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);


        // ====================================================
        // CLIENTES
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS clientes (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                usuario_id INTEGER NOT NULL,

                nome TEXT NOT NULL,

                email TEXT,

                telefone TEXT,

                senha TEXT,

                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY(usuario_id)
                REFERENCES usuarios(id)
            )
        `);


        // ====================================================
        // GALERIAS
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS galerias (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                usuario_id INTEGER NOT NULL,

                cliente_id INTEGER NOT NULL,

                nome TEXT NOT NULL,

                marca_agua INTEGER DEFAULT 1,

                texto_marca_agua TEXT DEFAULT 'PhotoStudio',

                permitir_download INTEGER DEFAULT 0,

                limite_selecao INTEGER DEFAULT 0,

                valor REAL DEFAULT NULL,

                status TEXT DEFAULT 'aguardando_selecao',

                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY(usuario_id)
                REFERENCES usuarios(id),

                FOREIGN KEY(cliente_id)
                REFERENCES clientes(id)
            )
        `);


        // ====================================================
        // FOTOS
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS fotos (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                galeria_id INTEGER NOT NULL,

                nome_arquivo TEXT NOT NULL,

                arquivo_original TEXT NOT NULL,

                arquivo_preview TEXT,

                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY(galeria_id)
                REFERENCES galerias(id)
            )
        `);


        // ====================================================
        // SELEÇÕES
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS selecoes (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                galeria_id INTEGER NOT NULL,

                foto_id INTEGER NOT NULL,

                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

                UNIQUE(galeria_id, foto_id),

                FOREIGN KEY(galeria_id)
                REFERENCES galerias(id),

                FOREIGN KEY(foto_id)
                REFERENCES fotos(id)
            )
        `);


        // ====================================================
        // CONFIGURAÇÕES DO ESTÚDIO
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS configuracoes (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                usuario_id INTEGER NOT NULL UNIQUE,

                nome_estudio TEXT DEFAULT 'PhotoStudio',

                telefone TEXT,

                email TEXT,

                instagram TEXT,

                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY(usuario_id)
                REFERENCES usuarios(id)
            )
        `);


        console.log(
            "✅ Tabelas verificadas/criadas."
        );

    });

}


// ============================================================
// CONFIGURAÇÕES DO EXPRESS
// ============================================================

app.use(
    express.json({
        limit: "10mb"
    })
);


app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);


// ============================================================
// SESSÃO
// ============================================================

app.use(

    session({

        secret:
            process.env.SESSION_SECRET ||
            "photostudio-chave-desenvolvimento",

        resave: false,

        saveUninitialized: false,

        cookie: {

            httpOnly: true,

            sameSite: "lax",

            maxAge:
                1000 *
                60 *
                60 *
                24
        }

    })

);


// ============================================================
// ARQUIVOS ESTÁTICOS
// ============================================================

// HTML
app.use(
    express.static(PUBLIC_DIR)
);


// CSS
app.use(
    "/css",
    express.static(CSS_DIR)
);


// JavaScript
app.use(
    "/js",
    express.static(JS_DIR)
);


// ============================================================
// MIDDLEWARE - VERIFICAR LOGIN
// ============================================================

function exigirLogin(
    req,
    res,
    next
) {

    if (!req.session.usuario) {

        return res
            .status(401)
            .json({
                erro:
                    "Você precisa estar logado."
            });

    }

    next();
}


// ============================================================
// ROTA PRINCIPAL
// ============================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                PUBLIC_DIR,
                "index.html"
            )
        );

    }
);


// ============================================================
// CADASTRO DO FOTÓGRAFO
// ============================================================

app.post(
    "/api/cadastro",
    async (req, res) => {

        try {

            let {
                nome,
                email,
                senha
            } = req.body;


            // --------------------------------------------
            // VALIDAÇÃO
            // --------------------------------------------

            if (
                !nome ||
                !email ||
                !senha
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Preencha todos os campos."
                    });

            }


            nome = nome.trim();

            email =
                email
                    .trim()
                    .toLowerCase();


            if (nome.length < 2) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Digite um nome válido."
                    });

            }


            if (senha.length < 6) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "A senha precisa ter pelo menos 6 caracteres."
                    });

            }


            // --------------------------------------------
            // VERIFICAR SE E-MAIL JÁ EXISTE
            // --------------------------------------------

            db.get(

                `
                SELECT id
                FROM usuarios
                WHERE email = ?
                `,

                [email],

                async (
                    erro,
                    usuarioExistente
                ) => {

                    if (erro) {

                        console.error(erro);

                        return res
                            .status(500)
                            .json({
                                erro:
                                    "Erro ao verificar usuário."
                            });

                    }


                    if (usuarioExistente) {

                        return res
                            .status(409)
                            .json({
                                erro:
                                    "Este e-mail já está cadastrado."
                            });

                    }


                    // ------------------------------------
                    // CRIPTOGRAFAR SENHA
                    // ------------------------------------

                    const senhaHash =
                        await bcrypt.hash(
                            senha,
                            10
                        );


                    // ------------------------------------
                    // CRIAR USUÁRIO
                    // ------------------------------------

                    db.run(

                        `
                        INSERT INTO usuarios
                        (
                            nome,
                            email,
                            senha
                        )
                        VALUES (?, ?, ?)
                        `,

                        [
                            nome,
                            email,
                            senhaHash
                        ],

                        function (erro) {

                            if (erro) {

                                console.error(
                                    erro
                                );

                                return res
                                    .status(500)
                                    .json({
                                        erro:
                                            "Não foi possível criar sua conta."
                                    });

                            }


                            const usuarioId =
                                this.lastID;


                            // --------------------------------
                            // CRIAR CONFIGURAÇÃO PADRÃO
                            // --------------------------------

                            db.run(

                                `
                                INSERT OR IGNORE INTO configuracoes
                                (
                                    usuario_id,
                                    nome_estudio,
                                    email
                                )
                                VALUES (?, ?, ?)
                                `,

                                [
                                    usuarioId,
                                    "PhotoStudio",
                                    email
                                ]

                            );


                            return res
                                .status(201)
                                .json({

                                    sucesso:
                                        true,

                                    mensagem:
                                        "Conta criada com sucesso.",

                                    usuarioId:
                                        usuarioId

                                });

                        }

                    );

                }

            );

        } catch (erro) {

            console.error(
                "Erro no cadastro:",
                erro
            );


            return res
                .status(500)
                .json({
                    erro:
                        "Erro interno do servidor."
                });

        }

    }
);


// ============================================================
// LOGIN
// ============================================================

app.post(
    "/api/login",
    (req, res) => {

        try {

            let {
                email,
                senha
            } = req.body;


            if (
                !email ||
                !senha
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Informe o e-mail e a senha."
                    });

            }


            email =
                email
                    .trim()
                    .toLowerCase();


            db.get(

                `
                SELECT *
                FROM usuarios
                WHERE email = ?
                `,

                [email],

                async (
                    erro,
                    usuario
                ) => {

                    if (erro) {

                        console.error(
                            erro
                        );

                        return res
                            .status(500)
                            .json({
                                erro:
                                    "Erro ao realizar login."
                            });

                    }


                    if (!usuario) {

                        return res
                            .status(401)
                            .json({
                                erro:
                                    "E-mail ou senha incorretos."
                            });

                    }


                    const senhaCorreta =
                        await bcrypt.compare(
                            senha,
                            usuario.senha
                        );


                    if (!senhaCorreta) {

                        return res
                            .status(401)
                            .json({
                                erro:
                                    "E-mail ou senha incorretos."
                            });

                    }


                    req.session.usuario = {

                        id:
                            usuario.id,

                        nome:
                            usuario.nome,

                        email:
                            usuario.email

                    };


                    return res.json({

                        sucesso:
                            true,

                        mensagem:
                            "Login realizado com sucesso.",

                        usuario: {

                            id:
                                usuario.id,

                            nome:
                                usuario.nome,

                            email:
                                usuario.email

                        }

                    });

                }

            );

        } catch (erro) {

            console.error(
                "Erro no login:",
                erro
            );


            return res
                .status(500)
                .json({
                    erro:
                        "Erro interno do servidor."
                });

        }

    }
);


// ============================================================
// VERIFICAR USUÁRIO LOGADO
// ============================================================

app.get(
    "/api/usuario",
    exigirLogin,
    (req, res) => {

        return res.json({

            logado:
                true,

            usuario:
                req.session.usuario

        });

    }
);


// ============================================================
// LOGOUT
// ============================================================

app.post(
    "/api/logout",
    (req, res) => {

        req.session.destroy(
            (erro) => {

                if (erro) {

                    return res
                        .status(500)
                        .json({
                            erro:
                                "Não foi possível sair."
                        });

                }


                res.clearCookie(
                    "connect.sid"
                );


                return res.json({

                    sucesso:
                        true,

                    mensagem:
                        "Logout realizado."

                });

            }
        );

    }
);


// ============================================================
// CRIAR GALERIA + CLIENTE
// ============================================================

app.post(
    "/api/galerias",
    exigirLogin,
    (req, res) => {

        try {

            let {

                clienteNome,
                clienteEmail,
                clienteTelefone,

                nomeGaleria,

                marcaAgua,
                textoMarca,

                permitirDownload,

                limiteSelecao

            } = req.body;


            // --------------------------------------------
            // VALIDAÇÃO
            // --------------------------------------------

            if (
                !clienteNome ||
                !nomeGaleria
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Informe o nome do cliente e da galeria."
                    });

            }


            clienteNome =
                clienteNome.trim();


            nomeGaleria =
                nomeGaleria.trim();


            clienteEmail =
                clienteEmail
                    ? clienteEmail
                        .trim()
                        .toLowerCase()
                    : null;


            clienteTelefone =
                clienteTelefone
                    ? clienteTelefone.trim()
                    : null;


            textoMarca =
                textoMarca
                    ? textoMarca.trim()
                    : "PhotoStudio";


            marcaAgua =
                marcaAgua
                    ? 1
                    : 0;


            permitirDownload =
                permitirDownload
                    ? 1
                    : 0;


            limiteSelecao =
                parseInt(
                    limiteSelecao
                );


            if (
                isNaN(limiteSelecao) ||
                limiteSelecao < 0
            ) {

                limiteSelecao = 0;

            }


            const usuarioId =
                req.session.usuario.id;


            // --------------------------------------------
            // CRIAR CLIENTE
            // --------------------------------------------

            db.run(

                `
                INSERT INTO clientes
                (
                    usuario_id,
                    nome,
                    email,
                    telefone
                )

                VALUES (?, ?, ?, ?)
                `,

                [
                    usuarioId,
                    clienteNome,
                    clienteEmail,
                    clienteTelefone
                ],

                function (erro) {

                    if (erro) {

                        console.error(
                            "Erro ao criar cliente:",
                            erro
                        );


                        return res
                            .status(500)
                            .json({
                                erro:
                                    "Não foi possível criar o cliente."
                            });

                    }


                    const clienteId =
                        this.lastID;


                    // ------------------------------------
                    // CRIAR GALERIA
                    // ------------------------------------

                    db.run(

                        `
                        INSERT INTO galerias
                        (
                            usuario_id,

                            cliente_id,

                            nome,

                            marca_agua,

                            texto_marca_agua,

                            permitir_download,

                            limite_selecao,

                            status
                        )

                        VALUES (
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        `,

                        [
                            usuarioId,

                            clienteId,

                            nomeGaleria,

                            marcaAgua,

                            textoMarca,

                            permitirDownload,

                            limiteSelecao,

                            "aguardando_selecao"
                        ],

                        function (erro) {

                            if (erro) {

                                console.error(
                                    "Erro ao criar galeria:",
                                    erro
                                );


                                return res
                                    .status(500)
                                    .json({
                                        erro:
                                            "Não foi possível criar a galeria."
                                    });

                            }


                            const galeriaId =
                                this.lastID;


                            return res
                                .status(201)
                                .json({

                                    sucesso:
                                        true,

                                    mensagem:
                                        "Galeria criada com sucesso.",

                                    galeria: {

                                        id:
                                            galeriaId,

                                        clienteId:
                                            clienteId,

                                        nome:
                                            nomeGaleria

                                    }

                                });

                        }

                    );

                }

            );

        } catch (erro) {

            console.error(
                "Erro ao criar galeria:",
                erro
            );


            return res
                .status(500)
                .json({
                    erro:
                        "Erro interno do servidor."
                });

        }

    }
);


// ============================================================
// LISTAR GALERIAS DO FOTÓGRAFO
// ============================================================

app.get(
    "/api/galerias",
    exigirLogin,
    (req, res) => {

        const usuarioId =
            req.session.usuario.id;


        db.all(

            `
            SELECT

                galerias.id,

                galerias.nome,

                galerias.marca_agua,

                galerias.texto_marca_agua,

                galerias.permitir_download,

                galerias.limite_selecao,

                galerias.valor,

                galerias.status,

                galerias.criado_em,

                clientes.id AS cliente_id,

                clientes.nome AS cliente_nome,

                clientes.email AS cliente_email,

                clientes.telefone AS cliente_telefone,

                (
                    SELECT COUNT(*)

                    FROM fotos

                    WHERE fotos.galeria_id =
                          galerias.id
                ) AS quantidade_fotos,

                (
                    SELECT COUNT(*)

                    FROM selecoes

                    WHERE selecoes.galeria_id =
                          galerias.id
                ) AS quantidade_selecionadas

            FROM galerias

            INNER JOIN clientes
                ON clientes.id =
                   galerias.cliente_id

            WHERE galerias.usuario_id = ?

            ORDER BY galerias.id DESC
            `,

            [usuarioId],

            (
                erro,
                galerias
            ) => {

                if (erro) {

                    console.error(
                        erro
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Não foi possível carregar as galerias."
                        });

                }


                return res.json({

                    sucesso:
                        true,

                    galerias:
                        galerias

                });

            }

        );

    }
);


// ============================================================
// BUSCAR UMA GALERIA
// ============================================================

app.get(
    "/api/galerias/:id",
    exigirLogin,
    (req, res) => {

        const galeriaId =
            parseInt(
                req.params.id
            );


        const usuarioId =
            req.session.usuario.id;


        if (isNaN(galeriaId)) {

            return res
                .status(400)
                .json({
                    erro:
                        "Galeria inválida."
                });

        }


        db.get(

            `
            SELECT

                galerias.*,

                clientes.nome
                    AS cliente_nome,

                clientes.email
                    AS cliente_email,

                clientes.telefone
                    AS cliente_telefone

            FROM galerias

            INNER JOIN clientes
                ON clientes.id =
                   galerias.cliente_id

            WHERE galerias.id = ?

            AND galerias.usuario_id = ?
            `,

            [
                galeriaId,
                usuarioId
            ],

            (
                erro,
                galeria
            ) => {

                if (erro) {

                    console.error(
                        erro
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao carregar galeria."
                        });

                }


                if (!galeria) {

                    return res
                        .status(404)
                        .json({
                            erro:
                                "Galeria não encontrada."
                        });

                }


                return res.json({

                    sucesso:
                        true,

                    galeria:
                        galeria

                });

            }

        );

    }
);


// ============================================================
// DEFINIR VALOR DA GALERIA
// ============================================================

app.put(
    "/api/galerias/:id/valor",
    exigirLogin,
    (req, res) => {

        const galeriaId =
            parseInt(
                req.params.id
            );


        const usuarioId =
            req.session.usuario.id;


        let {
            valor
        } = req.body;


        valor =
            Number(valor);


        if (
            isNaN(valor) ||
            valor < 0
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        "Informe um valor válido."
                });

        }


        db.run(

            `
            UPDATE galerias

            SET
                valor = ?,

                status =
                    'valor_definido'

            WHERE id = ?

            AND usuario_id = ?
            `,

            [
                valor,
                galeriaId,
                usuarioId
            ],

            function (erro) {

                if (erro) {

                    console.error(
                        erro
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Não foi possível salvar o valor."
                        });

                }


                if (
                    this.changes === 0
                ) {

                    return res
                        .status(404)
                        .json({
                            erro:
                                "Galeria não encontrada."
                        });

                }


                return res.json({

                    sucesso:
                        true,

                    mensagem:
                        "Valor salvo com sucesso.",

                    valor:
                        valor

                });

            }

        );

    }
);


// ============================================================
// CONFIGURAÇÕES DO ESTÚDIO
// ============================================================

app.get(
    "/api/configuracoes",
    exigirLogin,
    (req, res) => {

        const usuarioId =
            req.session.usuario.id;


        db.get(

            `
            SELECT *

            FROM configuracoes

            WHERE usuario_id = ?
            `,

            [usuarioId],

            (
                erro,
                configuracoes
            ) => {

                if (erro) {

                    console.error(
                        erro
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao carregar configurações."
                        });

                }


                return res.json({

                    sucesso:
                        true,

                    configuracoes:
                        configuracoes || {}

                });

            }

        );

    }
);


// ============================================================
// SALVAR CONFIGURAÇÕES
// ============================================================

app.put(
    "/api/configuracoes",
    exigirLogin,
    (req, res) => {

        const usuarioId =
            req.session.usuario.id;


        let {

            nomeEstudio,
            telefone,
            email,
            instagram

        } = req.body;


        nomeEstudio =
            nomeEstudio
                ? nomeEstudio.trim()
                : "PhotoStudio";


        telefone =
            telefone
                ? telefone.trim()
                : null;


        email =
            email
                ? email.trim()
                : null;


        instagram =
            instagram
                ? instagram.trim()
                : null;


        db.run(

            `
            INSERT INTO configuracoes
            (
                usuario_id,
                nome_estudio,
                telefone,
                email,
                instagram
            )

            VALUES (?, ?, ?, ?, ?)

            ON CONFLICT(usuario_id)

            DO UPDATE SET

                nome_estudio =
                    excluded.nome_estudio,

                telefone =
                    excluded.telefone,

                email =
                    excluded.email,

                instagram =
                    excluded.instagram
            `,

            [
                usuarioId,
                nomeEstudio,
                telefone,
                email,
                instagram
            ],

            function (erro) {

                if (erro) {

                    console.error(
                        erro
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Não foi possível salvar as configurações."
                        });

                }


                return res.json({

                    sucesso:
                        true,

                    mensagem:
                        "Configurações salvas."

                });

            }

        );

    }
);


// ============================================================
// ROTA 404 DA API
// ============================================================

app.use(
    "/api",
    (req, res) => {

        return res
            .status(404)
            .json({
                erro:
                    "Rota não encontrada."
            });

    }
);


// ============================================================
// TRATAMENTO DE ERROS
// ============================================================

app.use(
    (
        erro,
        req,
        res,
        next
    ) => {

        console.error(
            "Erro no servidor:",
            erro
        );


        return res
            .status(500)
            .json({
                erro:
                    "Erro interno do servidor."
            });

    }
);


// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "===================================="
        );

        console.log(
            "📸 PHOTOSTUDIO"
        );

        console.log(
            `🚀 Servidor rodando na porta ${PORT}`
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            "===================================="
        );

        console.log("");

    }
);
