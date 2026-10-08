# Europakort

Landgeometri: Natural Earth 1:110m admin-0, public domain.

- [Datasæt](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson)
- [Brugsbetingelser](https://www.naturalearthdata.com/about/terms-of-use/)

Geometrien er projiceret til et Mercator-udsnit af Europa og gemt som kompakte SVG-paths i `src/data/europe-land.ts`. Kortet viser geografisk orientering, ikke navigationsanvisninger eller en politisk autoritativ grænseafgrænsning. Forbindelser er skematiske kurver, ikke vejnet. Distancer er storcirkelafstand gange 1,25, afrundet til 10 km; færger, grænseovergange og den konkrete vejføring er ikke beregnet.

Startby: Aarhus. Hver by har tre udgående kontrakter. Et afsluttet løb opdaterer karrierens `currentCity` til destinationen sammen med betalingen. Et afbrudt løb ændrer hverken by eller indtjening. Næste kontrakter beregnes fra den nye by. Placering og penge gemmes lokalt.

Baggrundsmusik og UI-lyde er en original generativ Web Audio-komposition. Den aktiveres ved brugerens første klik eller tastetryk. Radioen spiller i menuerne, garagen og under løb, hvor den mikses lidt lavere. HAUL FM, REDLINE og NIGHT DRIVE kan vælges med radioknapperne; under løb skifter N kanal og M pauser musikken. Radiolydstyrke, UI-effekter og motorlyd styres separat og huskes lokalt. Startsignaler og menulyde følger UI-lydknappen. Animationer reduceres ved `prefers-reduced-motion`.

Første version kører alle valgte byruter som komprimerede løb på samme 3D-motorvejsbane. Europakortet og den vedvarende rejse er implementeret; geografisk korrekte 3D-vejstrækninger mellem byerne kræver separat baneproduktion og vejdata.


Hver valgt rute tilbyder 8, 16 eller 24 ton last. Præmien består af rutens spilbetaling plus et lasttillæg på 1.100 spilkr. pr. ton. For samme rute giver tungere last derfor altid mere betaling ved samme placering; placering og tidsbonus afregnes som før. Lasttypen, vægten, tillægget og den samlede førstepladspræmie vises før start. Betalingen er spilbalance, ikke et estimat på faktiske fragtpriser. Vægten overføres direkte til kørselsberegningen og colliderens masse.
