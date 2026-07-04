// ============================================================
// Máscaras e formatação de valores para o checkout
// ============================================================

/** Mantém apenas dígitos de uma string. */
export const onlyDigits = (v = '') => v.replace(/\D/g, '')

/** Formata CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) conforme o tamanho. */
export function formatDoc(value = '') {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 11) {
    // CPF
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }
  // CNPJ
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/** Formata celular brasileiro: (00) 00000-0000. */
export function formatPhone(value = '') {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

/** Agrupa o número do cartão em blocos de 4: 0000 0000 0000 0000. */
export function formatCard(value = '') {
  return onlyDigits(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim()
}

/** CEP: 00000-000. */
export function formatCep(value = '') {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2')
}

/** Validade do cartão MM/AA. */
export function formatExpiry(value = '') {
  const d = onlyDigits(value).slice(0, 4)
  if (d.length < 3) return d
  return d.replace(/^(\d{2})(\d)/, '$1/$2')
}

/** Converte número para moeda BRL. */
export function brl(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
