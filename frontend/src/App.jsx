import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ServerCrash, Database, UserPlus, Pencil, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import './index.css';

// URLs dos microsserviços
const API_WRITE = 'http://localhost:3001/users'; // PostgreSQL
const API_READ = 'http://localhost:3002/users';  // MySQL

function App() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [editingId, setEditingId] = useState(null);

  const [readStatus, setReadStatus] = useState({ isOnline: true, error: '' });
  const [writeStatus, setWriteStatus] = useState({ success: '', error: '' });

  // Busca os usuários do Service Read (MySQL)
  const fetchUsers = async () => {
    try {
      const response = await axios.get(API_READ);
      setUsers(response.data);
      setReadStatus({ isOnline: true, error: '' });
    } catch (err) {
      setReadStatus({ isOnline: false, error: 'Falha ao conectar no Servidor de Leitura (MySQL caiu?)' });
    }
  };

  useEffect(() => {
    fetchUsers();
    // Atualiza a cada 5 segundos para refletir mudanças e estado do servidor
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setWriteStatus({ success: '', error: '' });

    try {
      if (editingId) {
        await axios.put(`${API_WRITE}/${editingId}`, formData);
        setWriteStatus({ success: 'Usuário atualizado com sucesso!', error: '' });
      } else {
        await axios.post(API_WRITE, formData);
        setWriteStatus({ success: 'Usuário cadastrado com sucesso!', error: '' });
      }

      setFormData({ name: '', email: '' });
      setEditingId(null);
      fetchUsers(); // Força a atualização da tela

      // Limpa mensagem de sucesso após 3s
      setTimeout(() => setWriteStatus({ success: '', error: '' }), 3000);
    } catch (err) {
      setWriteStatus({ success: '', error: 'Falha ao conectar no Servidor de Escrita (PostgreSQL caiu?)' });
    }
  };

  const handleEdit = (user) => {
    setFormData({ name: user.name, email: user.email });
    setEditingId(user.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    setWriteStatus({ success: '', error: '' });
    try {
      await axios.delete(`${API_WRITE}/${id}`);
      setWriteStatus({ success: 'Usuário removido com sucesso!', error: '' });
      fetchUsers();
      setTimeout(() => setWriteStatus({ success: '', error: '' }), 3000);
    } catch (err) {
      setWriteStatus({ success: '', error: 'Falha ao tentar deletar. Servidor de Escrita fora do ar?' });
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Sistema Distribuído CQRS</h1>
        <p>PostgreSQL (Escrita) &harr; MySQL (Leitura)</p>
      </header>

      {/* Alertas de Escrita */}
      {writeStatus.error && (
        <div className="status-banner error">
          <ServerCrash size={20} />
          <span><strong>Erro de Escrita:</strong> {writeStatus.error}</span>
        </div>
      )}
      {writeStatus.success && (
        <div className="status-banner success">
          <CheckCircle2 size={20} />
          <span>{writeStatus.success}</span>
        </div>
      )}

      {/* Alerta de Leitura */}
      {!readStatus.isOnline && (
        <div className="status-banner error">
          <AlertCircle size={20} />
          <span><strong>Erro de Leitura:</strong> {readStatus.error}</span>
        </div>
      )}

      <div className="layout-grid">
        {/* Painel de Escrita */}
        <section className="card">
          <h2><Database size={20} /> Service Write (Postgres)</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nome</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Nome do usuário"
              />
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="email@exemplo.com"
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn">
                <UserPlus size={18} /> {editingId ? 'Atualizar' : 'Cadastrar'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-outline" onClick={() => { setEditingId(null); setFormData({ name: '', email: '' }); }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Painel de Leitura */}
        <section className="card">
          <h2><Database size={20} /> Service Read (MySQL)</h2>

          {!readStatus.isOnline ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <ServerCrash size={48} style={{ margin: '0 auto', marginBottom: '1rem', opacity: 0.5 }} />
              <p>O banco de dados de leitura está inoperante.<br />Não é possível exibir os usuários.</p>
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <p>Nenhum usuário encontrado no MySQL.</p>
            </div>
          ) : (
            <div className="user-list">
              {users.map(user => (
                <div key={user.id} className="user-item">
                  <div className="user-info">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <div className="actions">
                    <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => handleEdit(user)}>
                      <Pencil size={16} />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(user.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
