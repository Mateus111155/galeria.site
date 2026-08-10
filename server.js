// ============================================================
// PHOTOSTUDIO - SERVER.JS
// ============================================================

const express = require("express");
const path = require("path");
const fs = require("fs");

const sqlite3 = require("sqlite3").verbose();

const bcrypt = require("bcryptjs");
const session = require("express-session");

const multer = require("multer");
const sharp = require("sharp");


// ============================================================
// APP
// ============================================================

const app = express();

const PORT = process.env.PORT || 3000;


// ============================================================
// PASTAS
// ============================================================

const PUBLIC_DIR = path.join(__dirname, "public");
const CSS_DIR = path.join(__dirname, "css");
const JS_DIR = path.join(__dirname, "js");

const DATABASE_DIR = path.join(__dirname, "database");

const UPLOADS_DIR = path.join(__dirname, "uploads");

const ORIGINALS_DIR = path.join(
    UPLOADS_DIR,
    "originais"
);

const PREVIEWS_DIR = path.join(
    UPLOADS_DIR,
    "previews"
);


// ============================================================
// CRIAR PASTAS
// ============================================================

[
    DATABASE_DIR,
    UPLOADS_DIR,
    ORIGINALS_DIR,
    PREVIEWS_DIR
].forEach((pasta) => {

    if (!fs.existsSync(pasta)) {

        fs.mkdirSync(
            pasta,
            {
                recursive: true
            }
        );
    }

});


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
                "❌ Erro ao abrir banco:",
                erro
            );

        } else {

            console.log(
                "✅ Banco conectado."
            );

            criarTabelas();
        }

    }
);


// ============================================================
// CRIAR TABELAS
// ============================================================

function criarTabelas() {

    db.serialize(() => {

        // ====================================================
        // USUÁRIOS
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

                arquivo_preview TEXT NOT NULL,

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
        // CONFIGURAÇÕES
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
            "✅ Tabelas verificadas."
        );

    });

}


// ============================================================
// EXPRESS
// ============================================================

app.use(
    express.json({
        limit: "20mb"
    })
);


app.use(
    express.urlencoded({
        extended: true,
        limit: "20mb"
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

app.use(
    express.static(PUBLIC_DIR)
);


app.use(
    "/css",
    express.static(CSS_DIR)
);


app.use(
    "/js",
    express.static(JS_DIR)
);


// PREVIEWS PODEM SER VISUALIZADOS
app.use(
    "/previews",
    express.static(PREVIEWS_DIR)
);


// IMPORTANTE:
// NÃO disponibilizamos a pasta de originais diretamente.


// ============================================================
// LOGIN OBRIGATÓRIO
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
// MULTER
// ============================================================

const storage = multer.diskStorage({

    destination: function (
        req,
        file,
        callback
    ) {

        callback(
            null,
            ORIGINALS_DIR
        );

    },


    filename: function (
        req,
        file,
        callback
    ) {

        const extensao =
            path.extname(
                file.originalname
            ).toLowerCase();


        const nome =
            `${Date.now()}-${Math.round(
                Math.random() * 1E9
            )}${extensao}`;


        callback(
            null,
            nome
        );

    }

});


const upload = multer({

    storage: storage,

    limits: {

        fileSize:
            25 *
            1024 *
            1024,

        files:
            200

    },

    fileFilter: function (
        req,
        file,
        callback
    ) {

        const tiposPermitidos = [

            "image/jpeg",
            "image/png",
            "image/webp"

        ];


        if (
            tiposPermitidos.includes(
                file.mimetype
            )
        ) {

            callback(
                null,
                true
            );

        } else {

            callback(
                new Error(
                    "Formato de imagem não permitido."
                )
            );

        }

    }

});


// ============================================================
// INÍCIO
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
// CADASTRO
// ============================================================

app.post(
    "/api/cadastro",

    async (
        req,
        res
    ) => {

        try {

            let {
                nome,
                email,
                senha
            } = req.body;


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


            nome =
                nome.trim();


            email =
                email
                    .trim()
                    .toLowerCase();


            if (
                senha.length < 6
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "A senha precisa ter pelo menos 6 caracteres."
                    });

            }


            db.get(

                `
                SELECT id
                FROM usuarios
                WHERE email = ?
                `,

                [email],

                async (
                    erro,
                    usuario
                ) => {

                    if (erro) {

                        return res
                            .status(500)
                            .json({
                                erro:
                                    "Erro no banco."
                            });

                    }


                    if (usuario) {

                        return res
                            .status(409)
                            .json({
                                erro:
                                    "Este e-mail já está cadastrado."
                            });

                    }


                    const senhaHash =
                        await bcrypt.hash(
                            senha,
                            10
                        );


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

                        function (
                            erro
                        ) {

                            if (erro) {

                                console.error(
                                    erro
                                );

                                return res
                                    .status(500)
                                    .json({
                                        erro:
                                            "Não foi possível criar a conta."
                                    });

                            }


                            const usuarioId =
                                this.lastID;


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
                                        "Conta criada com sucesso."

                                });

                        }

                    );

                }

            );

        } catch (erro) {

            console.error(
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

    (
        req,
        res
    ) => {

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
                        "Informe e-mail e senha."
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

                if (
                    erro ||
                    !usuario
                ) {

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

                    usuario:
                        req.session.usuario

                });

            }

        );

    }
);


// ============================================================
// USUÁRIO LOGADO
// ============================================================

app.get(
    "/api/usuario",

    exigirLogin,

    (
        req,
        res
    ) => {

        res.json({

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

    (
        req,
        res
    ) => {

        req.session.destroy(
            () => {

                res.clearCookie(
                    "connect.sid"
                );


                res.json({
                    sucesso:
                        true
                });

            }
        );

    }
);


// ============================================================
// CRIAR GALERIA
// ============================================================

app.post(
    "/api/galerias",

    exigirLogin,

    (
        req,
        res
    ) => {

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


        if (
            !clienteNome ||
            !nomeGaleria
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        "Informe cliente e nome da galeria."
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

            function (
                erro
            ) {

                if (erro) {

                    console.error(
                        erro
                    );

                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao criar cliente."
                        });

                }


                const clienteId =
                    this.lastID;


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

                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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

                    function (
                        erro
                    ) {

                        if (erro) {

                            console.error(
                                erro
                            );

                            return res
                                .status(500)
                                .json({
                                    erro:
                                        "Erro ao criar galeria."
                                });

                        }


                        return res
                            .status(201)
                            .json({

                                sucesso:
                                    true,

                                galeria: {

                                    id:
                                        this.lastID,

                                    nome:
                                        nomeGaleria

                                }

                            });

                    }

                );

            }

        );

    }
);


// ============================================================
// LISTAR GALERIAS
// ============================================================

app.get(
    "/api/galerias",

    exigirLogin,

    (
        req,
        res
    ) => {

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

                clientes.nome
                    AS cliente_nome,

                clientes.email
                    AS cliente_email,

                clientes.telefone
                    AS cliente_telefone,

                (
                    SELECT COUNT(*)
                    FROM fotos
                    WHERE fotos.galeria_id =
                          galerias.id
                )
                AS quantidade_fotos,

                (
                    SELECT COUNT(*)
                    FROM selecoes
                    WHERE selecoes.galeria_id =
                          galerias.id
                )
                AS quantidade_selecionadas

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
                                "Erro ao carregar galerias."
                        });

                }


                res.json({

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

    (
        req,
        res
    ) => {

        const galeriaId =
            Number(
                req.params.id
            );


        const usuarioId =
            req.session.usuario.id;


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

                if (
                    erro ||
                    !galeria
                ) {

                    return res
                        .status(404)
                        .json({
                            erro:
                                "Galeria não encontrada."
                        });

                }


                res.json({

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
// UPLOAD DAS FOTOS
// ============================================================

app.post(
    "/api/galerias/:id/fotos",

    exigirLogin,

    upload.array(
        "fotos",
        200
    ),

    async (
        req,
        res
    ) => {

        const galeriaId =
            Number(
                req.params.id
            );


        const usuarioId =
            req.session.usuario.id;


        if (
            !req.files ||
            req.files.length === 0
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        "Selecione pelo menos uma foto."
                });

        }


        db.get(

            `
            SELECT *
            FROM galerias

            WHERE id = ?

            AND usuario_id = ?
            `,

            [
                galeriaId,
                usuarioId
            ],

            async (
                erro,
                galeria
            ) => {

                if (
                    erro ||
                    !galeria
                ) {

                    apagarArquivos(
                        req.files
                    );


                    return res
                        .status(404)
                        .json({
                            erro:
                                "Galeria não encontrada."
                        });

                }


                try {

                    const fotosSalvas =
                        [];


                    for (
                        const arquivo of req.files
                    ) {

                        const nomePreview =
                            `preview-${arquivo.filename}.jpg`;


                        const caminhoPreview =
                            path.join(
                                PREVIEWS_DIR,
                                nomePreview
                            );


                        await criarPreview(
                            arquivo.path,
                            caminhoPreview,
                            galeria
                        );


                        await salvarFotoNoBanco(

                            galeriaId,

                            arquivo.originalname,

                            arquivo.filename,

                            nomePreview

                        );


                        fotosSalvas.push({

                            nome:
                                arquivo.originalname,

                            preview:
                                `/previews/${nomePreview}`

                        });

                    }


                    return res
                        .status(201)
                        .json({

                            sucesso:
                                true,

                            mensagem:
                                `${fotosSalvas.length} foto(s) enviada(s) com sucesso.`,

                            fotos:
                                fotosSalvas

                        });


                } catch (erroProcessamento) {

                    console.error(
                        "Erro ao processar fotos:",
                        erroProcessamento
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao processar as fotos."
                        });

                }

            }

        );

    }
);


// ============================================================
// CRIAR PREVIEW
// ============================================================

async function criarPreview(
    arquivoOriginal,
    arquivoPreview,
    galeria
) {

    const imagem =
        sharp(
            arquivoOriginal
        );


    const metadata =
        await imagem.metadata();


    const largura =
        Math.min(
            metadata.width || 1600,
            1600
        );


    let processamento =
        imagem

            .rotate()

            .resize({

                width:
                    largura,

                withoutEnlargement:
                    true

            });


    if (
        galeria.marca_agua
    ) {

        const texto =
            escaparSVG(
                galeria.texto_marca_agua ||
                "PhotoStudio"
            );


        const larguraMarca =
            800;


        const alturaMarca =
            250;


        const svgMarca = Buffer.from(`

            <svg
                width="${larguraMarca}"
                height="${alturaMarca}"
                xmlns="http://www.w3.org/2000/svg"
            >

                <style>

                    .marca {

                        fill: white;

                        font-size: 70px;

                        font-family:
                            Arial,
                            Helvetica,
                            sans-serif;

                        font-weight: bold;

                        opacity: 0.42;

                    }

                </style>


                <text

                    x="50%"

                    y="50%"

                    text-anchor="middle"

                    dominant-baseline="middle"

                    class="marca"

                    transform="
                        rotate(
                            -20,
                            ${larguraMarca / 2},
                            ${alturaMarca / 2}
                        )
                    "

                >

                    ${texto}

                </text>

            </svg>

        `);


        processamento =
            processamento.composite([

                {

                    input:
                        svgMarca,

                    gravity:
                        "center"

                }

            ]);

    }


    await processamento

        .jpeg({

            quality:
                82

        })

        .toFile(
            arquivoPreview
        );

}


// ============================================================
// ESCAPAR TEXTO SVG
// ============================================================

function escaparSVG(
    texto
) {

    return String(
        texto
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
            "&apos;"
        );

}


// ============================================================
// SALVAR FOTO NO BANCO
// ============================================================

function salvarFotoNoBanco(

    galeriaId,

    nomeOriginal,

    nomeArquivo,

    nomePreview

) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            db.run(

                `
                INSERT INTO fotos
                (
                    galeria_id,
                    nome_arquivo,
                    arquivo_original,
                    arquivo_preview
                )

                VALUES (?, ?, ?, ?)
                `,

                [
                    galeriaId,
                    nomeOriginal,
                    nomeArquivo,
                    nomePreview
                ],

                function (
                    erro
                ) {

                    if (erro) {

                        reject(
                            erro
                        );

                    } else {

                        resolve(
                            this.lastID
                        );

                    }

                }

            );

        }
    );

}


// ============================================================
// APAGAR ARQUIVOS
// ============================================================

function apagarArquivos(
    arquivos
) {

    if (!arquivos) {
        return;
    }


    arquivos.forEach(
        (
            arquivo
        ) => {

            try {

                if (
                    fs.existsSync(
                        arquivo.path
                    )
                ) {

                    fs.unlinkSync(
                        arquivo.path
                    );
                }

            } catch (
                erro
            ) {

                console.error(
                    erro
                );

            }

        }
    );

}


// ============================================================
// LISTAR FOTOS DA GALERIA
// ============================================================

app.get(
    "/api/galerias/:id/fotos",

    exigirLogin,

    (
        req,
        res
    ) => {

        const galeriaId =
            Number(
                req.params.id
            );


        const usuarioId =
            req.session.usuario.id;


        db.get(

            `
            SELECT id
            FROM galerias

            WHERE id = ?

            AND usuario_id = ?
            `,

            [
                galeriaId,
                usuarioId
            ],

            (
                erro,
                galeria
            ) => {

                if (
                    erro ||
                    !galeria
                ) {

                    return res
                        .status(404)
                        .json({
                            erro:
                                "Galeria não encontrada."
                        });

                }


                db.all(

                    `
                    SELECT

                        id,
                        nome_arquivo,
                        arquivo_preview,
                        criado_em

                    FROM fotos

                    WHERE galeria_id = ?

                    ORDER BY id DESC
                    `,

                    [
                        galeriaId
                    ],

                    (
                        erroFotos,
                        fotos
                    ) => {

                        if (
                            erroFotos
                        ) {

                            return res
                                .status(500)
                                .json({
                                    erro:
                                        "Erro ao carregar fotos."
                                });

                        }


                        const resultado =
                            fotos.map(
                                (
                                    foto
                                ) => ({

                                    id:
                                        foto.id,

                                    nome:
                                        foto.nome_arquivo,

                                    preview:
                                        `/previews/${foto.arquivo_preview}`,

                                    criado_em:
                                        foto.criado_em

                                })
                            );


                        res.json({

                            sucesso:
                                true,

                            fotos:
                                resultado

                        });

                    }

                );

            }

        );

    }
);


// ============================================================
// DEFINIR VALOR
// ============================================================

app.put(
    "/api/galerias/:id/valor",

    exigirLogin,

    (
        req,
        res
    ) => {

        const galeriaId =
            Number(
                req.params.id
            );


        const usuarioId =
            req.session.usuario.id;


        const valor =
            Number(
                req.body.valor
            );


        if (
            isNaN(valor) ||
            valor < 0
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        "Valor inválido."
                });

        }


        db.run(

            `
            UPDATE galerias

            SET
                valor = ?,
                status = 'valor_definido'

            WHERE id = ?

            AND usuario_id = ?
            `,

            [
                valor,
                galeriaId,
                usuarioId
            ],

            function (
                erro
            ) {

                if (erro) {

                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao salvar valor."
                        });

                }


                res.json({

                    sucesso:
                        true,

                    valor:
                        valor

                });

            }

        );

    }
);


// ============================================================
// CONFIGURAÇÕES
// ============================================================

app.get(
    "/api/configuracoes",

    exigirLogin,

    (
        req,
        res
    ) => {

        db.get(

            `
            SELECT *
            FROM configuracoes
            WHERE usuario_id = ?
            `,

            [
                req.session.usuario.id
            ],

            (
                erro,
                configuracoes
            ) => {

                if (erro) {

                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao carregar configurações."
                        });

                }


                res.json({

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

    (
        req,
        res
    ) => {

        const {

            nomeEstudio,
            telefone,
            email,
            instagram

        } = req.body;


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
                req.session.usuario.id,

                nomeEstudio ||
                "PhotoStudio",

                telefone ||
                null,

                email ||
                null,

                instagram ||
                null
            ],

            (
                erro
            ) => {

                if (erro) {

                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao salvar configurações."
                        });

                }


                res.json({

                    sucesso:
                        true

                });

            }

        );

    }
);


// ============================================================
// ERRO DO MULTER / SERVIDOR
// ============================================================

app.use(
    (
        erro,
        req,
        res,
        next
    ) => {

        console.error(
            "Erro:",
            erro
        );


        if (
            erro instanceof multer.MulterError
        ) {

            if (
                erro.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Uma das fotos ultrapassa 25 MB."
                    });

            }


            return res
                .status(400)
                .json({
                    erro:
                        erro.message
                });

        }


        return res
            .status(500)
            .json({
                erro:
                    erro.message ||
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
            "========================================"
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
            "========================================"
        );

        console.log("");

    }
);
