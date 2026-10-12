# Brændstoføkonomi

Kontrolleret 12. oktober 2026. Dieseltal i spillet er kalibrerede modeltal, ikke en offentliggjort forbrugskurve for D17. Racet er komprimeret og har mere ekstreme bakker og fart end almindelig langturskørsel. Rigtige byruters højdeforløb er ikke modelleret.

## Offentlige referencepunkter

- Volvo Truck Corporations [Emissions from Volvo’s trucks, tabel 3](https://www.volvotrucks.com/content/dam/volvo-trucks/markets/global/our-values/environmental-care/our-trucks/Emis_eng_10110_14001.pdf): vejledende langtursforbrug for trækker/sættevogn, 21–26 L/100 km tom og 29–35 L/100 km ved 40 ton totalvægt. Ældre, generel reference; ikke specifik for FH16 Aero. Dokumentet understreger betydningen af vej, trafik og kørestil.
- [Volvos offentliggjorte FH Aero 500 I-Save-test, 2025](https://www.volvotrucks.com/content/dam/volvo-trucks/markets/global/news-stories/fh-aero-test-results/final_SD_eng_TR_01_2025_Volvo_mAnz_WZ.pdf): 23,49 L/100 km på 342,8 km ved cirka 80 km/t og 32 ton. Denne lastbil har D13, ikke D17; resultatet bruges som størrelsesorden for økonomisk moderne langturskørsel, ikke som et FH16-produktløfte.
- [FH16-specifikationer](https://www.volvotrucks.de/de-de/trucks/models/volvo-fh16/specifications.html): tankstørrelser varierer med chassis; op til 1.510 L samlet på 4×2. Spillet konfigurerer ikke tankkapacitet. De 120–850 L udleveret til spillets kontrakter er startindhold til turen, ikke en påstået fabriksspecificeret tankstørrelse.
- [OSRM Route API](https://project-osrm.org/docs/v5.24.0/api/#route-service): vejafstand i meter. Alle 48 kontrakter/30 unikke bypar har konkrete opslag i [road-distance-sources.json](road-distance-sources.json). Brug for biler, ikke lastbilgodkendte ruter; afrundede, symmetriske afstande mellem repræsentative bypunkter. Eksempel: Aarhus–København via Odense/Storebælt 307,5 km → 310 km. Stockholm–Warszawa er landtransport via Danmark og Tyskland, ikke fugleflugt over Østersøen.

## Den implementerede model

Startdiesel: vejkilometer × (0,36 + lastton × 0,0025) + 10 L, rundet op til 5 L. Det giver 140 L til 340 km Aarhus–Hamburg med 8 t last og 155 L med 24 t. Brændstofbeholdningen vises før start. Det er en opgavebestemt allokering; reserve skal kunne være tilbage, og fart-/kørestilsvalg skal have konsekvenser.

Forbrug med gas tager hensyn til estimeret transportmasse (trækker, 6,5 t tom sættevogn og last), positiv stigning, kvadratisk fartafhængig luftmodstand, motorvalg og kameraer. Gas på nedkørsler samt gas og bremse samtidig koster ekstra. Koefficienterne kalibrerer spillets binære fuld-gas/slip-gas-styring og komprimerede terræn; de er ikke OEM-målinger for de enkelte tilvalg. Øjeblikstal er derfor acceleratorbelastning, ikke et løfte om konstant cruise-forbrug. Rullekørsel uden gas bruger 0 L/100 km via motorens brændstofafbrydelse; under 8 km/t vises L/t med 2 L/t ved tomgang og højere forbrug ved gas.

Forbrugt diesel = faktisk tilbagelagt vejafstand × kontraktens kilometermål / faktisk længde fra startplads til mål × L/100 km. Tomgang bruger tilsvarende komprimeret køretid; den accelererede dag/nat-himmel styrer ikke brændstof. Gennemsnittet inkluderer tomgangsforbrug. Baglæns kørsel og omveje forbruger også diesel, selv om de ikke giver fremskridt. R flytter trucken tilbage på vejen uden at ændre diesel. Startnedtælling, pause og resultatskærm forbruger intet. Målerens bjælke viser andelen af turens startdiesel, ikke en antaget tankkapacitet.

Deterministiske prøveløb i den rigtige Rapier-simulation med 600 hk, standardkonfiguration og Aarhus–Hamburg, uden vejarbejde:

| Kørestil | Last | Gennemsnit | Diesel ved levering | Tid |
|---|---:|---:|---:|---:|
| Moderat fart, slip gas nedad | 8 t | 22,6 L/100 km | 63,1 L | 2:22 |
| Moderat fart, slip gas nedad | 24 t | 34,5 L/100 km | 37,7 L | 2:55 |

Konstant fuld gas på racerbanens stejle bakker giver betydeligt højere forbrug og kan tømme turens diesel før mål. Tallet varierer med startplads, hændelser, fart, truck og manøvrer. Disse prøvetal afgrænser kalibreringen; alle virkelige ruter har ikke dette forbrug.

## Afregning og nederlag

Ved levering giver hver faktisk liter tilbage 50 spilkr. i økobonus oven i placering og tidsbonus; samlet beløb rundes ned til hele kroner. Det er incitament/balance i spillet, ikke dieselens pumpepris eller almindelig chaufførløn. Ingen dobbelt afregning: hovedløkken forlader racet ved første afslutning.

Ved 15 % af startdieselen vises advarsel, ved 6 % kritisk farve. Tom diesel afslutter straks løbet, også ved målgrænsen. Ingen betaling, økobonus eller destinationsflytning. Karrieren tæller et forsøg, og spilleren kan prøve samme rute igen eller konfigurere trucken. Nyt forsøg er en ny transportopgave med ny allokering.

## Verifikation

Automatiske tests kontrollerer vejafstandsdækning, planens størrelsesorden, korrekt liter/km-afregning, gas/slip-gas/tomgang, last/stigninger/fart, pause/nedtælling, R uden opfyldning, stop ved tom tank, nulbetaling og bonus ved levering. Eksisterende kørsels- og vejarbejdstests kræver nu både målpassage og brændstof tilbage, så et brændstofnederlag ikke kan blive godkendt som gennemført løb. Browser-QA kontrollerer cockpit, kontraktvalg, reserveadvarsel, nederlag, afregning og telefonlayout; mobiltesten er Chromium-emulering, ikke en fysisk Safari/iPhone-test.

## Rækkevidde og afstand til mål

Cockpitskærmen og HUD'en viser forventet rækkevidde ved siden af de resterende vejkilometer. Afstand til mål bruger samme skala og validerede fremskridt som vejskiltene, også fra en tilfældig startplads, på længere løb og ved baglæns kørsel. Den falder ikke ved at køre en genvej uden for vejen.

Rækkevidde = liter tilbage × 100 / forventet L/100 km. Det forventede forbrug er hele turens distancevægtede gennemsnit, inklusive tomgang, med de første 20 km vægtet mod startplanens 36 + 0,25 × lastton L/100 km. Der er en nedre grænse på 18 L/100 km for prognosen: et øjebliks 0-forbrug på nedkørslen giver aldrig uendelig rækkevidde. Prognosen tilpasser sig kørestilen; den forudsiger ikke fremtidige højdeforløb eller trafik. Startprisen, dieselallokeringen, bonus, faktiske forbrug og løbslængde er uændrede.

Grøn betyder, at den beregnede rækkevidde har en buffer til mål. Gul betyder, at bufferen er mindre end 5 km eller 5 % af afstanden til mål (det største af de to). Rød betyder kortere rækkevidde end afstand til mål og viser “KØR MERE ØKONOMISK” med råd om at sænke farten og slippe gas nedad. Første røde advarsel giver én lyd pr. løb gennem den eksisterende masterlydknap. Den kombineres med en samtidig reserveadvarsel, så lydene ikke stables. Pause, nedtælling og afsluttede løb udsender ingen nye brændstofsignaler.

Rækkevidde rundes ned, afstand til mål op; under 10 km vises en decimal. De grønne/gule/røde statusbeskeder opdateres kun ved statusskift i live-regionen, mens km-tal løbende opdateres uden at blive læst op hele tiden. Mobilpanelet holder afstandstallene samlet ved fartmåleren. Lokale `?fuelPreview=range-short` og `range-tight` scener kontrollerer begge advarsler med den rigtige beregning og cockpittekstur, og fjernes fra produktionsbygget.
