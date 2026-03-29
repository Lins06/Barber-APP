const { app, BrowserWindow, ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose(); // Mudou aqui
const path = require('path');

const db = new sqlite3.Database('barbearia.db', (err) => {
    if (err) console.error("Erro ao abrir banco:", err.message);
    else console.log("Conectado ao banco SQLite com sucesso!");
});

db.run(`CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    nome TEXT, 
    telefone TEXT
)`, (err) => {
    if (err) console.error("Erro ao criar tabela:", err.message);
});

ipcMain.on('salvar-cliente', (event, dados) => {
    const sql = "INSERT INTO clientes (nome, telefone) VALUES (?, ?)";
    
    db.run(sql, [dados.nome, dados.telefone], function(err) {
        if (err) {
            console.error("Erro ao salvar:", err.message);
        } else {
            console.log(`Cliente ${dados.nome} salvo com ID: ${this.lastID}`);
        }
    });
});

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  win.loadFile('src/views/dashboard.html')
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    db.close();
    if (process.platform !== 'darwin') app.quit();
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS barbeiros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE,
        especialidade TEXT,
        status TEXT DEFAULT 'Disponível'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        preco REAL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_nome TEXT,
        barbeiro_id INTEGER,
        servico_id INTEGER,
        data TEXT,
        horario TEXT,
        status TEXT DEFAULT 'Pendente',
        FOREIGN KEY(barbeiro_id) REFERENCES barbeiros(id)
    )`);

    // Inserir barbeiros padrões se não existirem
    db.run(`INSERT OR IGNORE INTO barbeiros (nome, especialidade, status) VALUES (?, ?, ?)`, 
        ['Gabriel', 'Cabelo & Barba', 'Disponível']);
    db.run(`INSERT OR IGNORE INTO barbeiros (nome, especialidade, status) VALUES (?, ?, ?)`, 
        ['Lucas', 'Especialista em Degradê', 'Disponível']);
    db.run(`INSERT OR IGNORE INTO barbeiros (nome, especialidade, status) VALUES (?, ?, ?)`, 
        ['Gustavo', 'Barba Premium', 'Disponível']);

    // Inserir serviços padrões se não existirem
    db.run(`INSERT OR IGNORE INTO servicos (nome, preco) VALUES (?, ?)`, ['Corte Simples', 50.00]);
    db.run(`INSERT OR IGNORE INTO servicos (nome, preco) VALUES (?, ?)`, ['Corte + Barba', 80.00]);
    db.run(`INSERT OR IGNORE INTO servicos (nome, preco) VALUES (?, ?)`, ['Degradê Premium', 100.00]);
});

ipcMain.on('get-agendamentos', (event, filtro) => {
    let sql = `
        SELECT a.*, s.nome as servico_nome, b.nome as barbeiro_nome
        FROM agendamentos a 
        LEFT JOIN servicos s ON a.servico_id = s.id
        LEFT JOIN barbeiros b ON a.barbeiro_id = b.id
    `;
    
    let params = [];

    let conditions = [];
    if (filtro && filtro.data) {
        conditions.push(`a.data = ?`);
        params.push(filtro.data);
    } else {
        conditions.push(`a.data >= date('now')`);
    }

    if (filtro && filtro.barbeiro_id) {
        conditions.push(`a.barbeiro_id = ?`);
        params.push(filtro.barbeiro_id);
    }

    if (conditions.length > 0) {
        sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY a.data ASC, a.horario ASC`; 

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error("Erro no SQL:", err.message);
            event.reply('lista-agendamentos', []);
            return;
        }
        event.reply('lista-agendamentos', rows || []);
    });
});

ipcMain.on('get-barbeiros', (event) => {
    const sql = `SELECT id, nome, especialidade, status FROM barbeiros`;
    db.all(sql, (err, rows) => {
        if (err) {
            console.error("Erro ao obter barbeiros:", err.message);
            event.reply('lista-barbeiros', []);
            return;
        }
        event.reply('lista-barbeiros', rows || []);
    });
});

ipcMain.on('novo-agendamento', (event, agendamento) => {
    const sql = `INSERT INTO agendamentos (cliente_nome, barbeiro_id, servico_id, data, horario) 
                 VALUES (?, ?, ?, ?, ?)`;
    const barbeiro_id = agendamento.barbeiro_id || 1;
    db.run(sql, [agendamento.cliente, barbeiro_id, 1, agendamento.data, agendamento.horario], (err) => {
        if (err) {
            console.error("Erro ao salvar agendamento:", err.message);
            event.reply('agendamento-erro', err.message);
        } else {
            event.reply('agendamento-salvo');
        }
    });
});

ipcMain.on('atualizar-agendamento', (event, dados) => {
    const sql = `UPDATE agendamentos SET status = ? WHERE id = ?`;
    db.run(sql, [dados.status, dados.id], (err) => {
        if (err) {
            console.error("Erro ao atualizar agendamento:", err.message);
            event.reply('agendamento-atualizado-erro', err.message);
        } else {
            event.reply('agendamento-atualizado', { id: dados.id, status: dados.status });
        }
    });
});

ipcMain.on('ganhos-do-dia', (event, barbeiro_id) => {
    const hoje = new Date().toISOString().split('T')[0];
    const sql = `
        SELECT SUM(s.preco) as total
        FROM agendamentos a
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.barbeiro_id = ? AND a.data = ? AND a.status = 'Concluido'
    `;
    
    db.get(sql, [barbeiro_id, hoje], (err, row) => {
        if (err) {
            console.error("Erro ao calcular ganhos:", err.message);
            event.reply('ganhos-calculados', { total: 0 });
        } else {
            event.reply('ganhos-calculados', { total: row?.total || 0 });
        }
    });
});

ipcMain.on('proximo-agendamento', (event, barbeiro_id) => {
    const hoje = new Date().toISOString().split('T')[0];
    const sql = `
        SELECT horario, cliente_nome
        FROM agendamentos
        WHERE barbeiro_id = ? AND data = ? AND status != 'Cancelado'
        ORDER BY horario ASC
        LIMIT 1
    `;
    
    db.get(sql, [barbeiro_id, hoje], (err, row) => {
        if (err) {
            console.error("Erro ao obter próximo agendamento:", err.message);
            event.reply('proximo-obtido', null);
        } else {
            event.reply('proximo-obtido', row || null);
        }
    });
});

ipcMain.on('ganhos-do-dia-todos', (event) => {
    const hoje = new Date().toISOString().split('T')[0];
    const sql = `
        SELECT SUM(s.preco) as total
        FROM agendamentos a
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.data = ? AND a.status = 'Concluido'
    `;
    
    db.get(sql, [hoje], (err, row) => {
        if (err) {
            console.error("Erro ao calcular ganhos totais:", err.message);
            event.reply('ganhos-calculados', { total: 0 });
        } else {
            event.reply('ganhos-calculados', { total: row?.total || 0 });
        }
    });
});

ipcMain.on('deletar-agendamento', (event, id) => {
    const sql = `DELETE FROM agendamentos WHERE id = ?`;
    db.run(sql, [id], function(err) {
        if (err) {
            console.error("Erro ao deletar agendamento:", err.message);
            event.reply('agendamento-deletado-erro', err.message);
        } else {
            console.log(`Agendamento ${id} deletado com sucesso`);
            event.reply('agendamento-deletado', { id });
        }
    });
});