# Facturette pour macOS

La version macOS utilise exactement le meme code que la version Windows :
theme sombre, factures PDF blanches, stockage local, PDF sur le Bureau, sans QR code.

## Pourquoi le fichier Mac n'est pas compile depuis Windows

`electron-builder` bloque volontairement le build macOS quand il est lance depuis Windows.
La generation du `.dmg` ou de l'app Mac doit etre faite sur macOS, ou sur une machine macOS
dans GitHub Actions.

## Option recommandee : GitHub Actions

1. Mettre ce projet dans un depot GitHub.
2. Ouvrir l'onglet `Actions`.
3. Lancer le workflow `Build Mac`.
4. Telecharger l'artefact `Facturette-Mac`.
5. Envoyer a ta copine le fichier `Facturette-Mac-universal.dmg` ou `Facturette-Mac-universal.zip`.

## Option sur un Mac

Depuis un Mac avec Node.js disponible :

```bash
bash scripts/build-mac.sh
```

Les fichiers seront generes dans `dist/` :

```text
dist/Facturette-Mac-universal.dmg
dist/Facturette-Mac-universal.zip
```

## Installation sur le Mac

1. Ouvrir le `.dmg`.
2. Glisser `Facturette` dans `Applications`.
3. Au premier lancement, si macOS affiche "developpeur non identifie", faire clic droit sur l'app,
   puis `Ouvrir`.

Les donnees seront stockees localement dans :

```text
~/Library/Application Support/Facturette
```

Les PDF seront generes sur le Bureau du Mac.
