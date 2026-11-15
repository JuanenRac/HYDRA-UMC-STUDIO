// =============================================================================
// HYDRA-UMC STUDIO - src/lib/ros2Security.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The requirement of ROS 2 security (SROS2) of the ROS 2 bridge. The bridge keeps it in its own configuration file
// (`security.require_sros2`, OFF by default, so a machine without a keystore keeps starting) and does not report it to the SERVER, so STUDIO can
// neither read nor change it: this module only prepares the lines to add to that file and the environment the bridge then checks at start.
// Nothing here is sent anywhere.

/** What the bridge checks in its environment when the requirement is on (ROS 2 itself reads these variables). */
export const SROS2_ENVIRONMENT: readonly string[] = [
  'ROS_SECURITY_ENABLE=true',
  'ROS_SECURITY_STRATEGY=Enforce',
  'ROS_SECURITY_KEYSTORE=<directory that holds "enclaves">',
];

export interface Sros2Preparation {
  /** The section to put in the configuration file of the bridge. */
  config: string;
  /** The environment the bridge refuses to start without. */
  environment: readonly string[];
}

/** The lines to add for the wanted value; `null` for the default (off), where there is nothing to add. */
export function sros2Preparation(required: boolean): Sros2Preparation | null {
  if (!required) return null;
  return { config: JSON.stringify({ security: { require_sros2: true } }, null, 2), environment: SROS2_ENVIRONMENT };
}
