const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SERVICE_READ_URL = process.env.SERVICE_READ_URL || 'http://localhost:3002';

// Fila em memória para retentativas de sincronização
const failedSyncQueue = [];

// Função para avisar o Service Read
async function syncWithReadService(action, data) {
  try {
    await axios.post(`${SERVICE_READ_URL}/sync/users`, { action, data });
    console.log(`[SYNC] Ação '${action}' enviada para o Service Read com sucesso.`);
  } catch (error) {
    console.error(`[SYNC ERROR] Falha ao sincronizar '${action}' com o Service Read. Adicionando à fila de retentativas.`);
    failedSyncQueue.push({ action, data });
  }
}

// Loop de retentativas (Roda a cada 5 segundos)
setInterval(async () => {
  if (failedSyncQueue.length > 0) {
    console.log(`[SYNC RETRY] Tentando reenviar ${failedSyncQueue.length} ações pendentes para o Service Read...`);
    // Fazemos uma cópia da fila atual e limpamos a original
    const currentQueue = [...failedSyncQueue];
    failedSyncQueue.length = 0;

    for (const item of currentQueue) {
      try {
        await axios.post(`${SERVICE_READ_URL}/sync/users`, { action: item.action, data: item.data });
        console.log(`[SYNC RETRY] Ação '${item.action}' reenviada com sucesso.`);
      } catch (error) {
        console.error(`[SYNC RETRY ERROR] O servidor de leitura ainda está fora do ar. Mantendo '${item.action}' na fila.`);
        // Coloca o item de volta na fila
        failedSyncQueue.push(item);
      }
    }
  }
}, 5000);

// GET ALL - Retorna todos os usuários (Fonte da Verdade) para o MySQL recuperar dados
app.get('/users/all', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('[WRITE DB ERROR]', error);
    res.status(500).json({ error: 'Erro ao buscar no banco de escrita' });
  }
});

// CREATE - Adiciona usuário no Postgres e avisa o MySQL
app.post('/users', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }

  try {
    const result = await db.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    const newUser = result.rows[0];

    // Sincroniza
    await syncWithReadService('CREATE', newUser);

    res.status(201).json(newUser);
  } catch (error) {
    console.error('[WRITE DB ERROR]', error);
    res.status(500).json({ error: 'Erro ao salvar no banco de escrita (PostgreSQL fora do ar?)' });
  }
});

// UPDATE - Atualiza usuário no Postgres e avisa o MySQL
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  try {
    const result = await db.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [name, email, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const updatedUser = result.rows[0];

    // Sincroniza
    await syncWithReadService('UPDATE', updatedUser);

    res.json(updatedUser);
  } catch (error) {
    console.error('[WRITE DB ERROR]', error);
    res.status(500).json({ error: 'Erro ao atualizar no banco de escrita (PostgreSQL fora do ar?)' });
  }
});

// DELETE - Remove usuário no Postgres e avisa o MySQL
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const deletedUser = result.rows[0];

    // Sincroniza
    await syncWithReadService('DELETE', deletedUser);

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('[WRITE DB ERROR]', error);
    res.status(500).json({ error: 'Erro ao deletar no banco de escrita (PostgreSQL fora do ar?)' });
  }
});

app.listen(PORT, () => {
  console.log(`Service Write (PostgreSQL) rodando na porta ${PORT}`);
});
