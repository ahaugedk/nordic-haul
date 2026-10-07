# Volvo-katalog og kildekontrol

Kontrolleret i den danske [Truck Builder](https://www.volvotrucks.dk/da-dk/tools/truck-builder.html#/da-dk/configurator/fh16aero), 7. oktober 2026.

| Kategori | Observerede muligheder | Implementeret i garagen |
|---|---|---|
| Chassistype | Tractor / Rigid | Tractor |
| Aksler, trækker | 4×2, 6×2 pusher, 6×2 tag, 6×4, 8×4 pusher; Medium / High | 4×2 Medium og 6×4 High |
| Sideskirts i den viste 6×4-konfiguration | No sideskirt | Fast No sideskirt |
| Gearkasse | I-Shift / I-Shift Crawler Gears | Begge |
| Førerhuse | Lavt langt, langt, Globetrotter, XL, XXL | Alle fem |
| Spejle | Camera Monitor System / Mirrors | Begge |
| Udvendig finish | Waterfall | Fast finish |
| Forlygter | LED / LED med adaptivt fjernlys | Begge valg; adaptiv funktion er ikke simuleret |
| Interiør | FH16 / Black Edition | Begge |
| Stole i observeret Black Edition | Black Edition | Referencebaseret sædegeometri |
| Metallic lak, udvalgt verificeret delmængde | 2613 Indigo Black Metallic, 2101 Millennium Silver, 2503 Morello Storm, 2704 Steel Dawn | Disse fire koder og navne; farveværdier er tilnærmelser |

## Motor-konflikt i den offentlige builder

Den åbne FH16 Aero-konfigurator viste D13K560, D13K500 biodiesel, D13K460 biodiesel og D13K420. Det gentog sig efter at vælge Diesel → Volvo FH16 Aero → Byg din lastbil. Samtidig beskriver modelvælgeren selv FH16 Aero med D17-drivline.

Dette er i konflikt med Volvos [danske FH16 Aero-oversigt](https://www.volvotrucks.dk/content/dam/volvo-trucks/markets/denmark/info-sheets/Volvo-FH16aero-infosheet-da-dk-Global-HR.pdf) og [danske 6×4-datablad, 20. februar 2025](https://www.volvotrucks.dk/content/dam/volvo-trucks/markets/denmark/transport2025/volvo-fh16-aero-780-6x4/fh64t6a_dnk_dan.pdf).

Prototypens FH16-katalog bruger derfor D17A600 / D17A700 / D17A780 fra fabrikantens specifikationer. Det er et bevidst kildevalg, **ikke en påstand om fuld overensstemmelse med den fejlbehæftede motorliste i builderen**. Den samlede konfigurationsmatrix skal bekræftes af Volvo Danmark, før garagen kan kaldes en officiel eller fuldt valideret konfigurator.

I-Shift-varianter vælges konservativt efter momentkapacitet: ATO3112 til 3.000 Nm, ATO3512 til 3.400 Nm og ATO3812 til 3.800 Nm. Det er en teknisk kompatibilitetsregel fra specifikationerne, ikke en fuldstændig gengivelse af Volvos salgs- og godkendelsesregler. Fabrikantens dokumenter angiver, at mulige varianter og kombinationer kræver yderligere detaljer.

## 3D-model

Original Blender-model modelleret efter offentlig FH16 Aero-eksteriørreference samt brugerens konkrete cockpitpanorama fra Volvo Builder. Den er ikke Volvo CAD og kan ikke erstatte målfast fabrikantmateriale. Detaljer omfatter dobbelte baghjul, dæksider, hjulskærme, perforeret grill, optiske lygteelementer, cockpit, instrumenter, centerkonsol, rat, kopholdere, sæder, overhead-opbevaring og CMS-moduler.

3D-skærme drives af spillets hastighed, gear og rute. CMS viser kamerafeeds fra scenen. Køreegenskaberne er en forenklet racermodel med Rapier-kollisioner og faktiske motoreffektdata. Dæk-, bremse-, motor- og gearkurver er ikke OEM-valideret.

Lysmiljøer fra Poly Haven, CC0: [Studio Small 09](https://polyhaven.com/a/studio_small_09) af Sergej Majboroda og [Kloppenheim 06 Pure Sky](https://polyhaven.com/a/kloppenheim_06_puresky) af Greg Zaal / Jarod Guest. [Licens](https://polyhaven.com/license).
