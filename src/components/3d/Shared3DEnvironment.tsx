import { useHydraStore } from '../../store';

export function Shared3DEnvironment() {
  const { settings } = useHydraStore();
  
  return (
    <>
      <color attach="background" args={[settings.theme.includes('Light') ? '#e2e8f0' : '#07090C']} />
      
      {/* Global Floor / Table Area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <gridHelper args={[5, 50, '#cbd5e1', '#cbd5e1']} position={[0, -0.005, 0]} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#00E5FF" />
    </>
  );
}
