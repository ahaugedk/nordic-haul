# Europakort

Landgeometri: Natural Earth 1:110m admin-0, public domain.

- [Datasæt](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson)
- [Brugsbetingelser](https://www.naturalearthdata.com/about/terms-of-use/)

Geometrien er projiceret til et Mercator-udsnit af Europa og gemt som kompakte SVG-paths i `src/data/europe-land.ts`. Kortet viser geografisk orientering, ikke navigationsanvisninger eller en politisk autoritativ grænseafgrænsning. Forbindelser er skematiske kurver, ikke vejnet. Distancer er et fast OSRM/OpenStreetMap-opslag af de 30 unikke bypar, afrundet til 10 km. Alle 48 kontrakter bruger disse vejafstande. Skandinaviske forbindelser føres over Storebælt og Øresund; Stockholm–Warszawa følger landruten via København, Hamburg og Berlin. Opslag, mellemstationer og rå meter er gemt i `road-distance-sources.json` (12. oktober 2026). Kørselsprofilen er for biler, så tallene er repræsentative vejafstande, ikke valideret navigation for tunge køretøjer eller konkrete terminaladresser.

Startby: Aarhus. Hver by har tre udgående kontrakter. Et afsluttet løb opdaterer karrierens `currentCity` til destinationen sammen med betalingen. Et afbrudt løb ændrer hverken by eller indtjening. Næste kontrakter beregnes fra den nye by. Placering og penge gemmes lokalt.

Brugerens musiknummer Nordic Haul afspilles kun under løb, i MP3 med Ogg-fallback. Garagen og kontraktvalget har ingen musik. Én knap slår musik, motor, trafikmeldinger og UI-lyde til/fra; lyd er på ved indlæsning, og browseren aktiverer afspilning efter brugerens klik. M gør det samme under kørsel. Animationer reduceres ved `prefers-reduced-motion`.

Første version kører alle valgte byruter som komprimerede løb på samme 3D-motorvejsbane. Europakortet og den vedvarende rejse er implementeret; geografisk korrekte 3D-vejstrækninger mellem byerne kræver separat baneproduktion og vejdata.


Hver valgt rute tilbyder 8, 16 eller 24 ton last. Præmien består af rutens spilbetaling plus et lasttillæg på 1.100 spilkr. pr. ton. For samme rute giver tungere last derfor altid mere betaling ved samme placering; placering og tidsbonus afregnes som før. Lasttypen, vægten, tillægget og den samlede førstepladspræmie vises før start. Betalingen er spilbalance, ikke et estimat på faktiske fragtpriser. Vægten overføres direkte til kørselsberegningen og colliderens masse.


Brændstofplanen skaleres med disse kilometer og den valgte last. Kilometerne på skiltene og brændstofmålerens afstand har samme skala fra den tilfældige startplads til levering. Se [Brændstoføkonomi](fuel-economy.md) for model, kilder og afregning.
