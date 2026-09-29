'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { DrumKit } from './DrumKit';
import { useDrumStore } from '@/store/drums';

/** 程序化室内环境：不依赖任何外部 HDRI 资源，离线可用 */
function StudioEnv() {
  return (
    <Environment resolution={256}>
      {/* 顶部大柔光 */}
      <Lightformer form="rect" intensity={4} position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 8, 1]} />
      {/* 两侧补光，让镀铬件有带状反射 */}
      <Lightformer form="rect" intensity={2} position={[-5, 2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[6, 3, 1]} />
      <Lightformer form="rect" intensity={2} position={[5, 2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 3, 1]} color="#cfe6ff" />
      <Lightformer form="rect" intensity={1.5} position={[0, 2, -5]} scale={[6, 3, 1]} color="#ffd9b0" />
      <Lightformer form="circle" intensity={2} position={[0, 1, 5]} scale={3} />
    </Environment>
  );
}

export function Scene() {
  const autoRotate = useDrumStore((s) => s.autoRotate);
  return (
    <Canvas
      shadows
      camera={{ position: [3.2, 2.2, 3.5], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      {/* 环境反射 + 灯光 + 阴影，全部本地生成 */}
      <StudioEnv />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      <spotLight position={[-4, 5, -2]} intensity={60} angle={0.5} penumbra={0.8} color="#7eb8ff" />

      {/* 架子鼓 */}
      <DrumKit />

      {/* 接触阴影，增强空间感 */}
      <ContactShadows position={[0, 0.02, 0]} opacity={0.6} scale={8} blur={2.4} far={2} />

      {/* 360° 旋转 + 缩放 */}
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={2.5}
        maxDistance={10}
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.02}
        target={[0, 0.9, 0]}
      />
    </Canvas>
  );
}
