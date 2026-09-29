'use client';

import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SoundId } from '@/lib/audio';
import { useDrumStore } from '@/store/drums';

interface DrumPieceProps {
  id: SoundId;
  position: [number, number, number];
  rotation?: [number, number, number];
  highlightSize?: [number, number, number];
  onClick?: () => void;
  children: React.ReactNode;
}

/** 通用可点击鼓件：被击时下沉动画 + 发光高亮 */
export function DrumPiece({
  id,
  position,
  rotation = [0, 0, 0],
  highlightSize = [1, 1, 1],
  onClick,
  children,
}: DrumPieceProps) {
  const group = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const hitTime = useDrumStore((s) => s.hits[id]);
  const hit = useDrumStore((s) => s.hit);

  useFrame(() => {
    const now = performance.now();
    const sinceHit = hitTime ? now - hitTime : Infinity;
    if (group.current) {
      // 被击 0→150ms 内下沉再弹回
      const dip = sinceHit < 150 ? Math.sin((sinceHit / 150) * Math.PI) * 0.1 : 0;
      group.current.position.y = position[1] - dip;
    }
    if (glow.current) {
      const m = glow.current.material as THREE.MeshBasicMaterial;
      const hitGlow = sinceHit < 400 ? 0.5 * (1 - sinceHit / 400) : 0;
      const target = Math.max(hitGlow, hovered ? 0.25 : 0);
      m.opacity += (target - m.opacity) * 0.25;
      glow.current.visible = m.opacity > 0.02;
    }
  });

  return (
    <group
      ref={group}
      position={position}
      rotation={rotation}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        hit(id);
        onClick?.();
      }}
    >
      {children}
      <mesh ref={glow} scale={highlightSize} visible={false} raycast={() => null}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
