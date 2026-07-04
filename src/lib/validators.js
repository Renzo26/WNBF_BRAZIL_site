// ============================================================
// Validações do checkout (CPF/CNPJ, e-mail, telefone, cartão)
// ============================================================
import { onlyDigits } from './format'

export function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

export function isValidCPF(value = '') {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const calc = (len) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10])
}

export function isValidCNPJ(value = '') {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
  const calc = (len) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cnpj[i]) * weights[i]
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13])
}

/** Aceita CPF (11 dígitos) ou CNPJ (14 dígitos) válidos. */
export function isValidDoc(value = '') {
  const d = onlyDigits(value)
  if (d.length === 11) return isValidCPF(d)
  if (d.length === 14) return isValidCNPJ(d)
  return false
}

/** CEP: 8 dígitos. */
export function isValidCep(value = '') {
  return onlyDigits(value).length === 8
}

/** Celular com DDD: 10 ou 11 dígitos. */
export function isValidPhone(value = '') {
  const d = onlyDigits(value)
  return d.length === 10 || d.length === 11
}

/** Algoritmo de Luhn para o número do cartão. */
export function isValidCardNumber(value = '') {
  const d = onlyDigits(value)
  if (d.length < 13 || d.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i])
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

/** Validade MM/AA no futuro (ou mês corrente). */
export function isValidExpiry(value = '') {
  const d = onlyDigits(value)
  if (d.length !== 4) return false
  const month = Number(d.slice(0, 2))
  const year = 2000 + Number(d.slice(2, 4))
  if (month < 1 || month > 12) return false
  const now = new Date()
  const end = new Date(year, month, 0, 23, 59, 59) // último dia do mês
  return end >= now
}

export function isValidCvv(value = '') {
  const d = onlyDigits(value)
  return d.length === 3 || d.length === 4
}
