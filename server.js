// ========================
// CLIENTES
// ========================

db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT,
        telefone TEXT,
        senha TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// ========================
// GALERIAS
// ========================

db.run(`
    CREATE TABLE IF NOT EXISTS galerias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        nome TEXT NOT NULL,

        marca_agua INTEGER DEFAULT 1,
        texto_marca_agua TEXT DEFAULT 'PhotoStudio',

        permitir_download INTEGER DEFAULT 0,

        limite_selecao INTEGER DEFAULT 0,

        valor REAL DEFAULT NULL,

        status TEXT DEFAULT 'aguardando_selecao',

        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(cliente_id) REFERENCES clientes(id)
    )
`);

// ========================
// FOTOS
// ========================

db.run(`
    CREATE TABLE IF NOT EXISTS fotos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        galeria_id INTEGER NOT NULL,

        nome_arquivo TEXT NOT NULL,
        arquivo_original TEXT NOT NULL,
        arquivo_preview TEXT,

        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(galeria_id) REFERENCES galerias(id)
    )
`);

// ========================
// FOTOS SELECIONADAS
// ========================

db.run(`
    CREATE TABLE IF NOT EXISTS selecoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        galeria_id INTEGER NOT NULL,
        foto_id INTEGER NOT NULL,

        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(galeria_id, foto_id),

        FOREIGN KEY(galeria_id) REFERENCES galerias(id),
        FOREIGN KEY(foto_id) REFERENCES fotos(id)
    )
`);

// ========================
// CONFIGURAÇÕES
// ========================

db.run(`
    CREATE TABLE IF NOT EXISTS configuracoes (
        id INTEGER PRIMARY KEY CHECK (id = 1),

        nome_estudio TEXT DEFAULT 'PhotoStudio',

        telefone TEXT,
        email TEXT,
        instagram TEXT,

        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

db.run(`
    INSERT OR IGNORE INTO configuracoes (id)
    VALUES (1)
`);
