const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// BANCO DE DADOS
// ========================

const dbPath = path.join(__dirname, "database", "banco.db");

const db = new sqlite3.Database(dbPath, (erro) => {
    if (erro) {
        console.error("Erro ao abrir banco:", erro);
    } else {
        console.log("Banco conectado com sucesso.");
    }
});

db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha TEXT NOT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// ========================
// CONFIGURAÇÕES
// ========================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "photostudio-chave-temporaria",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

// arquivos HTML
app.use(express.static(path.join(__dirname, "public")));

// CSS
app.use("/css", express.static(path.join(__dirname, "css")));

// JavaScript
app.use("/js", express.static(path.join(__dirname, "js")));

// ========================
// CADASTRO
// ========================

app.post("/api/cadastro", async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                erro: "Preencha todos os campos."
            });
        }

        if (senha.length < 6) {
            return res.status(400).json({
                erro: "A senha precisa ter pelo menos 6 caracteres."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        db.get(
            "SELECT id FROM usuarios WHERE email = ?",
            [emailNormalizado],
            async (erro, usuario) => {

                if (erro) {
                    console.error(erro);

                    return res.status(500).json({
                        erro: "Erro no banco de dados."
                    });
                }

                if (usuario) {
                    return res.status(409).json({
                        erro: "Este e-mail já está cadastrado."
                    });
                }

                const senhaCriptografada = await bcrypt.hash(senha, 10);

                db.run(
                    `
                    INSERT INTO usuarios (nome, email, senha)
                    VALUES (?, ?, ?)
                    `,
                    [
                        nome.trim(),
                        emailNormalizado,
                        senhaCriptografada
                    ],
                    function (erro) {

                        if (erro) {
                            console.error(erro);

                            return res.status(500).json({
                                erro: "Não foi possível criar a conta."
                            });
                        }

                        return res.status(201).json({
                            sucesso: true,
                            mensagem: "Conta criada com sucesso."
                        });
                    }
                );
            }
        );
    } catch (erro) {
        console.error(erro);

        res.status(500).json({
            erro: "Erro interno do servidor."
        });
    }
});

// ========================
// LOGIN
// ========================

app.post("/api/login", (req, res) => {

    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            erro: "Informe o e-mail e a senha."
        });
    }

    const emailNormalizado = email.trim().toLowerCase();

    db.get(
        "SELECT * FROM usuarios WHERE email = ?",
        [emailNormalizado],
        async (erro, usuario) => {

            if (erro) {
                console.error(erro);

                return res.status(500).json({
                    erro: "Erro no banco de dados."
                });
            }

            if (!usuario) {
                return res.status(401).json({
                    erro: "E-mail ou senha incorretos."
                });
            }

            const senhaCorreta = await bcrypt.compare(
                senha,
                usuario.senha
            );

            if (!senhaCorreta) {
                return res.status(401).json({
                    erro: "E-mail ou senha incorretos."
                });
            }

            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            };

            res.json({
                sucesso: true,
                mensagem: "Login realizado com sucesso."
            });
        }
    );
});

// ========================
// VERIFICAR LOGIN
// ========================

app.get("/api/usuario", (req, res) => {

    if (!req.session.usuario) {
        return res.status(401).json({
            logado: false
        });
    }

    res.json({
        logado: true,
        usuario: req.session.usuario
    });
});

// ========================
// LOGOUT
// ========================

app.post("/api/logout", (req, res) => {

    req.session.destroy(() => {
        res.json({
            sucesso: true
        });
    });
});

// ========================
// SERVIDOR
// ========================

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

