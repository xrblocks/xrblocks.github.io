# Reticle Sample

This sample demonstrates how to use the built-in reticle and interact with the physical environment mapping (depth mesh) using WebXR controllers.

When a user points their controller and pulls the trigger (selects), a raycast is performed against the depth mesh. A text billboard appears at the intersection point, detailing the real-time distance and height relative to the world coordinate system.

## Key Features

- **Built-in Reticle**: Demonstrates enabling the reticle on the spatial depth mesh (`xb.showReticleOnDepthMesh(true)`).
- **Environment Interaction**: Uses `xb.core.user.select()` to determine the intersection between the controller's ray and the depth mesh.
- **Dynamic UI elements**: Spawns and dynamically updates a `TextBillboard` hovering at the physical intersection point, rotating to face the user.
