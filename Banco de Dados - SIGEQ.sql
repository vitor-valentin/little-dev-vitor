CREATE DATABASE dbSigeq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE dbSigeq;

CREATE TABLE tbAreas (
    idArea INT AUTO_INCREMENT PRIMARY KEY,
    nomeArea VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE tbEquipe (
    idMembro INT AUTO_INCREMENT PRIMARY KEY,
    nomeMembro VARCHAR(40) NOT NULL,
    emailMembro VARCHAR(60) UNIQUE NOT NULL,
    foneMembro VARCHAR(11) UNIQUE NOT NULL,
    idArea INT,
    acessoSistema BOOLEAN NOT NULL,
    senhaMembro VARCHAR(40),
    FOREIGN KEY (idArea) REFERENCES tbAreas(idArea)
);

CREATE TABLE tbEquipamentos (
    idEquipamento INT AUTO_INCREMENT PRIMARY KEY,
    imagemEquipamento VARCHAR(100) NOT NULL UNIQUE,
    nomeEquipamento VARCHAR(70) NOT NULL,
    codEquipamento VARCHAR(50) NOT NULL,
    altoValor BOOLEAN NOT NULL,
    idArea INT,
    FOREIGN KEY (idArea) REFERENCES tbAreas(idArea)
);

CREATE TABLE tbAvisos (
    idAviso INT AUTO_INCREMENT PRIMARY KEY,
    avisoSistema BOOLEAN NOT NULL,
    idUsuario INT,
    mensagemAviso VARCHAR(255) NOT NULL,
    dataAviso DATETIME NOT NULL,
    FOREIGN KEY (idUsuario) REFERENCES tbEquipe(idMembro)
);

CREATE TABLE tbEmprestimos (
    idEmprestimo INT AUTO_INCREMENT PRIMARY KEY,
    idEquipamento INT,
    dataRecebimento DATETIME NOT NULL,
    dataDevolucao DATETIME NOT NULL,
    dataDevolvido DATETIME NOT NULL,
    idMembro INT,
    localUso VARCHAR(30),
    infoReserva VARCHAR(200),
    idMembroVistoria INT,
    obsVistoria VARCHAR(255),
    FOREIGN KEY (idEquipamento) REFERENCES tbEquipamentos(idEquipamento),
    FOREIGN KEY (idMembro) REFERENCES tbEquipe(idMembro),
    FOREIGN KEY (idMembroVistoria) REFERENCES tbEquipe(idMembro)
);

CREATE TABLE tbConfig (
    idConfig INT AUTO_INCREMENT PRIMARY KEY,
    idUsuario INT,
    tempoAvisos TINYINT NOT NULL,
    notificacoesSistema BOOLEAN NOT NULL,
    modoDaltonismo BOOLEAN NOT NULL,
    temaCor VARCHAR(6) NOT NULL,
    somNotificacoes BOOLEAN NOT NULL,
    volumeNotificacao TINYINT NOT NULL,
    FOREIGN KEY (idUsuario) REFERENCES tbEquipe(idMembro)
);