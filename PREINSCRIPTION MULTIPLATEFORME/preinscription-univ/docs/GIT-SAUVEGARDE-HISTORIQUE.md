# Sauvegarde de l’historique Git (après synchronisation forcée)

Après un `git push --force` sur `main`, l’ancienne ligne de commits a été conservée sur une **branche de secours** :

- **Branche** : `backup/main-avant-force-push`
- **Sommet** : `557d0a1` (dernier commit de `main` avant le remplacement par la copie « Sync depuis projet local »)

Pour consulter ou comparer :

```bash
git fetch origin
git log origin/backup/main-avant-force-push --oneline
```

Pour rétablir temporairement l’ancien `main` en local (sans toucher au remote sans le vouloir) :

```bash
git checkout -b lecture-ancien-main origin/backup/main-avant-force-push
```

**Bon réflexe avant un prochain force-push** : créer une branche de sauvegarde depuis `main` actuel, puis pousser cette branche.
