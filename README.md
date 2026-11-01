# VoxelCraft Survival (Ego-Perspektive, Browser)

Keine Abhängigkeiten, kein Build. Reines WebGL + JavaScript.

## Starten
Ordner über einen lokalen Server öffnen (nötig für Offline-Modus / Service Worker):

    python3 -m http.server 8080      # dann http://localhost:8080
    # oder: npx serve .

Desktop-Browser (Chrome/Edge/Firefox). Klick auf "Neue Welt" bzw. "Fortsetzen".

## Steuerung
WASD bewegen · Doppeltipp W oder Strg sprinten · Shift schleichen · Leertaste springen/schwimmen
Linksklick abbauen/angreifen · Rechtsklick platzieren/essen · F benutzen (Wasser trinken, TNT zünden, Bett)
E Inventar (Handwerk, Fertigkeiten, Verzaubern, Reparieren) · M große Karte · 1-9/Mausrad Hotbar · F3 Debug
Dev-Konsole im Browser: `cmd('time 0.7')`, `cmd('give 107 1')`, `cmd('spawn zombie')`, `cmd('rain')`, `cmd('heal')`, `cmd('tp x y z')`

## Neu in 0.2
- Prozedurale Pixel-Texturen für alle Blöcke und Items (Atlas), Ambient-Occlusion, Sonne, Mond, Sterne, Wolken
- Abbau-Animation mit 10 Riss-Stufen, Bruchpartikel und Geräuschen
- Neues Hauptmenü mit rotierender 3D-Welt, Logo, Splash-Texten; Item-Icons (Isometrie) in Hotbar/Inventar/Rezepten
- Texturierte Mobs (Zombie mit Armen/Augen, Schwein mit Beinen/Schnauze), Items am Boden als Icons
- Springen verbraucht keine Ausdauer mehr

## Neu in 0.3
- 13 Biome: Ebene, Wald, Wüste, Gebirge (Schneekappen), Tundra, Taiga, Dschungel, Savanne, Mesa, Sumpf, Ozean, Strand, Fluss; Biom-Farbtönung für Gras/Laub/Wasser
- Neue Blöcke und Pflanzen: Schnee, Eis, Rotsand, Ton, Kies, Kaktus, Fichten, Gras, Blumen; Eichen-, Fichten-, Dschungel- und Akazienbäume, Felsen
- Neue Mobs: Skelett (Pfeile), Spinne, Creeper (explodiert), Kuh, Schaf, Huhn; neue Speisen (Steak, Hühnchen)
- Mobs drehen sich in Laufrichtung und animieren die Beine; Items ohne Seitenkanten; Schwert-Haltung wie in Minecraft

## Umgesetzt
- Unendliche Welt, Chunks 16x16x64 (Höhe 64 statt 256), Streaming mittig nach außen, Recent-Cache, Entladen, Distanznebel
- Terrain: 13 Biome, verzerrte Kontinente, sanfte Ebenen und schroffe Bergrücken, Höhenflüsse und Seen, Höhlen, Erze, Bäume und Hütten (deterministisch nach Seed)
- Flache Uint8-Chunkdaten, Transparenzpass für Wasser, Rendering mit Tag/Nacht-Beleuchtung
- Spielerphysik (fester Zeitschritt + Interpolation, AABB), Sturzschaden, Schwimmen + Sauerstoff/Ertrinken
- Leben, Hunger, Durst, Ausdauer (Sprint/Springen/Abbau), Tod mit Inventar-Drop, Respawn, Teleport zum Todesort
- Tag/Nacht, Regen + Gewitter (Durst-Regeneration, Sicht)
- Inventar (Klick-Tausch, Sortieren), Stapel, Hotbar, Zielumriss + Geisterblock, Gegenstände am Boden
- Minecraft-inspiriertes Handwerk mit 2x2-Inventar- und 3x3-Werkbankraster, Rezeptbuch und eigenen Rezepten für die vorhandenen Materialien
- Truhen in verlassenen Hütten mit seedabhängiger Beute; Truheninhalte werden gespeichert und können beim Zerstören herausfallen
- Passive Tiere fliehen nach einem Treffer für kurze Zeit vor dem Angreifer
- Mobs: Zombie, Schwein, Boss (Nachtkoloss); Spawn nachts + dunkle Höhlen; Drops + XP; Nahkampf mit Cooldown
- XP, Zaubertisch (Effizienz/Schärfe), Fertigkeiten (Schaden, Ausdauer, Herstellung, Glück)
- TNT mit Kratern + Schaden, Bett (Spawnpunkt, Nacht überspringen)
- Minimap, große Karte mit Fog-of-War, Kompass, Strukturmarker nach Entdeckung, XYZ + Biom im HUD
- Speichern: IndexedDB, Edit-Deltas pro Chunk (gzip), Version, Prüfsumme, Autosave 60 s, Korruptionsbehandlung
- Menüs (Fortsetzen/Neue Welt mit Seed + Bestätigung), Pause, Einstellungen (Sichtweite, Nebel, FOV, Empfindlichkeit, Lautstärke), Vollbild
- Prozedurales Audio, Untertitel, Farbenblind-Modus, weniger Bewegung, sichtbare Hand mit Schwung-Animation
- PWA (Manifest + Service Worker)

## NICHT umgesetzt (Abweichungen vom Plan)
Three.js/Vite/TypeScript (npm war nicht erreichbar), Web-Worker (Generierung/Meshing/Mobs laufen im Hauptthread mit Zeitbudget),
Greedy Meshing (Face-Culling mit AO), Echtzeit-Schatten, dynamische Punktlichter, A*-Pfadfindung (direkte Verfolgung + Springen),
vollständiger Rezeptumfang aus Minecraft Java, 40 Werkbänke/Bücher, Redstone-Mechanismen, Feuer, statische Stabilität/Einsturz, Türen, Wasserfluss,
Tastenbelegung ändern, Partikel nur einfach, Schematics als JSON (Hütte ist im Code), Rüstung/Fallen.
Der 60-FPS-Test auf echter Hardware steht aus (getestet nur per Software-Rendering, ~30 FPS).
