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
    
    // No sqlite3, passamos os parâmetros em um array []
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