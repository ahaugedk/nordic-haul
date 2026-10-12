# Nordic Haul — Volvo truck simulator prototype

A local browser game in Danish: configure a reference-based FH16 Aero, choose a contract on the animated Europe map, race six computer-controlled trucks from the cab, earn a payment and continue from the destination city.

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

All city contracts use a compressed version of the same fictional, 3 km Autobahn loop with two 980 m straights, approximately 90 m of elevation difference and long climbs reaching 13%. The Europe map and persisted arrival city work, but actual intercity 3D road networks, a visible player trailer, live multiplayer and OEM adaptive high-beam behavior are not implemented. Automatic night headlights are implemented.

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

## Rival lane changes

After the initial launch clearance, rivals overtake slower traffic in an adjacent free lane and return right when there is room. Staggered decisions, cooldowns and reservations covering the full tractor/trailer envelope prevent nearby simultaneous merges and lane swaps. Front and rear clearance account for closing speeds, including the player and vehicles across the loop boundary; following/braking remains active during a manoeuvre.

Lane changes follow a smooth distance-based path over at least 48 metres (normally about 4.5 seconds). Tractor heading follows the lateral movement, while the trailer axle follows the earlier path rather than moving sideways with the tractor. Rendering and both collision bodies use the same poses; pausing freezes manoeuvres. The local-only `?lanePreview=1` fixture sets up a real AI overtake and freezes halfway through for browser QA. Production builds remove its setup and driving code.

## Logistics terminal finish

Each route ends at a destination-labelled logistics terminal: twelve numbered unloading doors with roller slats, dock seals, levellers, bumpers and safety bollards, marked staging bays, three parked freight trailers, a dispatch office, gatehouse and arrival gantry. The checker line is anchored to the existing physical finish, including the starting-grid offset, for every route length. The last 520 metres reveal the terminal; lap count, bonus times and finish rules are unchanged. Crossing its arrival line completes delivery; manual reversing and unloading are not a separate mission.

The warehouse remains level on a terraced apron. Local terrain is lowered beneath the yard without modifying either carriageway, and houses/roof overhangs/tree crowns are excluded from every supported terminal footprint. Shared facade materials batch small details for laptop/mobile performance. Yard lights, green dock indicators, office glazing and two floodlights follow the existing day/night cycle. A separate arrival camera shows the yard behind the result screen, and the existing driving camera returns for the next race. Vehicle geometry is unchanged.

Development-only `?terminalPreview=day`, `night` and `overview` fixtures exercise the real route endpoint and renderer for visual QA. Their setup is removed from production builds.

## Starting-budget balance

New careers receive DKK 1,200,000 including the first truck. The default DKK 1,168,000 setup leaves DKK 32,000: at most two of its four optional equipment add-ons. Keeping this reserve, one strong delivery can fund the 700 hp upgrade and two can fund 780 hp. Catalog prices and payouts are unchanged; cheaper chassis/cab choices remain valid ways to afford more engine or equipment. Unspent pre-purchase grants adopt the new balance on reload. Purchased trucks and established career balances remain intact.

## Overhead route signs

Five or six blue gantries appear roughly every 500–550 metres on the fictional Autobahn, with destination, terminal distance and a straight-ahead arrow. Gantries within 110 metres of the route's terminal gate are omitted. Their posts/foundations sit outside the shoulder and the board clears the road by 6.3 metres, including on bends and hills. Hardware is batched; each board has one reusable texture, initialized before garage readiness and repainted only when its reading changes.

Distances use the chosen contract’s approximate geographic road kilometres from the Europe map, scaled over the playable route from the player’s actual grid slot to the finish. A 360 km contract therefore shows hundreds of kilometres instead of the physical track’s few kilometres. Each gantry maps its remaining physical route fraction to that virtual distance, including remaining laps. Values above 10 km round to whole kilometres, then to 0.1 km closer to the destination and ten-metre precision below 1 km. The sky clock remains a separate accelerated visual cycle; race duration, speed, physics and bonus deadlines are unchanged. A just-passed reading stays unchanged for 65 metres to prevent the board jumping to the next lap while driving underneath. No negative distance is displayed. Boards remain readable at night and pause preserves their reading.

Local-only `?signPreview=day`, `night` or `lap` fixtures exercise the actual route state and board rendering. Choose a longer contract for the second-lap fixture. Production builds remove these setup branches.

## Roadworks and traffic reports

Every race generates two or three different worksites from resurfacing, barrier repair, urgent road repair and median repair. Single-lane and two-lane closures alternate which side is available. Locations vary inside the existing route, with no overlapping physical sites and room before the terminal. Route lengths, lap counts, reward economy and bonus deadlines are unchanged.

A cockpit traffic report warns up to 520 physical metres ahead, identifies closed lanes with a three-lane diagram and gives an advisory 40–60 km/h speed. Each event chimes once per race. Native Danish speech is used when the browser has a Danish voice; otherwise the chime and caption provide the same warning. Speech stops on mute, pause, finish and garage transitions; delayed audio callbacks cannot restart an old report. One master sound toggle still controls music, engine and notifications.

Cones, portable flashing arrow boards, barriers and road equipment follow the road's grade and curves. Their physical colliders activate with the convoy, and contacts use the existing speed-loss/impact feedback. Cone collision width matches the tapered body at bumper height rather than its wider low rubber base. Closed lanes leave at least one full lane open. Reset chooses an open lane when the centre is closed. Small meshes are batched by material, and mirrors include the dynamic worksites. Reduced-motion preferences keep warning lamps steady, and pausing freezes the event state and flashing.

Rivals anticipate closures, slow for the work area, create merging gaps and check crossed lanes before a double-lane move. Trailer paths and colliders follow each manoeuvre. Following-distance enforcement remains active; slow following reservations do not trap their leaders in a merge queue. A stopped truck can begin a required merge once a safe gap opens. Existing works remain obstacles for faster trucks lapping the field until the whole convoy has passed.

Local-only `?roadworkPreview=zone`, `night`, `double`, `night-double` and `merge` fixtures use real event geometry, contacts and the AI planner. The merging fixture freezes a genuine mid-manoeuvre frame for browser QA. These branches are removed from production builds. Tests cover event variation/placement, warnings, collisions, mute/pause/reset, all six rivals passing three sites and a complete player-driven route through three closures.


## Fuel economy

Contracts supply a route/load-dependent diesel allowance, shown before departure. The cockpit and HUD show litres remaining, current L/100 km (L/h at low speed), low-fuel warnings and the potential eco payment. Coasting downhill and keeping speed moderate preserve diesel. Expected range and remaining route kilometres appear together in the cockpit and HUD, using the trip average rather than instantaneous coasting consumption. Green confirms a buffer, amber warns of a small reserve, and red asks for economical driving when estimated range is below distance to delivery. Delivery pays an additional 50 game DKK per litre left; exhaustion stops the race, pays nothing and keeps the driver in the departure city. Retrying starts a new trip; R does not refill. Pausing/countdown consume no diesel.

All 48 city contracts now use documented road distances instead of a straight-line multiplier. Fuel use and route signs use the same compressed kilometres; route length and time-bonus targets are unchanged. See [fuel calibration and sources](docs/fuel-economy.md) and [road-distance provenance](docs/road-distance-sources.json). The amounts and consumption are calibrated game estimates, not Volvo D17 engine maps or truck-approved navigation.

Local-only `?fuelPreview=coast`, `climb`, `reserve`, `empty` and `finish` scenes exercise the actual cockpit displays, failure and payment paths. They are removed from production. Tests check real completed light/heavy drives, fuel-distance accounting, idle/coast/load/hill effects, pause/reset, failure and payment.


Closed-throttle rolling now uses extra damping calibrated for compressed racing time. From 90 km/h on a level road, the default truck reaches approximately 68 km/h with 8 t cargo or 72 km/h with 24 t after ten seconds without gas. This is game calibration, not an OEM tyre or engine-brake specification; powered acceleration is unchanged. Zero-injection coasting remains possible, and gravity still matters downhill. Both the player and rivals use the same calibration. Local-only `?fuelPreview=roll` exercises a real ten-second unpowered run; see [calibration and measurements](docs/fuel-economy.md).
