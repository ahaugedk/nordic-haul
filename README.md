# Nordic Haul — Volvo truck simulator prototype

A local browser game in Danish: configure a reference-based FH16 Aero, choose a contract on the animated Europe map, race two computer-controlled trucks from the cab, earn a payment and continue from the destination city.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173/. `npm test` exercises the career economy, persistent onward travel and a complete race using the actual Rapier WebAssembly world. `npm run build` checks TypeScript and builds the production app.

## Controls

W / Up: throttle; S / Down: brake; A/D or Left/Right: steering; R: return to the road; Escape: pause. Touch controls appear on small screens. Garage exterior: drag to orbit and scroll to zoom. The `Førerhus` button opens an interior inspection camera; drag to look around. `Vis konfiguration` reopens the options while inspecting the cockpit.

Sound is enabled by default on every page load. One `Lyd til/fra` button controls the supplied race song, motor and UI effects together; M is the same master toggle during driving. The song begins from the start when a race is launched (including its countdown), pauses with the race, resumes at the same position and stops on finish/return to garage. Garage, contracts and results have no background music.

## Rendering and models

Babylon.js selects WebGPU when available, with WebGL fallback if initialization fails. Rapier runs in WebAssembly. The main simulation uses a fixed 60 Hz step. Original Blender geometry is delivered as GLB. Static geometry is consolidated by material, configurable modules stay separate, and the renderer adapts resolution when sustained frame rates are low.

The current editable Blender source is `blender/fh16-aero-study.blend`. Export from Blender as **glTF Binary (.glb)** to `public/models/fh16-aero.glb`, with **Include → Visible Objects** enabled. The current scene contains the active geometry only; previous source versions are preserved in `blender/archive/`. Keep material names and the `cab_roof_`, `rear_axle_module`, `steering_assembly`, `mirror_`, `cms_`, `cockpit_temperature_lcd`, and screen prefixes: the game uses these for configuration and animation.

The October 2026 fidelity pass rebuilds the curved cab, windows, grille, optical lights, wheel rims, rear bulkhead, chassis equipment and cockpit controls from the four references in `docs/reference/`. The Blender source includes final manual emblem corrections. `scripts/refine-truck.mjs` reproduces the intermediate geometry as `blender/fh16-aero-generated.glb`; it does not replace the final Blender source or shipping model. The older Python scripts reproduce the previous study only. Pre-refinement sources are preserved in `blender/archive/`.

The cockpit alignment pass follows `docs/reference/volvo-cockpit-wide.png`. The wheel and column share a datum; the instrument display sits behind a shallow hood; the centre stack, door cards and windshield liners meet on shared surfaces. `scripts/align-cockpit.mjs` rebuilds this pass from `blender/archive/fh16-aero-before-cockpit-alignment.glb`, preserving the exterior. Import its GLB into a clean Blender scene before saving subsequent source updates. The original detailed panorama is retained in `docs/reference/volvo-cockpit.png`. The instrument and navigation screens are rendered in 3D and updated by the game. The climate LCD is a separate screen. The inspection camera adapts its field of view to panel width; the driving camera remains at the driver seat. CMS uses two low-resolution camera feeds refreshed periodically to control cost.

## Data and scope

- [Volvo option/source audit](docs/volvo-sources.md)
- [Price estimates and uncertainty](docs/prices.md)
- [Europe geography and travel rules](docs/map-data.md)

This is a reference-based development prototype, not Volvo CAD or an OEM-validated configurator. The public FH16 Aero builder displayed a conflicting D13 engine list; the prototype uses Volvo's official D17 specifications. Supported garage options are a verified subset. Paint RGB, some dimensions and driving curves remain approximate. Prices are estimates excluding VAT, not dealer quotations.

All city contracts use a compressed version of the same fictional, 3 km Autobahn loop with two 980 m straights, approximately 75 m of elevation difference and long climbs reaching 11%. The Europe map and persisted arrival city work, but actual intercity 3D road networks, a visible player trailer, live multiplayer and OEM adaptive high-beam behavior are not implemented. Automatic night headlights are implemented.

Lighting assets: Poly Haven Studio Small 09 and Kloppenheim 06 Pure Sky, CC0. Map geometry: Natural Earth, public domain. Music and model geometry are original.

## Arcade visual direction

The racing skin uses locally hosted Barlow fonts, black and signal-yellow menus, a darker pit environment and a condensed italic game wordmark. The race HUD has start cues, live route progress and speed-dependent visual effects. The supplied Nordic Haul song plays during races; UI, motor, countdown and finish audio follow the one master sound toggle. Reduced-motion preferences disable decorative motion and camera speed effects.

## Autobahn, cargo and accelerated days

The racing carriageway has three lanes, shoulders, collidable guardrails and a separated opposing carriageway. Terrain, road, cameras and opponent vehicles share the same elevation profile. Buildings (including roof overhangs) and tree canopies must pass a clearance check against **both** carriageways before placement. Portal signs clear the trucks above the roadway.

Every map contract offers 8, 16 or 24 tonnes on the same destination and distance. Cargo adds 1,100 game kroner per tonne to the first-place payment; the normal placement payout and time bonus still apply. The selected weight and payment stay visible in the contract and race HUD. This is game economy, not a freight-rate estimate.

Driving uses the catalog's engine kW and estimated chassis mass plus a generic 6,500 kg empty trailer and payload, simplified power transfer, launch traction, rolling resistance, drag, gravity along the gradient and braking. Six collidable AI trucks use the same equations (600/700/780 hp and 8–24 t) and appear on the minimap. Seven trucks are shuffled into unique starting slots across two staggered outer columns, with 48 m between rows and a clear middle lane. The player can start in any of the four rows. All competitors race to the same finish line; grid offsets count toward race position but HUD route progress starts at zero. AI follows slower trucks with a speed-dependent gap, braking and a minimum 24 m tractor-reference separation, including when the player stops in its lane. Placement pays 100/80/65/55/45/35/25 percent of the contract reward before the existing time bonus. Tyres, suspension, detailed gears and trailer dynamics remain simplified. Rivals now tow original 13.6 m generic freight trailers with triple axles, rear doors, markers and tail lights. Separate kinematic collision bodies and articulated coupling poses follow curves and gradients. Existing Volvo tractor/cockpit geometry remains unchanged.

A full day lasts 40 real seconds: 1.5 days per minute of unpaused race simulation. This sky clock does not change route distances, physics, race duration or bonus deadlines. Sky, sun, ambient light, fog and reflections change with time. The sparse star field uses fixed spherical sky coordinates with independently randomized positions, sizes, brightness and subtle color variation, fading near the horizon and at dawn. Stars, automatic truck headlights, roadside lighting, tail lights and lit windows appear at night. Pause freezes both driving and the day clock.

## Sites deployment

Published as **Nordic Haul** at https://nordic-haul.ahaugedk.chatgpt.site.

The workspace root is the canonical GitHub development checkout. Its `.openai/hosting.json` identifies the existing Nordic Haul Site; use the Sites source-opening/publishing workflow from this directory for hosted changes. The earlier `sites/nordic-haul/` publication checkout is retained locally and ignored by Git to avoid a nested repository and duplicate assets. The first published version includes the Autobahn, cargo, day/night and rival semi-trailer updates. Credentials are not stored in the project.

## Race music and master sound

The owner supplied `Nordic Haul.m4a` and authorized its use. The original AAC file is preserved at the project root. `public/audio/nordic-haul.mp3` (128 kb/s MP3) and `public/audio/nordic-haul.ogg` (Vorbis quality 5) are browser playback alternatives, approximately 5:04 long. Both conversions preserve the full song and were decoded to completion for validation. There are no external streams or synthesized radio stations.

The hidden HTML audio element preloads without playing in menus. Its `play()` call happens synchronously in the race-start/resume gesture, before asynchronous context work, for Safari's playback policy. Music loops for longer races. Muting all audio leaves the song timeline running silently; pausing the game freezes it, and a new race restarts from zero. Stop/late-promise guards prevent an old playback attempt from reviving music in the garage. UI effects use a shared AudioContext with the engine, and master mute gates both. Old independent radio settings are ignored; sound defaults on and the session toggle stays consistent between all screens. N/channel and volume controls have been removed.

The larger hill profile is shared by road, terrain, guardrails, truck camera and articulated rivals. Launch tractive force now scales with actual engine torque rather than total vehicle mass, so adding payload cannot add free launch force. At higher speed, engine kW limits traction; gravity, rolling resistance and drag determine the climb's sustained speed. The values are simplified gameplay estimates. A Rapier regression starting at 72 km/h on the steep climb verifies a meaningful speed drop at full throttle, a payload penalty and a 780 hp advantage. Downhill coasting gains speed. Tender bonus times are adjusted for the longer loop.

## Garage information and catalog audit

The `VOLVO-INFO` card beside the garage's hp/Nm/gear figures follows the last selected component. It covers engine operating ranges, the linked I-Shift, ASO-C crawler data, cab heights, axle layout, mirrors, lights, interior and paint, with an official Volvo link for each. On small screens it opens as a compact details panel. The catalog was rechecked on 8 October 2026; the audit and price-calibration documents record sources and unresolved full-order dependencies. Pricing labels in the UI are ordinary game prices excluding VAT. Existing wallet balances and owned configurations survive the recalibration.

## Mobile layout

Phone styles are isolated in `src/mobile.css` at widths below 800 px, plus coarse-pointer phones in short landscape viewports. Desktop component positions are unchanged. The garage has a measured 3D preview area above a fixed configuration panel; options and Volvo information scroll inside it while budget and purchase stay visible. Routes use a compact map and horizontally swipeable cards, with payload and reward available on the same screen. Racing separates telemetry and four thumb controls, with a wider portrait view and safe-area spacing. Landscape uses a side-by-side garage and separate control clusters. Interior preview can hide the configuration panel for more viewing space.

The iOS garage uses WebGL instead of WebGPU. Its canvas is resized to the measured preview area and both cameras render into a full viewport; no normalized offsets depend on Safari's layout viewport or device pixel ratio. A stage ResizeObserver follows toolbar/orientation changes and the canvas returns to full screen for racing. The mobile header contains one master audio button; component choices use compact rows and the purchase summary remains visible. Browser QA covers an iPhone user agent, 375×667 CSS viewport and DPR 3, plus changing viewport height; this is emulation, not a physical iPhone/WebKit validation.

Mobile garage telemetry is hidden. The confirmation button and budget summary share two equal-width columns in the fixed bottom row; desktop keeps its original stacked bill and full-width button. Choice rows are compact, with a live choice count, scroll-direction hint and bottom fade. The hint distinguishes more choices from manufacturer information, and selection preserves the list's scroll offset while category changes return to the top.

## Collision feedback

Real Rapier solver contacts with guardrails, rival tractors and their articulated trailers produce contact-point sparks and a short metal impact cue. Collision severity uses relative velocity at the contact point, including trailer rotation. A fresh strike removes speed; continued scraping applies drag, and overlapping rail segments share a cooldown so their seams cannot multiply the penalty. Penalties use the strongest simultaneous contact, cannot add speed, and cannot drive speed below zero. Burst IDs are retained briefly so a slow render frame still receives them once. Four reusable particle systems cap visual cost; sparks inherit forward momentum, fall under gravity and expire quickly. Pausing freezes them, and reset/garage transitions clear feedback. Camera recoil respects reduced-motion preferences and impact sounds follow master mute.

Development-only `?impactPreview=guardrail`, `truck` or `trailer` browser fixtures use the actual simulation and effect renderer, then freeze a contact frame for visual QA. Vite production builds remove the fixture branches and setup code.
