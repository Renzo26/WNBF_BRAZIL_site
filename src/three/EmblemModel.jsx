import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const EMBLEM_URL = '/brand/emblem.svg'

/* ---------------------------------------------------------------------
   Constrói a geometria extrudada UMA vez a partir do SVG do emblema.
   - extrai shapes (com furos) de cada path/rect
   - extruda com profundidade sutil + bevel
   - mescla tudo em uma única geometria (1 draw call)
   - centraliza na origem e normaliza para ALTURA = 1 unidade
   O grupo de flip (scale Y = -1) corrige o eixo Y do SVG (y para baixo).
--------------------------------------------------------------------- */
function useEmblemGeometry() {
  const data = useLoader(SVGLoader, EMBLEM_URL)

  return useMemo(() => {
    const geoms = []
    const extrude = { depth: 18, bevelEnabled: true, bevelThickness: 4, bevelSize: 3, bevelSegments: 2, curveSegments: 6 }

    for (const path of data.paths) {
      const shapes = SVGLoader.createShapes(path)
      for (const shape of shapes) {
        geoms.push(new THREE.ExtrudeGeometry(shape, extrude))
      }
    }

    let merged = mergeGeometries(geoms, false)
    geoms.forEach((g) => g.dispose())

    // Centraliza + normaliza altura para 1 unidade
    merged.computeBoundingBox()
    const bb = merged.boundingBox
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    bb.getSize(size)
    bb.getCenter(center)
    const s = 1 / size.y

    merged.translate(-center.x, -center.y, -center.z)
    merged.scale(s, s, s)
    merged.computeVertexNormals()

    return merged
  }, [data])
}

/* ---------------------------------------------------------------------
   Malha do emblema. Recebe o material de fora (para animar opacidade).
   O grupo externo (transformações de scroll) é dono do componente pai.
--------------------------------------------------------------------- */
export default function EmblemModel({ material }) {
  const geometry = useEmblemGeometry()
  return (
    // scale Y negativo corrige o eixo do SVG; DoubleSide compensa o winding
    <group scale={[1, -1, 1]}>
      <mesh geometry={geometry} material={material} />
    </group>
  )
}
