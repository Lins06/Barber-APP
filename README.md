💈 BarberPRO - Gestão de Barbearias
Sistema Desktop para organização de agendas, barbeiros e controle financeiro.

O BarberPRO é uma aplicação desktop desenvolvida com Electron e SQLite, focada em substituir o antigo caderno de anotações por uma interface moderna, rápida e intuitiva. O projeto prioriza a experiência do usuário (UX) com um design Dark Gold de alta performance.

🚀 Funcionalidades Principais
Dashboard Visual: Visão geral da equipe com cards de status em tempo real.

Agenda Inteligente: Organização de horários por data com ordenação automática de proximidade.

Gestão de Equipe: Cadastro e gerenciamento de barbeiros.

Controle de Serviços: Tabela de preços editável para diferentes tipos de cortes.

Módulo Financeiro: Acompanhamento de faturamento diário e mensal.

🛠️ Tecnologias Utilizadas
Runtime: Node.js (Versão 18 ou superior)

Framework: Electron

Banco de Dados: SQLite3

Frontend: HTML5, CSS3 (Flexbox/Grid) e JavaScript Puro (Vanilla JS).

📥 Pré-requisitos
Antes de começar, você precisará ter instalado em sua máquina:

Visual Studio Code (Editor de código).

Node.js (Ambiente de execução).

Git (Para clonar o repositório).

💻 Como Executar o Projeto
Siga os passos abaixo no seu terminal (dentro do VS Code):

1. Clonar o repositório
Bash
git clone https://github.com/Lins06/Barber-APP.git
cd Barber-APP
2. Instalar as dependências
Como a pasta node_modules é ignorada pelo Git por segurança, você precisa baixá-la rodando:

Bash
npm install
3. Executar a Aplicação
Para abrir a janela do BarberPRO no seu computador:

Bash
npm start
📂 Estrutura do Projeto
Plaintext
BARBER-APP/
├── src/
│   ├── css/           # Estilização (style.css)
│   ├── js/            # Lógica das telas (agenda.js, dashboard.js...)
│   └── views/         # Arquivos HTML das telas
├── main.js            # Arquivo principal do Electron (Backend)
├── barbearia.db       # Banco de dados SQLite
└── package.json       # Configurações do projeto e scripts
⚠️ Dicas de Desenvolvimento
Console do Desenvolvedor: Se a tela ficar branca ou algo não carregar, use o atalho Ctrl + Shift + I dentro do app para abrir o console e ver os erros.

SQLite: O arquivo barbearia.db será criado automaticamente na primeira execução caso ele não exista.

Desenvolvido por Gabriel Lins ✂️
Estudante de Análise e Desenvolvimento de Sistemas - 4º Semestre
