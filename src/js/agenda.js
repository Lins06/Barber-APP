const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const hoje = new Date().toISOString().split('T')[0];
    const inputData = document.getElementById('dataAgenda');
    
    if(inputData) {
        inputData.value = hoje;
        carregarAgendamentos(hoje);
    }

    // Event listeners
    document.getElementById('btnNovoHorario').addEventListener('click', abrirModal);
    document.getElementById('btnFecharModal').addEventListener('click', fecharModal);
    document.getElementById('btnSalvarAgendamento').addEventListener('click', salvarAgendamento);
    document.getElementById('inputCliente').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') salvarAgendamento();
    });
    
    document.getElementById('dataAgenda').addEventListener('change', (e) => {
        carregarAgendamentos(e.target.value);
    });

    // Fechar modal ao clicar fora
    document.getElementById('modalAgendamento').addEventListener('click', (e) => {
        if (e.target.id === 'modalAgendamento') fecharModal();
    });

    // Carregar barbeiros para o seletor
    carregarBarbeirosParaAgenda();
});

function carregarAgendamentos(data = null) {
    ipcRenderer.send('get-agendamentos', { data });
}

function carregarBarbeirosParaAgenda() {
    ipcRenderer.send('get-barbeiros');
}

function abrirModal() {
    console.log("Abrindo modal...");
    const modal = document.getElementById('modalAgendamento');
    const hoje = new Date().toISOString().split('T')[0];
    
    // Limpar campos e erros
    document.getElementById('inputCliente').value = '';
    document.getElementById('inputBarbeiro').value = '';
    document.getElementById('inputData').value = hoje;
    document.getElementById('inputHora').value = '';
    limparErros();
    
    // Carregar barbeiros
    carregarBarbeirosParaAgenda();
    
    modal.style.display = 'flex';
    document.getElementById('inputCliente').focus();
}

function fecharModal() {
    document.getElementById('modalAgendamento').style.display = 'none';
    limparErros();
}

function limparErros() {
    document.getElementById('erroCliente').style.display = 'none';
    document.getElementById('erroBarbeiro').style.display = 'none';
    document.getElementById('erroData').style.display = 'none';
    document.getElementById('erroHora').style.display = 'none';
    ['inputCliente', 'inputBarbeiro', 'inputData', 'inputHora'].forEach(id => {
        const elem = document.getElementById(id);
        if (elem) elem.style.borderColor = '#333';
    });
}

function mostrarErro(campo, mensagem) {
    const erroElement = document.getElementById('erro' + campo);
    if (erroElement) {
        erroElement.textContent = mensagem;
        erroElement.style.display = 'block';
    }
    
    const input = document.getElementById('input' + campo);
    if (input) input.style.borderColor = '#ff6b6b';
}

function validarForm() {
    limparErros();
    let valido = true;
    
    const cliente = document.getElementById('inputCliente').value.trim();
    const barbeiro = document.getElementById('inputBarbeiro').value;
    const data = document.getElementById('inputData').value;
    const horario = document.getElementById('inputHora').value;
    const hoje = new Date().toISOString().split('T')[0];
    
    // Validar cliente
    if (!cliente) {
        mostrarErro('Cliente', 'Digite o nome do cliente');
        valido = false;
    } else if (cliente.length < 3) {
        mostrarErro('Cliente', 'Nome deve ter pelo menos 3 caracteres');
        valido = false;
    }

    // Validar barbeiro
    if (!barbeiro) {
        mostrarErro('Barbeiro', 'Selecione um barbeiro');
        valido = false;
    }
    
    // Validar data
    if (!data) {
        mostrarErro('Data', 'Selecione uma data');
        valido = false;
    } else if (data < hoje) {
        mostrarErro('Data', 'Data não pode ser no passado');
        valido = false;
    }
    
    // Validar horário
    if (!horario) {
        mostrarErro('Hora', 'Selecione um horário');
        valido = false;
    } else {
        // Validar intervalo de funcionamento (09:00 a 18:59)
        const [horas, minutos] = horario.split(':').map(Number);
        if (horas < 9 || horas >= 19) {
            mostrarErro('Hora', 'Funcionamento: 09:00 às 18:59');
            valido = false;
        }
    }
    
    return valido;
}

function salvarAgendamento() {
    if (!validarForm()) {
        return;
    }

    const cliente = document.getElementById('inputCliente').value.trim();
    const barbeiro_id = document.getElementById('inputBarbeiro').value;
    const horario = document.getElementById('inputHora').value;
    const data = document.getElementById('inputData').value;

    console.log('Salvando agendamento:', { cliente, barbeiro_id, horario, data });
    ipcRenderer.send('novo-agendamento', { cliente, barbeiro_id, horario, data });
    fecharModal();
}

ipcRenderer.on('lista-agendamentos', (event, lista) => {
    exibirAgendamentos(lista);
});

ipcRenderer.on('lista-barbeiros', (event, barbeiros) => {
    preencherSelectBarbeiros(barbeiros);
});

// Atualiza a lista quando salvar um novo
ipcRenderer.on('agendamento-salvo', () => {
    carregarAgendamentos(document.getElementById('dataAgenda').value || null);
});

function preencherSelectBarbeiros(barbeiros) {
    const select = document.getElementById('inputBarbeiro');
    if (!select) return;
    
    // Manter a opção padrão
    const defaultOption = select.querySelector('option[disabled]');
    select.innerHTML = defaultOption ? defaultOption.outerHTML : '<option value="" disabled selected>Selecione um barbeiro</option>';
    
    if (barbeiros && barbeiros.length > 0) {
        barbeiros.forEach(barbeiro => {
            const option = document.createElement('option');
            option.value = barbeiro.id;
            option.textContent = barbeiro.nome;
            select.appendChild(option);
        });
    }
}

function exibirAgendamentos(agendamentos) {
    const container = document.getElementById('agenda-lista');
    
    if (!agendamentos || agendamentos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666; margin-top: 50px;">Nenhum agendamento encontrado</p>';
        return;
    }

    container.innerHTML = agendamentos.map(agendamento => `
        <div class="stat-card" style="margin-bottom: 15px; background: #252525; border-left: 5px solid var(--accent); transition: transform 0.2s;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                <div style="flex: 1;">
                    <h3 style="color: var(--accent); margin: 0;">${agendamento.cliente_nome}</h3>
                    <p style="margin: 5px 0; color: #aaa;">👨‍💼 ${agendamento.barbeiro_nome || 'N/A'}</p>
                    <p style="margin: 5px 0; color: #aaa;">📅 ${agendamento.data} | ⏰ ${agendamento.horario}h</p>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="background: ${agendamento.status === 'Concluido' ? '#28a745' : agendamento.status === 'Confirmado' ? '#00a8e8' : '#c6a664'}; color: ${agendamento.status === 'Concluido' || agendamento.status === 'Confirmado' ? 'white' : 'black'}; padding: 8px 12px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                        ${agendamento.status || 'PENDENTE'}
                    </span>
                    <button style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px; transition: background 0.3s;" onclick="deletarAgendamento(${agendamento.id})" onMouseEnter="this.style.background='#c82333'" onMouseLeave="this.style.background='#dc3545'">
                        🗑️ Deletar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function deletarAgendamento(id) {
    if (confirm('Tem certeza que deseja deletar este agendamento?')) {
        ipcRenderer.send('deletar-agendamento', id);
    }
}

ipcRenderer.on('agendamento-deletado', (event, dados) => {
    console.log('Agendamento deletado:', dados);
    // Recarregar agendamentos da data selecionada
    const dataAgenda = document.getElementById('dataAgenda');
    if (dataAgenda) {
        carregarAgendamentos(dataAgenda.value);
    }
});