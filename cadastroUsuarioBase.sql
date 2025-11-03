INSERT INTO tbAreas (nomeArea) VALUES ("teste");
INSERT INTO tbEquipe (nomeMembro, emailMembro, foneMembro, idArea, acessoSistema, senhaMembro) VALUES ("Vitor", "vitor.rohling.becker@gmail.com", "45998041305", 1, true, "$2b$10$uxL1DcgiR/nFCIuhUv7llO17HujihYw1IHvu1jkcQyAzJ.EYfOHbi");
INSERT INTO tbConfig (idUsuario, tempoAvisos, notificacoesSistema, modoDaltonismo, temaCor, somNotificacoes, volumeNotificacao) VALUES (1, 30, false, false, "claro", true, 100);

-- Selecionar o banco
USE dbSigeq;

-- Inserir áreas (IDs de 1 a 10)
INSERT INTO tbAreas (nomeArea) VALUES
('Administração'),
('Tecnologia da Informação'),
('Manutenção'),
('Recursos Humanos'),
('Segurança'),
('Limpeza'),
('Logística'),
('Pesquisa'),
('Produção'),
('Financeiro');

-- Inserir membros da equipe (tbEquipe)
INSERT INTO tbEquipe (nomeMembro, emailMembro, foneMembro, idArea, acessoSistema, senhaMembro, tokenAcesso, dataToken) VALUES
('Ana Souza', 'ana.souza@empresa.com', '11987654321', 1, TRUE, 'senha123', '', NULL),
('Bruno Lima', 'bruno.lima@empresa.com', '11923456789', 2, TRUE, 'senha123', '', NULL),
('Carla Mendes', 'carla.mendes@empresa.com', '21998765432', 3, FALSE, NULL, '', NULL),
('Daniel Costa', 'daniel.costa@empresa.com', '11934567890', 4, TRUE, 'senha123', '', NULL),
('Eduardo Alves', 'eduardo.alves@empresa.com', '31998761234', 5, FALSE, NULL, '', NULL),
('Fernanda Rocha', 'fernanda.rocha@empresa.com', '21987651234', 6, TRUE, 'senha123', '', NULL),
('Gustavo Nunes', 'gustavo.nunes@empresa.com', '21999887766', 7, FALSE, NULL, '', NULL),
('Helena Dias', 'helena.dias@empresa.com', '11988776655', 8, TRUE, 'senha123', '', NULL),
('Igor Ferreira', 'igor.ferreira@empresa.com', '11977665544', 9, FALSE, NULL, '', NULL),
('Juliana Martins', 'juliana.martins@empresa.com', '31966554433', 10, TRUE, 'senha123', '', NULL);

-- Inserir equipamentos (tbEquipamentos)
INSERT INTO tbEquipamentos (imagemEquipamento, nomeEquipamento, codEquipamento, altoValor, idArea) VALUES
('img1.webp', 'Notebook Dell', 'EQP001', TRUE, 2),
('img2.webp', 'Projetor Epson', 'EQP002', TRUE, 1),
('img3.webp', 'Parafusadeira Bosch', 'EQP003', FALSE, 3),
('img4.webp', 'Câmera de Segurança', 'EQP004', TRUE, 5),
('img5.webp', 'Rádio Comunicador', 'EQP005', FALSE, 5),
('img6.webp', 'Vassoura Industrial', 'EQP006', FALSE, 6),
('img7.webp', 'Paleteira Manual', 'EQP007', TRUE, 7),
('img8.webp', 'Microscópio', 'EQP008', TRUE, 8),
('img9.webp', 'Torno Mecânico', 'EQP009', TRUE, 9),
('img10.webp', 'Calculadora Financeira', 'EQP010', FALSE, 10);

-- Inserir empréstimos (tbEmprestimos)
INSERT INTO tbEmprestimos (idEquipamento, dataRecebimento, dataDevolucao, dataDevolvido, idMembro, localUso, infoReserva, devolvidoPor, idMembroVistoria, obsVistoria) VALUES
(1, '2025-10-25 09:00:00', '2025-10-25 18:00:00', '2025-10-30 17:30:00', 2, 'Sala TI', 'Uso em treinamento interno', 'Bruno Lima', 1, 'Observações do Usuário: Equipamento em bom estado'),
(2, '2025-10-26 08:00:00', '2025-10-26 17:00:00', '1900-01-01 01:01:01', 1, 'Auditório', 'Apresentação institucional', '', NULL, NULL),
(3, '2025-10-20 07:30:00', '2025-10-20 17:00:00', '2025-10-25 16:00:00', 3, 'Oficina', 'Manutenção preventiva', 'Carla Mendes', 1, 'Observações do Usuário: Limpo e funcional'),
(4, '2025-10-15 09:00:00', '2025-10-15 17:00:00', '2025-10-20 16:30:00', 5, 'Portaria', 'Teste de vigilância', 'Eduardo Alves', 1, 'Observações do Usuário: Sem danos'),
(5, '2025-10-22 10:00:00', '2025-10-22 18:00:00', '2025-10-23 18:10:00', 6, 'Galpão', 'Comunicação interna', 'Fernanda Rocha', 1, 'Observações do Usuário: OK'),
(6, '2025-10-10 09:00:00', '2025-10-10 18:00:00', '2025-10-15 17:45:00', 6, 'Depósito', 'Limpeza geral', 'Fernanda Rocha', 1, 'Observações do Usuário: Normal'),
(7, '2025-10-28 08:00:00', '2025-10-28 18:00:00', '1900-01-01 01:01:01', 7, 'Armazém', 'Movimentação de pallets', '', NULL, NULL),
(8, '2025-10-12 09:00:00', '2025-10-12 17:00:00', '2025-10-18 16:45:00', 8, 'Laboratório', 'Análise de amostras', 'Helena Dias', 1, 'Observações do Usuário: Perfeito'),
(9, '2025-10-05 08:00:00', '2025-10-05 17:00:00', '2025-10-12 17:10:00', 9, 'Fábrica', 'Teste de produção', 'Igor Ferreira', 1, 'Observações do Usuário: Funcionando bem'),
(10, '2025-10-29 10:00:00', '2025-10-29 17:00:00', '1900-01-01 01:01:01', 10, 'Escritório Financeiro', 'Cálculos internos', '', NULL, NULL);

-- Inserir configurações (tbConfig)
INSERT INTO tbConfig (idUsuario, tempoAvisos, notificacoesSistema, modoDaltonismo, temaCor, somNotificacoes, volumeNotificacao) VALUES
(1, 15, TRUE, FALSE, 'claro', TRUE, 80),
(2, 10, TRUE, FALSE, 'escuro', TRUE, 60),
(3, 20, FALSE, FALSE, 'claro', FALSE, 0),
(4, 12, TRUE, FALSE, 'escuro', TRUE, 70),
(5, 18, TRUE, TRUE, 'claro', TRUE, 90),
(6, 15, TRUE, FALSE, 'escuro', TRUE, 75),
(7, 25, FALSE, FALSE, 'claro', FALSE, 0),
(8, 10, TRUE, FALSE, 'escuro', TRUE, 85),
(9, 8, TRUE, FALSE, 'claro', TRUE, 60),
(10, 5, TRUE, TRUE, 'escuro', TRUE, 100);
-- Inserir avisos (tbAvisos) com formato JSON quando avisoSistema = TRUE
INSERT INTO tbAvisos (avisoSistema, idUsuario, mensagemAviso, dataAviso) VALUES
(TRUE, 1, '{"type": 2, "msg": "Sistema passará por manutenção amanhã."}', '2025-11-01 09:00:00'),
(FALSE, 2, 'Favor devolver o notebook emprestado.', '2025-11-02 10:30:00'),
(TRUE, 4, '{"type": 1, "msg": "Atualização de segurança concluída."}', '2025-10-28 15:45:00'),
(FALSE, 3, 'Equipamento devolvido com sucesso.', '2025-11-02 17:10:00'),
(TRUE, 5, '{"type": 2, "msg": "Nova política de empréstimos disponível."}', '2025-10-30 14:00:00'),
(FALSE, 6, 'Aviso de limpeza programada.', '2025-11-03 07:00:00'),
(TRUE, 8, '{"type": 1, "msg": "Backup automático executado."}', '2025-11-01 22:00:00'),
(FALSE, 9, 'Reserva confirmada.', '2025-11-02 09:30:00'),
(TRUE, 10, '{"type": 2, "msg": "Nova versão do sistema liberada."}', '2025-11-03 08:00:00'),
(FALSE, 7, 'Devolução pendente de vistoria.', '2025-11-03 09:45:00');
