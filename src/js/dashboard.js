const { ipcRenderer } = require('electron');

let barbeiraSelecionado = null;
const imagens = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
];

document.addEventListener('DOMContentLoaded', () => {
    carregarBarbeiros();
    // Carregar ganhos totais do dia ao abrir o dashboard
    carregarGanhosTotal();
    
    // Botão voltar
    const btnVoltar = document.getElementById('btnVoltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', () => {
            barbeiraSelecionado = null;
            document.getElementById('barbeiros-container').style.display = 'grid';
            document.getElementById('agendamentos-barbeiro').style.display = 'none';
            // Recarregar ganhos totais ao voltar
            carregarGanhosTotal();
        });
    }
});

function carregarGanhosTotal() {
    ipcRenderer.send('ganhos-do-dia-todos');
}

function carregarBarbeiros() {
    ipcRenderer.send('get-barbeiros');
}

ipcRenderer.on('lista-barbeiros', (event, barbeiros) => {
    exibirBarbeiros(barbeiros);
});

function exibirBarbeiros(barbeiros) {
    const container = document.getElementById('barbeiros-container');
    
    if (!barbeiros || barbeiros.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666; margin-top: 50px;">Nenhum barbeiro encontrado</p>';
        return;
    }

    container.innerHTML = barbeiros.map((barbeiro, index) => `
        <div class="barber-card" style="cursor: pointer; transition: transform 0.3s, box-shadow 0.3s;" onclick="selecionarBarbeiro(${barbeiro.id}, '${barbeiro.nome}')">
            <div class="barber-img">
                <img src="${imagens[index % imagens.length]}" alt="${barbeiro.nome}" style="cursor: pointer;">
            </div>
            <h3>${barbeiro.nome}</h3>
            <p>${barbeiro.especialidade}</p>
            <div class="status online">${barbeiro.status}</div>
        </div>
    `).join('');
}

function selecionarBarbeiro(id, nome) {
    console.log("Selecionado barbeiro:", id, nome);
    barbeiraSelecionado = { id, nome };
    
    // 1. Ocultar grid de barbeiros
    document.getElementById('barbeiros-container').style.display = 'none';
    // 2. Mostrar seção de agendamentos
    document.getElementById('agendamentos-barbeiro').style.display = 'block';
    // 3. Atualizar nome do barbeiro
    document.getElementById('barbeiro-selecionado').textContent = nome;
    // 4. Carregar dados do barbeiro
    carregarDadosBarbeiro(id);
}

function carregarDadosBarbeiro(barbeiro_id) {
    // Carregar agendamentos
    ipcRenderer.send('get-agendamentos', { barbeiro_id });
    // Carregar ganhos do dia
    ipcRenderer.send('ganhos-do-dia', barbeiro_id);
    // Próximo agendamento
    ipcRenderer.send('proximo-agendamento', barbeiro_id);
}

ipcRenderer.on('ganhos-calculados', (event, dados) => {
    const total = dados.total || 0;
    document.getElementById('ganhosHoje').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
});

ipcRenderer.on('proximo-obtido', (event, agendamento) => {
    if (agendamento && agendamento.horario) {
        document.getElementById('proximoHorario').textContent = `${agendamento.horario}h`;
    } else {
        document.getElementById('proximoHorario').textContent = 'Nenhum';
    }
});

ipcRenderer.on('lista-agendamentos', (event, agendamentos) => {
    exibirAgendamentosBarbeiro(agendamentos);
    atualizarStatisticas(agendamentos);
});

function atualizarStatisticas(agendamentos) {
    if (!agendamentos) agendamentos = [];
    document.getElementById('totalAgendamentos').textContent = agendamentos.filter(a => a.status !== 'Cancelado').length;
}

function exibirAgendamentosBarbeiro(agendamentos) {
    const container = document.getElementById('agendamentos-lista');
    
    if (!agendamentos || agendamentos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666; grid-column: 1/-1; padding: 40px;">Nenhum agendamento encontrado para este barbeiro</p>';
        return;
    }

    // Separar por status
    const pendentes = agendamentos.filter(a => a.status === 'Pendente');
    const confirmados = agendamentos.filter(a => a.status === 'Confirmado');
    const concluidos = agendamentos.filter(a => a.status === 'Concluido');

    let html = '';

    // Seção de pendentes
    if (pendentes.length > 0) {
        html += '<p style="grid-column: 1/-1; color: var(--accent); font-weight: 700; font-size: 14px; text-transform: uppercase; margin-bottom: 0;">⏳ Pendentes de Confirmação</p>';
        html += pendentes.map(agendamento => criarCardAgendamento(agendamento, 'pendente')).join('');
    }

    // Seção de confirmados
    if (confirmados.length > 0) {
        html += '<p style="grid-column: 1/-1; color: #00a8e8; font-weight: 700; font-size: 14px; text-transform: uppercase; margin-bottom: 0; margin-top: 30px;">✓ Confirmados para Hoje</p>';
        html += confirmados.map(agendamento => criarCardAgendamento(agendamento, 'confirmado')).join('');
    }

    // Seção de concluídos
    if (concluidos.length > 0) {
        html += '<p style="grid-column: 1/-1; color: #28a745; font-weight: 700; font-size: 14px; text-transform: uppercase; margin-bottom: 0; margin-top: 30px;">✓ Cortes Concluídos</p>';
        html += concluidos.map(agendamento => criarCardAgendamento(agendamento, 'concluido')).join('');
    }

    container.innerHTML = html;
}

function criarCardAgendamento(agendamento, tipo) {
    let botoes = '';
    
    if (tipo === 'pendente') {
        botoes = `
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button style="flex: 1; background: #28a745; color: white; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: 600; font-size: 12px; transition: background 0.3s;" onclick="aceitarAgendamento(${agendamento.id})" onMouseEnter="this.style.background='#218838'" onMouseLeave="this.style.background='#28a745'">✓ Aceitar</button>
                <button style="flex: 1; background: #dc3545; color: white; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: 600; font-size: 12px; transition: background 0.3s;" onclick="recusarAgendamento(${agendamento.id})" onMouseEnter="this.style.background='#c82333'" onMouseLeave="this.style.background='#dc3545'">✕ Recusar</button>
            </div>
        `;
    } else if (tipo === 'confirmado') {
        botoes = `
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button style="flex: 1; background: var(--accent); color: black; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: 600; font-size: 12px; transition: background 0.3s;" onclick="concluirAgendamento(${agendamento.id})" onMouseEnter="this.style.background='#d4af37'" onMouseLeave="this.style.background='var(--accent)'">✓ Concluir Corte</button>
            </div>
        `;
    }

    return `
        <div style="background: linear-gradient(135deg, #252525 0%, #1e1e1e 100%); border: 2px solid ${tipo === 'pendente' ? '#ff9800' : tipo === 'confirmado' ? '#00a8e8' : '#28a745'}; border-radius: 10px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: transform 0.2s, box-shadow 0.2s;" onMouseEnter="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 20px rgba(198, 166, 100, 0.2)'" onMouseLeave="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)'">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                    <h3 style="color: var(--accent); margin: 0 0 5px 0; font-size: 18px;">${agendamento.cliente_nome}</h3>
                    <p style="margin: 0; color: #aaa; font-size: 12px;">Cliente</p>
                </div>
                <span style="background: ${tipo === 'pendente' ? '#ff9800' : tipo === 'confirmado' ? '#00a8e8' : '#28a745'}; color: ${tipo === 'pendente' ? 'black' : 'white'}; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 12px;">
                    ${agendamento.status}
                </span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding-top: 15px; border-top: 1px solid #333;">
                <div>
                    <p style="margin: 0 0 5px 0; color: #aaa; font-size: 11px;">📅 DATA</p>
                    <p style="margin: 0; color: white; font-size: 16px; font-weight: 600;">${formatarData(agendamento.data)}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; color: #aaa; font-size: 11px;">🕐 HORÁRIO</p>
                    <p style="margin: 0; color: white; font-size: 16px; font-weight: 600;">${agendamento.horario}h</p>
                </div>
            </div>
            ${botoes}
        </div>
    `;
}

function formatarData(data) {
    if (!data) return 'N/A';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
}

function aceitarAgendamento(id) {
    atualizarStatusAgendamento(id, 'Confirmado', 'Agendamento confirmado com sucesso!');
}

function recusarAgendamento(id) {
    if (confirm('Tem certeza que deseja recusar este agendamento?')) {
        atualizarStatusAgendamento(id, 'Cancelado', 'Agendamento recusado!');
    }
}

function concluirAgendamento(id) {
    if (confirm('Marcar este corte como concluído?')) {
        atualizarStatusAgendamento(id, 'Concluido', 'Corte concluído com sucesso!');
    }
}

function atualizarStatusAgendamento(id, novoStatus, mensagem) {
    ipcRenderer.send('atualizar-agendamento', { id, status: novoStatus });
}

ipcRenderer.on('agendamento-atualizado', (event, dados) => {
    console.log('Agendamento atualizado:', dados);
    // Recarregar dados do barbeiro
    if (barbeiraSelecionado) {
        carregarDadosBarbeiro(barbeiraSelecionado.id);
    }
});
