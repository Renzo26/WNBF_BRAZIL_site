import QRCode from 'qrcode'

/** Gera o QR Code (data URL PNG) com o conteúdo do ingresso. */
export function makeQrDataUrl(text) {
  return QRCode.toDataURL(text, {
    width: 512,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#07172e', light: '#ffffff' },
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Compõe um "ingresso" (PNG) com o QR + dados do pedido, pronto para download. */
export async function buildTicketPng({ eventDate, ticketName, buyerName, orderId, total, qrDataUrl }) {
  const W = 720
  const H = 1040
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // fundo navy
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#07172e')
  g.addColorStop(1, '#0a1f3c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // barra verde no topo
  ctx.fillStyle = '#86c63c'
  ctx.fillRect(0, 0, W, 12)

  ctx.textAlign = 'center'

  // cabeçalho
  ctx.fillStyle = '#eef3f9'
  ctx.font = '700 34px Arial, sans-serif'
  ctx.fillText('NATURAL FITNESS & HEALTH', W / 2, 92)
  ctx.fillText('BRASIL 2026', W / 2, 132)
  ctx.fillStyle = '#86c63c'
  ctx.font = '600 20px Arial, sans-serif'
  ctx.fillText(eventDate, W / 2, 172)

  // caixa branca do QR
  const qr = 380
  const qx = (W - qr) / 2
  const qy = 220
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, qx - 22, qy - 22, qr + 44, qr + 44, 26)
  ctx.fill()
  const img = await loadImage(qrDataUrl)
  ctx.drawImage(img, qx, qy, qr, qr)

  // dados do ingresso
  ctx.fillStyle = '#eef3f9'
  ctx.font = '700 32px Arial, sans-serif'
  ctx.fillText(ticketName, W / 2, 712)
  ctx.fillStyle = '#9bb1cd'
  ctx.font = '400 22px Arial, sans-serif'
  ctx.fillText(buyerName, W / 2, 752)
  ctx.fillText('Pedido ' + orderId, W / 2, 786)
  ctx.fillStyle = '#a8e35d'
  ctx.font = '700 28px Arial, sans-serif'
  ctx.fillText(total, W / 2, 834)

  // rodapé
  ctx.strokeStyle = 'rgba(134,198,60,0.35)'
  ctx.beginPath()
  ctx.moveTo(80, 900)
  ctx.lineTo(W - 80, 900)
  ctx.stroke()
  ctx.fillStyle = '#9bb1cd'
  ctx.font = '400 18px Arial, sans-serif'
  ctx.fillText('Apresente este QR Code na entrada do evento', W / 2, 950)
  ctx.fillStyle = '#56697f'
  ctx.font = '400 14px Arial, sans-serif'
  ctx.fillText('Ingresso simulado · WNBF Brasil', W / 2, 984)

  return canvas.toDataURL('image/png')
}
