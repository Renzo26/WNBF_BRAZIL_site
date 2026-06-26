/* =====================================================================
   Trajetória do emblema 3D — configuração centralizada
   ---------------------------------------------------------------------
   Posições em COORDENADAS NORMALIZADAS de viewport:
     nx / ny  ∈ [-1, 1]   (-1 = borda esquerda/baixo · +1 = borda direita/topo)
   São convertidas para unidades de mundo em runtime, considerando o
   aspect real da tela e o tamanho do objeto → nunca sai da viewport,
   funciona em qualquer largura (desktop, notebook, mobile).

   O estado do Hero (#top) é marcado com `anchor: true` e calculado a
   partir do #emblem-anchor (projeção tela→mundo), nascendo EXATAMENTE
   sobre o emblema original.

   Campos: { id, anchor?, nx, ny, z, scale, rx, ry, rz, opacity }
   ===================================================================== */

// Câmera (mantenha em sincronia com o <Canvas camera> em FloatingEmblem)
export const CAM_Z = 8
export const CAM_FOV = 40
export const WORLD_H = 2 * CAM_Z * Math.tan((CAM_FOV * Math.PI) / 180 / 2) // ≈ 5.8235

// Proporção largura/altura do desenho do emblema (folhas espalhadas)
export const EMBLEM_ASPECT = 1.36

export const DESKTOP = [
  // Hero — calculado pelo #emblem-anchor (centralizado acima de "NATURAL")
  { id: '#top', anchor: true, nx: 0, ny: 0.55, z: 0, scale: 1, rx: 0, ry: 0, rz: 0, opacity: 1 },

  // O Evento — lateral direita, terço superior
  { id: '#evento', nx: 0.82, ny: 0.6, z: -0.6, scale: 0.5, rx: 0.08, ry: 0.5, rz: -0.05, opacity: 0.85 },

  // 100% Natural — lateral esquerda, abaixo do título
  { id: '#natural', nx: -0.82, ny: -0.3, z: -0.4, scale: 0.56, rx: 0.05, ry: -0.55, rz: 0.05, opacity: 0.9 },

  // Categorias — grande, ao fundo, baixa opacidade (atrás dos cards)
  { id: '#categorias', nx: 0, ny: 0, z: -3.4, scale: 1.5, rx: 0, ry: 0.35, rz: 0, opacity: 0.2 },

  // Ingressos — canto superior direito
  { id: '#ingressos', nx: 0.82, ny: 0.7, z: -0.5, scale: 0.46, rx: 0.06, ry: 0.5, rz: -0.04, opacity: 0.82 },

  // CTA final — centralizado acima do título/CTA
  { id: '#final', nx: 0, ny: 0.78, z: -0.3, scale: 0.6, rx: 0.05, ry: 0, rz: 0, opacity: 0.9 },
]

// Mobile — mesmas posições normalizadas (adaptam ao aspect estreito),
// porém escalas menores e rotações mais suaves.
export const MOBILE = [
  { id: '#top', anchor: true, nx: 0, ny: 0.55, z: 0, scale: 1, rx: 0, ry: 0, rz: 0, opacity: 1 },
  { id: '#evento', nx: 0.7, ny: 0.72, z: -0.5, scale: 0.34, rx: 0.05, ry: 0.35, rz: 0, opacity: 0.82 },
  { id: '#natural', nx: -0.72, ny: -0.2, z: -0.4, scale: 0.36, rx: 0.04, ry: -0.4, rz: 0, opacity: 0.88 },
  { id: '#categorias', nx: 0, ny: 0, z: -3.4, scale: 1.15, rx: 0, ry: 0.25, rz: 0, opacity: 0.16 },
  { id: '#ingressos', nx: 0.7, ny: 0.75, z: -0.4, scale: 0.32, rx: 0.04, ry: 0.35, rz: 0, opacity: 0.8 },
  { id: '#final', nx: 0, ny: 0.7, z: -0.3, scale: 0.42, rx: 0.04, ry: 0, rz: 0, opacity: 0.88 },
]
