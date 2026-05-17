# Projeto: Arquitetura de Banco de Dados Distribuido

Esta aplicação demonstra a implementação de um padrão arquitetural de **Read/Write Split** (Separação de Leitura e Escrita) utilizando dois bancos de dados distintos: **PostgreSQL** (para escrita) e **MySQL** (para leitura). 

O objetivo do projeto é demonstrar alta disponibilidade, separação de responsabilidades e **tolerância a falhas**, garantindo que se o servidor de leitura ficar inoperante, os dados não sejam perdidos e a sincronização seja restabelecida automaticamente quando o serviço retornar.

## 🏗️ Arquitetura do Sistema

A aplicação é dividida em 3 partes principais:

1. **Frontend (React/Vite)**
   - Provê a Interface do usuário.
   - Envia solicitações de cadastros, edições e exclusões para o **Service Write**.
   - Busca a listagem de usuários do **Service Read**.

2. **Service Write (Node.js + PostgreSQL) - Porta 3001**
   - Recebe todas as operações de escrita (POST, PUT, DELETE).
   - Salva os dados na *Fonte da Verdade* (PostgreSQL).
   - Envia um evento de sincronização (Push) para o *Service Read*.
   - **Tolerância a falhas:** Caso o *Service Read* esteja offline, o *Service Write* enfileira os eventos pendentes na memória e tenta reenviá-los a cada 5 segundos (*Retry Queue*).

3. **Service Read (Node.js + MySQL) - Porta 3002**
   - Recebe as operações de leitura (GET) do Frontend.
   - Fornece dados rapidamente a partir do banco MySQL.
   - **Tolerância a falhas:** Ao ser inicializado, realiza um *Pull Sync*, buscando proativamente todos os registros do *Service Write* para recuperar qualquer dado que possa ter sido perdido ou desatualizado durante sua ausência.

---

## 🚀 Como executar o projeto em outra máquina

### Pré-requisitos
- **Node.js** (versão 20+ ou superior recomendada)
- **PostgreSQL** instalado e rodando.
- **MySQL** instalado e rodando.

### 1. Configuração dos Bancos de Dados
Você precisa criar a mesma tabela em ambos os bancos de dados. Um modelo de script está disponível na raiz do projeto no arquivo `init.sql`.

**No PostgreSQL:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
);
```

**No MySQL:**
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
);
```

### 2. Configuração das Variáveis de Ambiente
Dentro de cada microsserviço back-end, é necessário configurar as credenciais do banco de dados criando um arquivo chamado `.env`.

Crie um arquivo `.env` na pasta `service-write`:
```env
DB_USER=seu_usuario_postgres
DB_PASSWORD=sua_senha_postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seu_banco_postgres
PORT=3001
SERVICE_READ_URL=http://localhost:3002
```

Crie um arquivo `.env` na pasta `service-read`:
```env
DB_USER=seu_usuario_mysql
DB_PASSWORD=sua_senha_mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=seu_banco_mysql
PORT=3002
SERVICE_WRITE_URL=http://localhost:3001
```

### 3. Instalação e Execução

Para rodar a aplicação completa, você precisará de **3 terminais abertos**.

**Terminal 1: Service Write (PostgreSQL)**
```bash
cd service-write
npm install
node src/server.js
```

**Terminal 2: Service Read (MySQL)**
```bash
cd service-read
npm install
node src/server.js
```

**Terminal 3: Frontend**
```bash
cd frontend
npm install
npm run dev
```

Após iniciar todos os serviços, acesse o link fornecido no terminal do frontend (geralmente `http://localhost:5173`).

---

## 🧪 Testando a Tolerância a Falhas

Para verificar a resiliência do sistema com as próprias mãos:
1. Com tudo rodando, cadastre um usuário pelo Frontend e veja ele aparecer na lista.
2. No terminal do `service-read`, pressione `Ctrl + C` para desligar o servidor de leitura do MySQL.
3. Cadastre mais um usuário no frontend. Você notará que ele não aparecerá na listagem (pois o serviço de leitura caiu), mas no log do `service-write` ele foi salvo com sucesso no PostgreSQL e adicionado à fila de retentativas.
4. Ligue novamente o `service-read` rodando `node src/server.js`.
5. Observe os logs. O `service-read` vai rodar a sincronização de inicialização (Startup Pull Sync) e o `service-write` vai esvaziar a fila. A tela do frontend vai se atualizar automaticamente com o usuário que parecia perdido!
