import { state } from './state.js';

/** Transações do mês/ano em exibição (state.currentMonth/currentYear). */
export function getMonthlyTransactions() {
  return state.transactions.filter(
    (t) => t.month === state.currentMonth && t.year === state.currentYear,
  );
}

export function formatCurrency(value) {
  return 'R$ ' + Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCompactCurrency(value) {
  const amount = Number(value || 0);
  if (amount >= 1000) {
    const compact = (Math.round(amount / 100) / 10).toLocaleString('pt-BR');
    return `R$${compact}k`;
  }
  return `R$${Math.round(amount)}`;
}

export function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

export function parseVoiceInput(text) {
  const wordToNumber = {
    um: 1,
    dois: 2,
    tres: 3,
    três: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
    onze: 11,
    doze: 12,
    treze: 13,
    quatorze: 14,
    quinze: 15,
    dezesseis: 16,
    dezessete: 17,
    dezoito: 18,
    dezenove: 19,
    vinte: 20,
    trinta: 30,
    quarenta: 40,
    cinquenta: 50,
    sessenta: 60,
    setenta: 70,
    oitenta: 80,
    noventa: 90,
    cem: 100,
    cento: 100,
    duzentos: 200,
    trezentos: 300,
    quatrocentos: 400,
    quinhentos: 500,
    mil: 1000,
  };

  let value = 0;
  const numberMatch = text.match(/(?:r\$\s*)?(\d+(?:[.,]\d+)?)/i);
  if (numberMatch) {
    value = parseFloat(numberMatch[1].replace(',', '.'));
  }

  if (!value) {
    const words = text.toLowerCase().split(/\s+/);
    let current = 0;

    for (const word of words) {
      if (wordToNumber[word] === undefined) {
        continue;
      }

      if (wordToNumber[word] === 1000) {
        current = (current || 1) * 1000;
      } else {
        current += wordToNumber[word];
      }
    }

    value = current;
  }

  const normalizedText = text.toLowerCase();
  let category = 'Outros';

  if (/almoço|lanche|jantar|café|comida|pizza|restaurante|mercado|supermercado|ifood/.test(normalizedText)) {
    category = 'Alimentação';
  } else if (/uber|ônibus|gasolina|táxi|combustível|transporte|metrô|passagem/.test(normalizedText)) {
    category = 'Transporte';
  } else if (/remédio|farmácia|médico|consulta|saúde|hospital|plano/.test(normalizedText)) {
    category = 'Saúde';
  } else if (/netflix|cinema|show|bar|balada|lazer|jogo|streaming/.test(normalizedText)) {
    category = 'Lazer';
  } else if (/aluguel|energia|água|internet|luz|condomínio|casa/.test(normalizedText)) {
    category = 'Casa';
  } else if (/salário|freela|freelance|pagamento|recebi|trabalho|cliente/.test(normalizedText)) {
    category = 'Trabalho';
  }

  let description = text
    .replace(/r\$/gi, '')
    .replace(/\d+(?:[.,]\d+)?/g, '')
    .replace(/(reais|real|paguei|gastei|comprei|recebi|custou|ganhei|valor|de|por|no|na|um|uma|o|a)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!description || description.length < 2) {
    description = text.trim();
  }

  return {
    value: value || 0,
    category,
    description: description.charAt(0).toUpperCase() + description.slice(1),
  };
}
