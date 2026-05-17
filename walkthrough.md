# Walkthrough: Sistema Distribuído CQRS (PostgreSQL + MySQL)

A aplicação foi criada com sucesso seguindo a arquitetura distribuída. Aqui está um resumo do que foi implementado e como você pode testar a simulação de queda de banco de dados.

## O Que Foi Criado

1. **Service Write (`service-write/`)**: Um servidor Node.js que roda na porta 3001. Ele se conecta exclusivamente ao **PostgreSQL** e é responsável por Criar, Atualizar e Deletar usuários. Sempre que uma ação dá certo, ele envia uma requisição "por trás dos panos" para o Service Read sincronizar o MySQL.
2. **Service Read (`service-read/`)**: Um servidor Node.js que roda na porta 3002. Ele se conecta exclusivamente ao **MySQL** e é responsável apenas por devolver a lista de usuários para visualização no Front-end.
3. **Frontend (`frontend/`)**: Uma aplicação React estilizada com um visual moderno (Glassmorphism sutil, Dark Mode, etc.). Ela possui painéis que mostram de forma clara o status do "Service Write" e do "Service Read".
4. **Script de Inicialização (`init.sql`)**: Um script SQL com a estrutura da tabela que deve ser criada nos dois bancos de dados antes de iniciar os testes.

---

## Passos para Rodar a Aplicação

### 1. Preparar os Bancos de Dados
> [!IMPORTANT]
> Certifique-se de que os seus servidores locais do PostgreSQL (geralmente porta 5432) e do MySQL (geralmente porta 3306) estejam ligados.

- Crie um banco de dados chamado `sistemadb` tanto no Postgres quanto no MySQL.
- Abra o arquivo `init.sql` criado na raiz do seu projeto.
- Execute o comando lá dentro para criar a tabela `users` no PostgreSQL.
- Execute o mesmo comando para criar a tabela `users` no MySQL.

### 2. Configurar Variáveis de Ambiente (.env)
Vá nas pastas `service-write` e `service-read` e altere os arquivos `.env` com a **sua senha** do Postgres e do MySQL.

**Exemplo (`service-write/.env`):**
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=COLOQUE_SUA_SENHA_AQUI
DB_NAME=sistemadb
DB_PORT=5432
PORT=3001
SERVICE_READ_URL=http://localhost:3002
```

**Exemplo (`service-read/.env`):**
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=COLOQUE_SUA_SENHA_AQUI
DB_NAME=sistemadb
DB_PORT=3306
PORT=3002
```

### 3. Iniciar os Serviços

Você precisará de 3 terminais abertos (um para cada serviço).

**Terminal 1 (Service Write):**
```bash
cd service-write
node src/server.js
```

**Terminal 2 (Service Read):**
```bash
cd service-read
node src/server.js
```

**Terminal 3 (Frontend React):**
```bash
cd frontend
npm run dev
```

Abra o seu navegador no link que aparecer no Terminal 3 (geralmente `http://localhost:5173`).

---

## Como Fazer a Simulação de Queda

Agora vem a parte divertida. Com os 3 serviços rodando, faça o seguinte roteiro:

1. **Cenário Ideal**: Cadastre um usuário pela interface. Você verá uma mensagem de sucesso verde. O React fará a leitura e o usuário vai aparecer na lista do lado direito.
2. **Derrubando o PostgreSQL (Service Write)**:
   - Vá no seu serviço do PostgreSQL local e pare o serviço.
   - Tente **cadastrar** um novo usuário no React.
   - O React mostrará um **Banner Vermelho** dizendo que o Service Write (Postgres) está fora do ar.
   - *O pulo do gato*: Note que a lista do lado direito (Service Read) continuará intacta e visível! Seus usuários não perderam acesso aos dados só porque o banco de escrita caiu.
3. **Derrubando o MySQL (Service Read)**:
   - Suba o Postgres novamente e pare o serviço do MySQL local.
   - O lado direito da tela (onde fica a lista) vai desaparecer e mostrar um ícone de erro avisando que o banco de leitura inoperante.
   - No entanto, você ainda conseguirá fazer o Cadastro de novas pessoas, pois o banco de escrita estará funcionando (embora o Postgres vá falhar de sincronizar no MySQL na hora, os dados estarão salvos lá para quando o MySQL voltar!).

> [!TIP]
> A interface React foi programada para atualizar a cada 5 segundos. Isso significa que, se você derrubar um banco, em menos de 5 segundos o React detecta e mostra a mensagem de erro na tela para você. Quando você liga o banco de novo, a mensagem some sozinha!
