// =============================================================================
// HYDRA-UMC STUDIO - React Component: GamepadController.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { useHydraStore } from '../store';

/**
 * Executes the  gamepad controller logic. 
 * This function handles the necessary computations and state updates.
 */
export function GamepadController() {
  const { settings, activeController, updateRobot } = useHydraStore();
  const requestRef = useRef<number>(0);
  const lastState = useRef<Record<string, boolean>>({});
  const selectedRobotIdRef = useRef<number>(1);
  const settingsRef = useRef(settings);
  const activeControllerRef = useRef(activeController);
  const updateRobotRef = useRef(updateRobot);

  useEffect(() => {
    settingsRef.current = settings;
    activeControllerRef.current = activeController;
    updateRobotRef.current = updateRobot;
  }, [settings, activeController, updateRobot]);

  useEffect(() => {
    if (!settings.gamepadEnabled) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const poll = () => {
      const gamepads = navigator.getGamepads();
      const gp = gamepads.find(g => g !== null);

      if (gp && settingsRef.current.gamepadMapping) {
        const mapping = settingsRef.current.gamepadMapping;
        const currentState: Record<string, boolean> = {};

        gp.buttons.forEach((b, i) => { currentState[`B${i}`] = b.pressed; });
        const DEADZONE = 0.2;
        gp.axes.forEach((val, i) => {
          currentState[`AXIS_${i}_NEG`] = val < -DEADZONE;
          currentState[`AXIS_${i}_POS`] = val > DEADZONE;
        });

        for (const [input, isPressed] of Object.entries(currentState)) {
          const action = mapping[input];
          if (!action) continue;

          const wasPressed = lastState.current[input] || false;
          const justPressed = isPressed && !wasPressed;

          if (isPressed) {
            const currentRobot = activeControllerRef.current.robots.find(r => r.id === selectedRobotIdRef.current);
            if (!currentRobot) continue;

            if (action.startsWith('J')) {
              // Action format: J1+, J1-
              const jointStr = action.substring(0, 2).toLowerCase(); // "j1"
              const isPos = action.endsWith('+');
              const step = isPos ? 1.5 : -1.5;
              const currentVal = (currentRobot.joints as any)[jointStr] || 0;
              
              updateRobotRef.current(currentRobot.id, {
                joints: {
                  ...currentRobot.joints,
                  [jointStr]: currentVal + step
                }
              });
            } else if (action.startsWith('T')) {
              // Action format: TX+, TY-
              const axisStr = action.substring(1, 2).toLowerCase(); // "x" or "y"
              const isPos = action.endsWith('+');
              const step = isPos ? 2 : -2;
              const currentPos = currentRobot.pos || { x: 0, y: 0, z: 0 };
              
              updateRobotRef.current(currentRobot.id, {
                pos: {
                  ...currentPos,
                  [axisStr]: ((currentPos as any)[axisStr] || 0) + step
                }
              });
            } else if (action.startsWith('SPEED')) {
              // SPEED+, SPEED-
              // Depends if we update playback speed or jog speed. Probably playback state speed.
              const isPos = action.endsWith('+');
              const pb = currentRobot.playbackState || { isPlaying: false, activeStep: -1, speed: 100 };
              const currentSpeed = pb.speed || 100;
              let newSpeed = isPos ? currentSpeed + 1 : currentSpeed - 1;
              if (newSpeed < 1) newSpeed = 1;
              if (newSpeed > 200) newSpeed = 200;
              updateRobotRef.current(currentRobot.id, {
                playbackState: { ...pb, speed: newSpeed }
              });
            }
          }

          if (justPressed) {
            const currentRobot = activeControllerRef.current.robots.find(r => r.id === selectedRobotIdRef.current);

            if (action.startsWith('select_robot_')) {
              const id = parseInt(action.replace('select_robot_', ''));
              selectedRobotIdRef.current = id;
            } else if (action === 'E-STOP') {
              if (currentRobot) {
                updateRobotRef.current(currentRobot.id, { online: false, playbackState: { isPlaying: false, activeStep: -1, speed: currentRobot.playbackState?.speed || 100 } });
              }
            } else if (action === 'E-STOP ALL') {
              activeControllerRef.current.robots.forEach(r => updateRobotRef.current(r.id, { online: false, playbackState: { isPlaying: false, activeStep: -1, speed: r.playbackState?.speed || 100 } }));
            } else if (action === 'START') {
               if (currentRobot) {
                 const pb = currentRobot.playbackState || { speed: 100 };
                 updateRobotRef.current(currentRobot.id, { playbackState: { isPlaying: true, activeStep: 0, speed: pb.speed || 100 } });
               }
            } else if (action === 'START ALL') {
               activeControllerRef.current.robots.forEach(r => {
                 const pb = r.playbackState || { speed: 100 };
                 updateRobotRef.current(r.id, { playbackState: { isPlaying: true, activeStep: 0, speed: pb.speed || 100 } });
               });
            } else if (action === 'STOP') {
               if (currentRobot) {
                 const pb = currentRobot.playbackState || { speed: 100 };
                 updateRobotRef.current(currentRobot.id, { playbackState: { isPlaying: false, activeStep: -1, speed: pb.speed || 100 } });
               }
            } else if (action === 'STOP ALL') {
               activeControllerRef.current.robots.forEach(r => {
                 const pb = r.playbackState || { speed: 100 };
                 updateRobotRef.current(r.id, { playbackState: { isPlaying: false, activeStep: -1, speed: pb.speed || 100 } });
               });
            } else if (action === 'ADD POINT') {
               if (currentRobot) {
                 const newPoint = {
                   id: Date.now().toString(),
                   name: `P${currentRobot.recordedPoints.length + 1}`,
                   x: currentRobot.pos.x,
                   y: currentRobot.pos.y,
                   z: currentRobot.pos.z,
                   a: currentRobot.pos.a,
                   b: currentRobot.pos.b,
                   c: currentRobot.pos.c,
                   j1: currentRobot.joints.j1,
                   j2: currentRobot.joints.j2,
                   j3: currentRobot.joints.j3,
                   j4: currentRobot.joints.j4,
                   j5: currentRobot.joints.j5,
                   j6: currentRobot.joints.j6,
                   speed: (currentRobot.playbackState?.speed || 100)
                 };
                 updateRobotRef.current(currentRobot.id, {
                   // @ts-ignore
                   recordedPoints: [...currentRobot.recordedPoints, newPoint]
                 });
               }
            }
          }
        }

        lastState.current = currentState;
      }

      requestRef.current = requestAnimationFrame(poll);
    };

    requestRef.current = requestAnimationFrame(poll);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [settings.gamepadEnabled]);

  return null;
}
