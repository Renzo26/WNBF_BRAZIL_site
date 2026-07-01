/* =====================================================================
   Emblema 3D — configuração centralizada
   ---------------------------------------------------------------------
   O emblema fica parado sobre o #emblem-anchor (Hero). Sua posição/escala
   em unidades de mundo é calculada em runtime a partir da projeção
   tela→mundo do retângulo do anchor, considerando o aspect real da tela.
   ===================================================================== */

// Câmera (mantenha em sincronia com o <Canvas camera> em FloatingEmblem)
export const CAM_Z = 8
export const CAM_FOV = 40
export const WORLD_H = 2 * CAM_Z * Math.tan((CAM_FOV * Math.PI) / 180 / 2) // ≈ 5.8235

// Proporção largura/altura do desenho do emblema (folhas espalhadas)
export const EMBLEM_ASPECT = 1.36
