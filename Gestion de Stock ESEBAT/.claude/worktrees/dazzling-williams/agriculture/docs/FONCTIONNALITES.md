# Fonctionnalités - Agriculture Intelligente

## Vue d'ensemble

Plateforme e-agricole pour le Sénégal : gestion des parcelles, recommandations culturales, alertes météo et administration.

---

## 1. Authentification (tous les utilisateurs)

| Fonctionnalité | Route | Description |
|----------------|-------|-------------|
| Connexion | `/auth/login` | Login email/mot de passe, JWT |
| Inscription | `/auth/register` | Création de compte (rôle FARMER par défaut) |
| Mot de passe oublié | `/auth/forgot-password` | Envoi d'un lien de réinitialisation |
| Réinitialisation mot de passe | `/auth/reset-password` | Nouveau mot de passe via token |
| Déconnexion | — | Invalidation du refresh token |

---

## 2. Page d'accueil (public)

| Fonctionnalité | Route | Description |
|----------------|-------|-------------|
| Landing page | `/` | Présentation de la plateforme, CTA vers connexion |
| Multi-langue | — | Français, Anglais, Espagnol, Italien (sélecteur) |
| Design | — | Mise en page avec sections : parcelles, recommandations, météo, alertes |

---

## 3. Agriculteur (FARMER)

| Fonctionnalité | Route | Description |
|----------------|-------|-------------|
| Tableau de bord | `/dashboard` | Vue d'ensemble : exploitation, stats, parcelles récentes, alertes, météo |
| Exploitation | `/farm` | CRUD exploitation (nom, région, type, superficie, description) |
| Parcelles | `/parcels` | Liste des parcelles avec pagination et recherche |
| Nouvelle parcelle | `/parcels/new` | Création parcelle (nom, superficie, région, type de sol, coordonnées GPS) |
| Détail parcelle | `/parcels/[id]` | Carte, météo, profil sol, recommandations |
| Profil sol | `/parcels/[id]` | pH, humidité, salinité (saisie manuelle ou via capteurs) |
| Recommandations | `/parcels/[id]` + `/recommendations/[id]` | Lancement moteur, affichage cultures recommandées |
| Alertes | `/alerts` | Liste alertes (sécheresse, pluie, etc.), acquittement, résolution, mute |

---

## 4. Agronome (AGRONOMIST)

| Fonctionnalité | Route | Description |
|----------------|-------|-------------|
| Tableau de bord | `/dashboard` | Accès rapide aux sections consultation |
| Consultation Cultures | `/consultation/crops` | Lecture seule du catalogue des cultures |
| Consultation Exigences | `/consultation/exigences` | Lecture seule des règles agronomiques |
| Consultation Régions | `/consultation/regions` | Lecture seule du référentiel des régions |

---

## 5. Technicien (TECHNICIAN)

| Fonctionnalité | Route | Description |
|----------------|-------|-------------|
| Tableau de bord | `/dashboard` | Accès rapide aux sections consultation |
| Consultation Régions | `/consultation/regions` | Lecture seule du référentiel des régions |
| Consultation Règles alertes | `/consultation/regles-alertes` | Lecture seule des règles d'alertes |
| Paramétrage capteurs | `/capteurs` | Création, modification, association capteur ↔ parcelle, clé API |

---

## 6. Administrateur (ADMIN)

| Fonctionnalité | Route | Description |
|----------------|-------|-------------|
| Tableau de bord | `/dashboard` | Stats globales (utilisateurs, exploitations, parcelles, etc.), lien vers administration |
| Administration | `/admin` | Statistiques globales, liens vers les sections |
| Utilisateurs | `/admin/users` | CRUD utilisateurs, changement de rôle, activation/désactivation |
| Régions | `/admin/regions` | CRUD référentiel régions (nom, code, zone) |
| Cultures | `/admin/crops` | CRUD catalogue cultures (nom, catégorie, nom scientifique) |
| Exigences agronomiques | `/admin/crop-requirements` | CRUD règles de recommandation (pH, humidité, saison, etc.) |
| Règles alertes | `/admin/alert-rules` | CRUD règles d'alertes (type, sévérité, seuils, cooldown) |
| Audit logs | `/admin/audit-logs` | Consultation historique des actions |

---

## 7. Météo & données

| Fonctionnalité | Contexte | Description |
|----------------|----------|-------------|
| Prévisions 7 jours | Parcelle | Widget météo sur dashboard et détail parcelle |
| Historique 30 jours | Parcelle | Graphique température, pluie, humidité |
| Cache Redis | API | Réduction des appels OpenWeather |
| Fallback DB | API | Données en cache si provider indisponible |

---

## 8. Alertes

| Type | Description |
|------|-------------|
| SOIL_MOISTURE_LOW | Humidité du sol faible |
| SOIL_PH_OUT_OF_RANGE | pH hors plage |
| SOIL_SALINITY_HIGH | Salinité élevée |
| HEAT_WAVE_RISK | Risque canicule |
| HEAVY_RAIN_RISK | Risque pluie intense |
| DROUGHT_RISK | Risque sécheresse |

Actions : acquitter, résoudre, mettre en sourdine (X heures).

---

## 9. Capteurs & collecte de données

| Responsable | Rôle |
|-------------|------|
| **TECHNICIAN** | Paramétrage des capteurs sur le terrain : installation, connexion, calibration, association capteur ↔ parcelle |
| **ADMIN** | Paramétrage global : types de capteurs, modèles, fréquence de collecte |
| **FARMER** | Saisie manuelle du profil sol (pH, humidité, salinité) si pas de capteurs ; association capteurs à ses parcelles |

### Types de capteurs

| Type | Code | Paramètre(s) | Unité | Usage |
|------|------|--------------|-------|-------|
| pH sol | `SOIL_PH` | pH | 0–14 | Profil sol, alertes pH hors plage |
| Humidité sol | `SOIL_MOISTURE` | soilMoisture | % (0–100) | Profil sol, alertes humidité faible |
| Salinité / conductivité | `SOIL_SALINITY` | salinity | dS/m | Profil sol, alertes salinité élevée |
| Station météo | `WEATHER_STATION` | température, pluie, humidité air | °C, mm, % | Complément OpenWeather |

### Paramètres à récupérer

| Paramètre | Capteur | Plage | Description |
|-----------|---------|-------|-------------|
| **pH** | pH sol | 0–14 | Acidité du sol |
| **soilMoisture** | Humidité sol | 0–100 % | Teneur en eau du sol |
| **salinity** | Salinité | 0+ dS/m | Conductivité électrique (EC) |
| **tempMax** | Météo (optionnel) | °C | Température max (alertes canicule) |
| **rainfallSum** | Météo (optionnel) | mm | Cumul pluie (alertes sécheresse, forte pluie) |

### Intégration des capteurs à la plateforme

**1. Enregistrement (interface TECHNICIAN)**  
Le technicien ajoute un capteur via la plateforme web :
- Création du capteur : ID, type (SOIL_PH, SOIL_MOISTURE, etc.), modèle, clé d’authentification
- Association à une parcelle (exploitation d’un agriculteur)
- Configuration : fréquence de collecte, seuils

**2. Flux des données (MQTT → IoT → API)**  
```
Capteur physique → MQTT (broker Mosquitto) → Service apps/iot → API REST → Profil sol parcelle
```
- Les capteurs publient sur des topics MQTT (ex. `agriculture/parcels/{parcelId}/soil`)
- Le service `apps/iot` consomme les messages, valide et appelle l’API pour mettre à jour le profil sol
- L’API expose un endpoint (ex. `POST /iot/ingest` ou via service interne) pour recevoir les mesures

**3. Alternatives possibles**
- **Webhook** : capteurs/ passerelles qui envoient en HTTP vers l’API
- **API REST directe** : passerelle IoT qui appelle `PUT /farmer/parcels/:id/soil` avec une clé capteur

*Module capteurs implémenté. Voir [Guide utilisateur capteurs](GUIDE_CAPTEURS.md).*

---

## 10. Recommandations culturales

- Moteur basé sur : sol (pH, humidité, salinité), météo, région, saison
- Exigences agronomiques par culture/région/saison
- Score par culture avec explications (points positifs, négatifs, données manquantes)

---

## 11. Multi-langue (i18n)

| Langue | Code |
|--------|------|
| Français | fr |
| Anglais | en |
| Espagnol | es |
| Italien | it |

Sélecteur sur page d'accueil et page de connexion. Préférence stockée en cookie `NEXT_LOCALE`.

---

## Récapitulatif par rôle

| Rôle | Accès |
|------|-------|
| **FARMER** | Dashboard, Exploitation, Parcelles, Alertes, Recommandations, Météo |
| **AGRONOMIST** | Dashboard, Consultation (Cultures, Exigences, Régions) |
| **TECHNICIAN** | Dashboard, Consultation (Régions, Règles alertes), Paramétrage capteurs |
| **ADMIN** | Tout (y compris Administration complète) |

---

## URLs principales

- **Web** : http://localhost:3000
- **API** : http://localhost:4000
- **Swagger** : http://localhost:4000/docs
