# Cosmic background textures

These local PNG textures were generated from the procedural WebGL scene created
for the ASTRA cosmic webpage. They are original generated artwork, with no
external image downloads or runtime network requests.

- `planet.png`: ray/sphere lighting, atmospheric rim, tilted rings and shadows.
- `nebula.png`: layered three-dimensional noise with a transparent edge mask.
- `sun.png`, `earth.png`, `moon.png`: locally generated educational artwork for
  the exploration screen. Colors, terrain and lighting are illustrative, not
  satellite imagery or a scientific map. Each texture is 512 × 512 pixels.

The application animates these textures with Reanimated opacity and transforms.
This gives the mobile background the webpage's depth without running its
ray-marching shader on Android. The planet texture does not provide an orbitable
3D camera. Rendering and animation stay separate from weather and outfit logic.
