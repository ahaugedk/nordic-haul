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

Original procedural music and UI effects start after the first pointer or keyboard interaction. Radio plays continuously in garage, contracts, races and results. UI effects, radio and motor audio have independent controls, with settings saved locally. N switches to the next station during a race; M pauses/resumes radio. Use the radio buttons for previous/next station and the slider for volume.

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

The racing skin uses locally hosted Barlow fonts, black and signal-yellow menus, a darker pit environment and a condensed italic game wordmark. The race HUD has start cues, live route progress and speed-dependent visual effects. Original procedural music plays in menus and races; UI, countdown and finish cues respect the separate UI sound toggle. Reduced-motion preferences disable decorative motion and camera speed effects.

## Autobahn, cargo and accelerated days

The racing carriageway has three lanes, shoulders, collidable guardrails and a separated opposing carriageway. Terrain, road, cameras and opponent vehicles share the same elevation profile. Buildings (including roof overhangs) and tree canopies must pass a clearance check against **both** carriageways before placement. Portal signs clear the trucks above the roadway.

Every map contract offers 8, 16 or 24 tonnes on the same destination and distance. Cargo adds 1,100 game kroner per tonne to the first-place payment; the normal placement payout and time bonus still apply. The selected weight and payment stay visible in the contract and race HUD. This is game economy, not a freight-rate estimate.

Driving uses the catalog's engine kW and estimated chassis mass plus a generic 6,500 kg empty trailer and payload, simplified power transfer, launch traction, rolling resistance, drag, gravity along the gradient and braking. Six collidable AI trucks use the same equations (600/700/780 hp and 8–24 t) and appear on the minimap. Seven trucks are shuffled into unique starting slots across two staggered outer columns, with 48 m between rows and a clear middle lane. The player can start in any of the four rows. All competitors race to the same finish line; grid offsets count toward race position but HUD route progress starts at zero. AI follows slower trucks with a speed-dependent gap, braking and a minimum 24 m tractor-reference separation, including when the player stops in its lane. Placement pays 100/80/65/55/45/35/25 percent of the contract reward before the existing time bonus. Tyres, suspension, detailed gears and trailer dynamics remain simplified. Rivals now tow original 13.6 m generic freight trailers with triple axles, rear doors, markers and tail lights. Separate kinematic collision bodies and articulated coupling poses follow curves and gradients. Existing Volvo tractor/cockpit geometry remains unchanged.

A full day lasts 40 real seconds: 1.5 days per minute of unpaused race simulation. This sky clock does not change route distances, physics, race duration or bonus deadlines. Sky, sun, ambient light, fog and reflections change with time. The sparse star field uses fixed spherical sky coordinates with independently randomized positions, sizes, brightness and subtle color variation, fading near the horizon and at dawn. Stars, automatic truck headlights, roadside lighting, tail lights and lit windows appear at night. Pause freezes both driving and the day clock.

## Sites deployment

Published as **Nordic Haul** at https://nordic-haul.ahaugedk.chatgpt.site.

The workspace root is the canonical GitHub development checkout. Its `.openai/hosting.json` identifies the existing Nordic Haul Site; use the Sites source-opening/publishing workflow from this directory for hosted changes. The earlier `sites/nordic-haul/` publication checkout is retained locally and ignored by Git to avoid a nested repository and duplicate assets. The first published version includes the Autobahn, cargo, day/night and rival semi-trailer updates. Credentials are not stored in the project.

## Game radio and UI audio

Three original synthesized stations: **HAUL FM** (110 BPM synthwave), **REDLINE** (144 BPM electro), and **NIGHT DRIVE** (92 BPM downtempo). There are no external radio streams or audio downloads. A lookahead scheduler uses the audio clock to keep music steady across render-frame changes. Channel changes stop the previous score's sustained notes, and resuming a hidden tab skips missed beats. Music fades to a slightly lower mixing level during driving, without stopping or resetting the station.

UI clicks, pointer hover, keyboard focus, scrolling, viewer gestures, touch driving buttons, radio/volume changes, pause/reset, countdown and finish have feedback. Effects follow the UI sound setting. Background and race music, motor audio and UI effects can be muted independently. Channel, radio volume and all three sound settings persist under `nordic-haul-audio-v1`. Autoplay remains subject to the browser's initial-user-gesture requirement; the radio shows a distinct “LYD TIL” button until unlocked. Every gesture retries a suspended audio context, even if a previous background resume is pending. Explicit play restores a saved zero radio volume to 55%, while automatic unlock preserves mute preferences. Music, UI and diesel audio levels are calibrated for laptop speakers; the UI follows audio-context state changes. Hidden tabs suspend audio; gameplay pause keeps the radio available.


The larger hill profile is shared by road, terrain, guardrails, truck camera and articulated rivals. Launch tractive force now scales with actual engine torque rather than total vehicle mass, so adding payload cannot add free launch force. At higher speed, engine kW limits traction; gravity, rolling resistance and drag determine the climb's sustained speed. The values are simplified gameplay estimates. A Rapier regression starting at 72 km/h on the steep climb verifies a meaningful speed drop at full throttle, a payload penalty and a 780 hp advantage. Downhill coasting gains speed. Tender bonus times are adjusted for the longer loop.

## Garage information and catalog audit

The `VOLVO-INFO` card beside the garage's hp/Nm/gear figures follows the last selected component. It covers engine operating ranges, the linked I-Shift, ASO-C crawler data, cab heights, axle layout, mirrors, lights, interior and paint, with an official Volvo link for each. On small screens it opens as a compact details panel. The catalog was rechecked on 8 October 2026; the audit and price-calibration documents record sources and unresolved full-order dependencies. Pricing labels in the UI are ordinary game prices excluding VAT. Existing wallet balances and owned configurations survive the recalibration.
