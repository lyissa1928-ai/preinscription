================================================================================
  OÙ METTRE LES LOGOS ET LE FAVICON (fichiers par défaut)
================================================================================

Pour afficher des logos et un favicon SANS passer par l'upload dans l'admin,
placez les fichiers directement dans ce dossier "public" :

  • logo.png         → logo dans la barre latérale (navbar)
  • logo-login.png   → logo sur la page de connexion
  • favicon.ico      → icône de l'onglet du navigateur

Emplacement exact :
  gestion-scolaire/frontend/public/logo.png
  gestion-scolaire/frontend/public/logo-login.png
  gestion-scolaire/frontend/public/favicon.ico

Formats acceptés : PNG, JPG, SVG (ICO pour le favicon).
Si un fichier est absent, l'application affichera un texte ou une icône par défaut.

--------------------------------------------------------------------------------
Fichiers uploadés via l'admin (Réglages > Apparence)
--------------------------------------------------------------------------------
Les fichiers que vous uploadez depuis "Tableau de bord > Admin > Apparence & Thème"
sont enregistrés côté backend dans :
  gestion-scolaire/backend/uploads/appearance/

Ils sont servis automatiquement ; pas besoin de les copier à la main.

================================================================================
