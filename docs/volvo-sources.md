# Volvo-katalog: kontrol 8. oktober 2026

Alle **implementerede garagevalg** er sammenholdt med den offentlige danske [Truck Builder](https://www.volvotrucks.dk/da-dk/tools/truck-builder.html#/da-dk/configurator/fh16aero), [FH16 Aero-specifikationer](https://www.volvotrucks.dk/da-dk/trucks/models/volvo-fh16-aero/specifications.html), fabrikantens faktaark og [dansk 6×4-modelblad](https://www.volvotrucks.dk/content/dam/volvo-trucks/markets/denmark/transport2025/volvo-fh16-aero-780-6x4/fh64t6a_dnk_dan.pdf). Garagen er en delmængde af fabrikantens tilbud, ikke en kopi af alle salgskombinationer i Volvos interne VSS.

| Område | Kontrol og resultat |
|---|---|
| Motorer | D17A600: 600 hk / 441 kW / 3.000 Nm. D17A700: 700 hk / 515 kW / 3.400 Nm. D17A780: 780 hk / 574 kW / 3.800 Nm. Alle 17,3 liter. Uændrede, bekræftet. |
| Motor/gearkasse | Fabrikantens offentlige matrix forbinder de tre motorer med henholdsvis ATO3112, ATO3512 og ATO3812. Automatisk valg i spillet bevares; det er en direkte matrixreference, ikke en gættet momentregel. |
| I-Shift | 12 normale fremadgående gear. Builderens to valg er I-Shift og I-Shift Crawler Gears. Krybegearvalget konkretiseres som ASO-C: ét ekstra fremadgående krybegear, cirka 48 kg ekstra, første krybeudveksling 17,54 på overdrive-gearkasse. ASO-ULC med to krybetrin findes også, men er ikke et selvstændigt garagevalg. |
| Førerhuse | FH16ALSL, FH16ASLP, FH16AHSL, FH16AXHS og FH16AXHE findes i fabrikantmaterialet. Indvendige højder bruges som 147 / 171 / **205 / 220 / 220 cm**; over motortunnel 138 / 162 / 196 / 211 / 211 cm. |
| Chassis | Builderen viser trækker og langt chassis. Trækkerlisten har Medium og High for 4×2, 6×2 pusher, 6×2 tag, 6×4 og 8×4 pusher. Spillet tilbyder fortsat 4×2 Medium og 6×4 High. Begge efterprøvet. |
| Sideskirts | Efter valg af `tra_6x4_high` viste builderen kun No sideskirt. Spillet tilbyder ikke et sideskirt-tilvalg. |
| Udvendig finish | Waterfall er det viste buildervalg. Det faste udseende er en original modeltolkning. |
| Spejle | Camera Monitor System og Mirrors, begge observeret på den aktuelle FH16 Aero-side. |
| Forlygter | LED-forlygte og LED-forlygte med adaptivt fjernlys. Dansk modelblad: HL-LED / HL-LED3. Begge garagevalg bevares. Automatisk natlys er simuleret; Volvos trafikafhængige segmentering af fjernlys er ikke implementeret. |
| Interiør | FH16 og Black Edition, begge efterprøvet. Black Edition beskrives som sorte lædersæder og læderdørpaneler; det er ikke synonymt med et fuldt mørkt interiør. |
| Lak | 2613 Indigo Black Metallic (Blue), 2101 Millennium Silver (White), 2503 Morello Storm (Red & Orange), 2704 Steel Dawn (Black & Grey). Navne og koder genkontrolleret i paletten. De fire valgmuligheder er metallic; skærmfarver er visuelle tilnærmelser. |

## Rettelser og kildeprioritet

Det gamle danske modelblad bruger 203 cm for Globetrotter og 222 cm for XL. Den aktuelle modelside og de separate Aero-faktaark angiver 205 og 220 cm. Garagen følger de modelbestemte Aero-oplysninger; XXL får også 220 cm i stedet for et manglende højdetal.

- [Globetrotter-faktaark med 205/196 cm](https://stpi.it.volvo.com/STPIFiles/Volvo/FactSheet/FH16AHSL_Pol_01_337250022.pdf)
- [XL-faktaark, 16. juni 2025, 220/211 cm](https://stpi.it.volvo.com/STPIFiles/Volvo/FactSheet/FH16AXHS_Eng_02_338550348.pdf)
- [XXL-faktaark, 16. juni 2025, 220/211 cm](https://stpi.it.volvo.com/STPIFiles/Volvo/FactSheet/FH16AXHE_Eng_02_338550347.pdf)
- [Black Edition-faktaark](https://stpi.it.volvo.com/STPIFiles/Volvo/FactSheet/PCA80168%2CPCA80169%2CPCA80170%2CPCA80171_Dan_01_337250027.pdf)

Den friske danske builder viser fortsat D13K560 / D13K500 / D13K460 / D13K420, selv med FH16 Aero som valgt model. De er derfor **ikke** kopieret til FH16-spillet. D17-data kommer fra de officielle FH16 Aero-specifikationer og understøttes af fabrikantens [D17-introduktion](https://www.volvotrucks.dk/da-dk/news/pressemeddelelser/2024/jun/den-nye-volvo-fh16-mere-kraft-mindre-braendstofforbrug.html). B100 er en mulighed på 700 hk ifølge modellen; spillet har ingen separat brændstofvælger.

## Referencevægt og simulerede data

6×4-grundmassen 8.825 kg findes i modelbladets **3.200 mm akselafstandskolonne**, ikke 3.400 mm. Bladet oplyser nul brændstof, ingen chauffør og vægttolerance ±3 %. Det er et referencegrundlag; det er ikke den nøjagtige egenvægt for enhver kabine- og udstyrskombination. 4×2-grundmassen 7.600 kg og den generiske sættevogns 6.500 kg er tekniske spilantagelser. Krybegear tilføjer de dokumenterede 48 kg i kørselsberegningen.

Motorernes maksimumseffekt og -moment er fabrikantdata. Trækkraftskurve, gearskift, vejgreb, CMS' lille luftmodstandsfordel, bremser, rutehastigheder og vægttilpasninger er en forenklet spilmodel. Præmier, rejsetider, døgnforløb og ombygningsafregning er spilregler. De er ikke udlagt som Volvo-specifikationer.

Fabrikantens fulde bestillingsregler og pakkeafhængigheder er ikke offentligt tilgængelige. Black Edition-faktaarket nævner yderligere nødvendige varianter og henviser til VSS; derfor påstås ikke fuld salgsvalidering af enhver kombination. De manglende chassis-, lak-, sæde- og udstyrsmuligheder tilføjes først sammen med passende modeller og valideret data.

## Modeller

Blender/GLB-modeller er originale referencefortolkninger, ikke Volvo CAD. De er ikke ommodelleret i denne datakontrol. Grafiske tagparametre og andre mål i scenen er modelparametre; de viste fabrikantmål i kataloget er kontrolleret separat.

Lys: [Studio Small 09](https://polyhaven.com/a/studio_small_09) og [Kloppenheim 06 Pure Sky](https://polyhaven.com/a/kloppenheim_06_puresky), [CC0](https://polyhaven.com/license).
