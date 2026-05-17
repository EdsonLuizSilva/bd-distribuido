-- Execute este script no PostgreSQL (Write DB) e também no MySQL (Read DB)
-- O esquema da tabela precisa ser idêntico.

CREATE TABLE users (
    id SERIAL PRIMARY KEY, -- No PostgreSQL
    -- id INT AUTO_INCREMENT PRIMARY KEY, -- Se for executar no MySQL, use esta linha em vez da de cima
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
);

-- NOTA PARA O MYSQL:
-- Como a sincronização tenta inserir com o mesmo ID gerado pelo Postgres, 
-- certifique-se de que a tabela no MySQL permite inserção explícita de ID 
-- (o padrão do MySQL já permite, mesmo sendo AUTO_INCREMENT).
