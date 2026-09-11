// Link da planilha publicado em formato CSV
const URL_PLANILHA_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmh7g7TK56OTN4pJU-H9Ljh3fRCzXk4GVs-lIWooM0h82fJR36vyKQeP5juDSIyQnLUdnO8ViKH9N7/pub?output=csv";

// Mapeamento de Filial (value) -> Depósito padrão
const depositosPorFilial = {
    "1": 1,   // Iguatemi
    "2": 2,   // Tapejara
    "3": 1,   // Patanacity
    "4": 1,   // Ivaté
    "13": 1,  // Terra Rica
    "15": 1,  // Rondon
    "16": 1,  // Cidade Gaúcha
    "18": 1,  // Moreira Sales
    "72": 1   // Rio Paraná
};

document.addEventListener('DOMContentLoaded', () => {
    // Tela 1: Formulário de Busca e Consulta
    if (document.getElementById('buscarPeca')) {
        preencherDataEHora();
        configurarFilialDeposito();
        configurarBuscaPeca();
        configurarSubmissaoFormulario();
    }

    // Tela 2: Exibição Detalhada do Saldo
    if (document.querySelector('.saldo-card')) {
        carregarDadosDoItemDetalhado();
        configurarBotoesResultado();
    }
});

/* ==========================================================
   FUNÇÃO AUXILIAR: PARSER CSV (Preserva descrição inteira)
   ========================================================== */
function parseCSVLine(text) {
    const result = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cur.trim().replace(/^"|"$/g, ''));
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur.trim().replace(/^"|"$/g, ''));
    return result;
}

function limparTexto(texto) {
    return texto ? texto.replace(/^"|"$/g, '').trim() : '';
}

/* ==========================================================
   PÁGINA 1: FORMULÁRIO DE BUSCA E CONSULTA
   ========================================================== */

function preencherDataEHora() {
    const agora = new Date();
    const inputData = document.getElementById('data');
    const inputHora = document.getElementById('time');

    if (inputData) inputData.value = agora.toISOString().split('T')[0];
    if (inputHora) {
        const horas = String(agora.getHours()).padStart(2, '0');
        const minutos = String(agora.getMinutes()).padStart(2, '0');
        inputHora.value = `${horas}:${minutos}`;
    }
}

function configurarFilialDeposito() {
    const selectFilial = document.getElementById('filial');
    const inputDeposito = document.getElementById('deposito');

    if (selectFilial && inputDeposito) {
        const atualizarDeposito = () => {
            const val = selectFilial.value;
            inputDeposito.value = depositosPorFilial[val] !== undefined ? depositosPorFilial[val] : 1;
        };

        selectFilial.addEventListener('change', atualizarDeposito);
        atualizarDeposito();
    }
}

function configurarBuscaPeca() {
    const inputBuscar = document.getElementById('buscarPeca');
    const inputDescricao = document.getElementById('descricaoPeca');

    if (inputBuscar && inputDescricao) {
        let timeout = null;

        inputBuscar.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const codigo = e.target.value.trim();

            if (codigo.length > 0) {
                inputDescricao.value = "Buscando...";
                timeout = setTimeout(() => {
                    buscarNaPlanilha(codigo, inputDescricao);
                }, 300);
            } else {
                inputDescricao.value = "";
            }
        });
    }
}

async function buscarNaPlanilha(codigo, campoOutput) {
    try {
        const response = await fetch(URL_PLANILHA_CSV);
        if (!response.ok) throw new Error("Erro ao acessar a planilha");

        const csvText = await response.text();
        const linhas = csvText.split(/\r?\n/);
        let encontrado = false;

        for (let i = 1; i < linhas.length; i++) {
            if (!linhas[i].trim()) continue;

            const colunas = parseCSVLine(linhas[i]);

            if (colunas && colunas.length >= 2) {
                if (colunas[0] === codigo) {
                    campoOutput.value = colunas[1]; // Pega descrição completa
                    encontrado = true;
                    break;
                }
            }
        }

        if (!encontrado) {
            campoOutput.value = "Peça não encontrada";
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        campoOutput.value = "Erro na consulta";
    }
}

function configurarSubmissaoFormulario() {
    const btnConsultar = document.querySelector('.btn button');
    if (btnConsultar) {
        btnConsultar.addEventListener('click', (e) => {
            e.preventDefault();
            const codigo = document.getElementById('buscarPeca')?.value.trim();
            if (codigo) {
                window.location.href = `interface.html?codigo=${encodeURIComponent(codigo)}`;
            } else {
                alert("Por favor, digite o código de uma peça para consultar.");
            }
        });
    }
}

/* ==========================================================
   PÁGINA 2: EXIBIÇÃO DETALHADA DO SALDO E ITEM
   ========================================================== */

async function carregarDadosDoItemDetalhado() {
    const urlParams = new URLSearchParams(window.location.search);
    const codigoBusca = urlParams.get('codigo');

    if (!codigoBusca) return;

    try {
        const response = await fetch(URL_PLANILHA_CSV);
        if (!response.ok) throw new Error("Erro ao acessar os dados da planilha.");

        const csvText = await response.text();
        const linhas = csvText.split(/\r?\n/);

        let itemEncontrado = null;

        for (let i = 1; i < linhas.length; i++) {
    if (!linhas[i].trim()) continue;

    const colunas = parseCSVLine(linhas[i]);

    if (colunas && colunas[0] === codigoBusca) {
        itemEncontrado = {
            codigo: colunas[0],        // ex: "47820"
            descricao: colunas[1],
            preco: colunas[2],
            marca: colunas[3],
            endereco: colunas[4],
            // Se a coluna F estiver preenchida usa ela, senão usa o próprio código da peça (colunas[0])
            imagem: (colunas[5] && colunas[5].trim() !== '') ? colunas[5] : colunas[0],
            saldo: "1",
            unidade: "UN",
            ultimaEntrada: "-",
            ultimaSaida: "-"
        };
        break;
    }
}

        if (itemEncontrado) {
            atualizarLayout(itemEncontrado);
        } else {
            alert("Item não encontrado na base de dados.");
        }

    } catch (error) {
        console.error("Erro no carregamento:", error);
    }
}

function atualizarLayout(item) {
    const h2Descricao = document.querySelector('.header h2');
    const spanCodigo = document.querySelector('.header .codigo');
    const imgFoto = document.getElementById('fotoProduto') || document.querySelector('.foto img');

    if (h2Descricao) h2Descricao.textContent = item.descricao;
    if (spanCodigo) spanCodigo.textContent = `Código: ${item.codigo}`;

    if (imgFoto) {
        // Exibe o contêiner da imagem
        imgFoto.style.display = 'block';
        
        let nomeFoto = item.imagem.toString().trim();

        if (nomeFoto.startsWith('http')) {
            imgFoto.src = nomeFoto;
        } else {
            // Limpa qualquer extensão que já possa existir para padronizar a busca
            nomeFoto = nomeFoto.replace(/\.(png|jpg|jpeg|webp)$/i, '');

            // Testa primeiro .png com o código da peça (ex: img/47820.png)
            imgFoto.src = `img/${nomeFoto}.png`;

            // Tenta outras extensões comuns caso o arquivo não seja .png
            imgFoto.onerror = function() {
                if (this.src.endsWith('.png')) {
                    this.src = `img/${nomeFoto}.jpg`;
                } else if (this.src.endsWith('.jpg')) {
                    this.src = `img/${nomeFoto}.jpeg`;
                } else if (this.src.endsWith('.jpeg')) {
                    this.src = `img/${nomeFoto}.webp`;
                } else {
                    // Esconde o elemento caso a foto realmente não exista na pasta
                    this.onerror = null;
                    this.style.display = 'none';
                }
            };
        }
        imgFoto.alt = item.descricao;
    }

    // Saldo Atual
    const saldoValor = document.querySelector('.saldo-valor');
    if (saldoValor) {
        saldoValor.innerHTML = `${item.saldo} <span>${item.unidade}</span>`;
    }

    // Preenchimento dos Cards
    const valoresCards = document.querySelectorAll('.grid-info .card .valor');
    if (valoresCards.length >= 6) {
        valoresCards[0].textContent = item.marca || "-";
        valoresCards[1].textContent = item.endereco || "-";

        const precoNum = parseFloat(item.preco.replace('R$', '').replace('.', '').replace(',', '.'));
        const saldoNum = parseFloat(item.saldo);

        if (!isNaN(precoNum)) {
            valoresCards[2].textContent = `R$ ${precoNum.toFixed(2).replace('.', ',')}`;
            const totalEstoque = !isNaN(saldoNum) ? precoNum * saldoNum : precoNum;
            valoresCards[3].textContent = `R$ ${totalEstoque.toFixed(2).replace('.', ',')}`;
        } else {
            valoresCards[2].textContent = item.preco || "R$ 0,00";
            valoresCards[3].textContent = item.preco || "R$ 0,00";
        }

        valoresCards[4].textContent = item.ultimaEntrada || "-";
        valoresCards[5].textContent = item.ultimaSaida || "-";
    }
}

function configurarBotoesResultado() {
    const btnNovaConsulta = document.querySelector('.btn-primary');
    const btnVoltar = document.querySelector('.btn-secondary');

    if (btnNovaConsulta) {
        btnNovaConsulta.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    if (btnVoltar) {
        btnVoltar.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'index.html';
            }
        });
    }
}