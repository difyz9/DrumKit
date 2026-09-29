'use client';

import * as THREE from 'three';
import { DrumPiece } from './DrumPiece';
import { playSound, type SoundId } from '@/lib/audio';

const chrome = { color: '#d8d8e0', metalness: 1, roughness: 0.15 };
const redShell = { color: '#c62828', metalness: 0.3, roughness: 0.35 };
const headMat = { color: '#f5f5f0', metalness: 0, roughness: 0.6 };
const cymbalMat = { color: '#c8a832', metalness: 0.95, roughness: 0.3 };

/** 一只桶鼓 */
function Barrel({ radius, depth, shell = redShell }: { radius: number; depth: number; shell?: any }) {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, depth, 32, 1, true]} />
        <meshStandardMaterial {...shell} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, depth / 2, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.98, radius * 0.98, 0.02, 32]} />
        <meshStandardMaterial {...headMat} />
      </mesh>
      <mesh position={[0, -depth / 2, 0]}>
        <cylinderGeometry args={[radius * 0.98, radius * 0.98, 0.02, 32]} />
        <meshStandardMaterial {...headMat} />
      </mesh>
      <mesh position={[0, depth / 2 + 0.01, 0]}>
        <torusGeometry args={[radius, 0.025, 12, 40]} />
        <meshStandardMaterial {...chrome} />
      </mesh>
      <mesh position={[0, -depth / 2 - 0.01, 0]} rotation={[Math.PI, 0, 0]}>
        <torusGeometry args={[radius, 0.025, 12, 40]} />
        <meshStandardMaterial {...chrome} />
      </mesh>
    </group>
  );
}

/** 三脚支架 */
function Stand({ height = 1.1, tilt = 0 }: { height?: number; tilt?: number }) {
  return (
    <group>
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * 0.18, height / 2, Math.sin(a) * 0.18]}
          rotation={[Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35]}
          castShadow
        >
          <cylinderGeometry args={[0.018, 0.018, height, 8]} />
          <meshStandardMaterial {...chrome} />
        </mesh>
      ))}
      <mesh position={[0, height / 2 + 0.2, 0]} rotation={[tilt, 0, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
        <meshStandardMaterial {...chrome} />
      </mesh>
    </group>
  );
}

/** 镲片 */
function Cymbal({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2 + 0.18, 0, 0]} castShadow>
      <cylinderGeometry args={[0.02, radius, 0.04, 40]} />
      <meshStandardMaterial {...cymbalMat} />
    </mesh>
  );
}

function Drum({ id, ...rest }: { id: SoundId } & Parameters<typeof DrumPiece>[0]) {
  return (
    <DrumPiece
      id={id}
      {...rest}
      onClick={() => playSound(id)}
    />
  );
}

export function DrumKit() {
  return (
    <group>
      {/* Kick 底鼓 */}
      <Drum id="kick" position={[0, 0.55, 1.1]} rotation={[0, 0, Math.PI / 2]} highlightSize={[1.2, 1.2, 1.2]}>
        <Barrel radius={0.56} depth={1.0} />
        <mesh position={[0, 0.51, 0]}>
          <torusGeometry args={[0.5, 0.03, 12, 48]} />
          <meshStandardMaterial {...chrome} />
        </mesh>
      </Drum>

      {/* Snare 军鼓 */}
      <Drum id="snare" position={[-0.75, 0.72, 0.6]} highlightSize={[0.7, 0.6, 0.7]}>
        <Barrel radius={0.35} depth={0.3} shell={{ color: '#e0e0e8', metalness: 0.8, roughness: 0.3 }} />
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.5, 8]} />
          <meshStandardMaterial {...chrome} />
        </mesh>
      </Drum>

      {/* Tom1 / Tom2 挂鼓 */}
      <Drum id="tom1" position={[-0.35, 1.35, 0.55]} rotation={[0.35, 0, 0.2]} highlightSize={[0.65, 0.65, 0.65]}>
        <Barrel radius={0.28} depth={0.35} />
      </Drum>
      <Drum id="tom2" position={[0.35, 1.35, 0.55]} rotation={[0.35, 0, -0.2]} highlightSize={[0.65, 0.65, 0.65]}>
        <Barrel radius={0.3} depth={0.4} />
      </Drum>

      {/* Tom3 / Tom4（落地） */}
      <Drum id="tom3" position={[1.15, 0.85, 0.75]} highlightSize={[0.8, 1.05, 0.8]}>
        <Barrel radius={0.35} depth={0.6} />
        {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * 0.33, -0.5, Math.sin(a) * 0.33]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
            <meshStandardMaterial {...chrome} />
          </mesh>
        ))}
      </Drum>
      <Drum id="tom4" position={[0.85, 0.75, 0.1]} highlightSize={[0.85, 1.1, 0.85]}>
        <Barrel radius={0.4} depth={0.7} />
        {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * 0.38, -0.55, Math.sin(a) * 0.38]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
            <meshStandardMaterial {...chrome} />
          </mesh>
        ))}
      </Drum>

      {/* Hi-Hat（点击 = 闭镲；键盘 J/K 分别闭镲/开镲，共用同一副 3D 镲） */}
      <Drum id="hihatClosed" position={[-1.15, 1.15, 0.35]} highlightSize={[0.65, 0.4, 0.65]}>
        <Cymbal radius={0.3} />
        <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2 - 0.18, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.3, 0.04, 40]} />
          <meshStandardMaterial {...cymbalMat} />
        </mesh>
      </Drum>
      <group position={[-1.15, 0, 0.35]}>
        <Stand height={1.1} tilt={0.18} />
      </group>

      {/* Crash */}
      <Drum id="crash" position={[-0.8, 1.75, -0.3]} rotation={[0.25, 0, 0]} highlightSize={[1.1, 0.5, 1.1]}>
        <Cymbal radius={0.5} />
      </Drum>
      <group position={[-0.8, 0, -0.3]}>
        <Stand height={1.7} />
      </group>

      {/* Ride */}
      <Drum id="ride" position={[0.9, 1.8, -0.5]} rotation={[-0.2, 0, 0]} highlightSize={[1.2, 0.5, 1.2]}>
        <Cymbal radius={0.55} />
      </Drum>
      <group position={[0.9, 0, -0.5]}>
        <Stand height={1.75} />
      </group>

      {/* 地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial color="#16161c" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}
