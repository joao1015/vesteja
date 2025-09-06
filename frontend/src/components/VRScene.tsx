"use client";

import { Canvas } from "@react-three/fiber";
import { XR, XRButton, createXRStore } from "@react-three/xr";
import { useTexture, OrbitControls } from "@react-three/drei";

interface VRSceneProps {
  imageUrl: string;
  onClose: () => void;
}

function ResultPanel({ imageUrl }: { imageUrl: string }) {
  const texture = useTexture(imageUrl);
  return (
    <mesh position={[0, 1.5, -1.5]}>
      <planeGeometry args={[1, 1.3]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

// ✅ Crie o store fora do componente (ou em um useMemo) para não recriar a cada render
const store = createXRStore();

export function VRScene({ imageUrl, onClose }: VRSceneProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={onClose}
          className="text-white bg-red-600 hover:bg-red-700 rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg"
        >
          X
        </button>
      </div>

      {/* ✅ Botão de entrada em AR usando XRButton (não depreciado) */}
      <XRButton
        store={store}
        mode="immersive-ar"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-white/90 text-black font-medium shadow"
      >
        Entrar em AR
      </XRButton>

      {/* ✅ Canvas 3D normal, passando o mesmo store ao XR */}
      <Canvas className="absolute inset-0">
        <XR store={store}>
          <ambientLight intensity={1.5} />
          {/* Em AR, OrbitControls geralmente não tem efeito; é útil fora do XR */}
          <OrbitControls />
          <ResultPanel imageUrl={imageUrl} />
        </XR>
      </Canvas>
    </div>
  );
}
