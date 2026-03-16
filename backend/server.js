const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' })); // Limite aumentado para salvar roteiros longos

// Caminho para o arquivo que será guardado no volume persistente do Docker na VPS
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

// Função para garantir que o banco de dados inicial exista
async function initDatabase() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        try {
            await fs.access(DATA_FILE);
        } catch (e) {
            // Se o arquivo não existir, cria um vazio
            await fs.writeFile(DATA_FILE, JSON.stringify({ apiKey: '', items: [] }));
            console.log('Banco de dados inicializado com sucesso.');
        }
    } catch (err) {
        console.error('Erro ao inicializar banco de dados:', err);
    }
}
initDatabase();

// ROTA (Ler dados da VPS)
app.get('/api/data', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Erro ao ler dados da VPS' });
    }
});

// ROTA (Salvar dados na VPS)
app.post('/api/data', async (req, res) => {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao salvar dados na VPS' });
    }
});

// Servir os arquivos estáticos do Frontend (React compilado pelo Docker)
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Redirecionar qualquer outra rota para o React (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Servidor rodando e pronto na porta ${PORT}`);
});
