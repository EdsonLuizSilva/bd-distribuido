const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const SERVICE_WRITE_URL = process.env.SERVICE_WRITE_URL || 'http://localhost:3001';

// Função para buscar dados perdidos do Service Write no startup
async function syncMissingData() {
  try {
    console.log('[STARTUP SYNC] Buscando todos os registros do banco de Escrita...');
    const response = await axios.get(`${SERVICE_WRITE_URL}/users/all`);
    const users = response.data;

    if (users && users.length > 0) {
      let syncedCount = 0;
      for (const user of users) {
        // Usa INSERT ... ON DUPLICATE KEY UPDATE para inserir os novos e atualizar os alterados
        await db.query(
          `INSERT INTO users (id, name, email) VALUES (?, ?, ?) 
           ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email)`,
          [user.id, user.name, user.email]
        );
        syncedCount++;
      }
      console.log(`[STARTUP SYNC] Sincronização concluída. ${syncedCount} registros validados/atualizados.`);
    } else {
      console.log('[STARTUP SYNC] Nenhum registro encontrado no banco de escrita.');
    }
  } catch (error) {
    console.error('[STARTUP SYNC ERROR] Falha ao sincronizar com o banco de Escrita no startup:', error.message);
  }
}


// GET - Retorna lista de usuários do MySQL para o Frontend
app.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('[READ DB ERROR]', error);
    res.status(500).json({ error: 'Erro ao buscar no banco de leitura (MySQL fora do ar?)' });
  }
});

// SYNC - Rota interna usada pelo Service Write para sincronizar dados
app.post('/sync/users', async (req, res) => {
  const { action, data } = req.body;

  try {
    if (action === 'CREATE') {
      // Força a inserção com o mesmo ID do Postgres, ignora se já existir
      await db.query(
        `INSERT INTO users (id, name, email) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email)`,
        [data.id, data.name, data.email]
      );
    } 
    else if (action === 'UPDATE') {
      await db.query(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [data.name, data.email, data.id]
      );
    } 
    else if (action === 'DELETE') {
      await db.query('DELETE FROM users WHERE id = ?', [data.id]);
    }

    res.json({ message: `Sincronização '${action}' concluída no MySQL` });
  } catch (error) {
    console.error('[SYNC ERROR] Erro ao aplicar no MySQL:', error);
    res.status(500).json({ error: 'Falha na sincronização' });
  }
});

app.listen(PORT, async () => {
  console.log(`Service Read (MySQL) rodando na porta ${PORT}`);
  // Inicia a sincronização assim que o servidor ligar
  await syncMissingData();
});
