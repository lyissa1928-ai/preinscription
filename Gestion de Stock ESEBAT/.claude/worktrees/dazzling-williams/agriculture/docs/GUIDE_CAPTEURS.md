# Guide utilisateur — Gestion des capteurs IoT

## Prérequis

- La migration `20250217000000_add_sensors` doit être appliquée : `pnpm db:migrate`
- Un compte **Technicien** ou **Administrateur** pour gérer les capteurs
- Au moins une parcelle créée par un agriculteur

---

## Vue d'ensemble

Ce guide explique comment configurer et utiliser les capteurs IoT sur la plateforme Agriculture Intelligente. Les capteurs permettent de collecter automatiquement des données de sol (pH, humidité, salinité) et de les envoyer vers la plateforme pour alimenter le profil sol des parcelles, les alertes et les recommandations culturales.

---

## Qui peut gérer les capteurs ?

| Rôle | Accès |
|------|-------|
| **Technicien (TECHNICIAN)** | Créer, modifier, désactiver des capteurs ; associer à une parcelle ; consulter la clé API |
| **Administrateur (ADMIN)** | Mêmes droits que le technicien |
| **Agriculteur (FARMER)** | Consulte les données de sol mises à jour par les capteurs sur ses parcelles |

---

## Types de capteurs supportés

### 1. Capteur pH sol (SOIL_PH)

Mesure l'acidité du sol (échelle 0–14). Utilisé pour les alertes pH hors plage et les recommandations culturales.

![Capteur pH sol](images/capteurs/capteur-ph-sol.png)

| Paramètre | Unité | Plage |
|-----------|-------|-------|
| pH | — | 0–14 |

---

### 2. Capteur humidité sol (SOIL_MOISTURE)

Mesure la teneur en eau du sol en pourcentage. Utilisé pour les alertes humidité faible et les recommandations.

![Capteur humidité sol](images/capteurs/capteur-humidite-sol.png)

| Paramètre | Unité | Plage |
|-----------|-------|-------|
| soilMoisture | % | 0–100 |

---

### 3. Capteur salinité (SOIL_SALINITY)

Mesure la conductivité électrique (EC) du sol en dS/m. Utilisé pour les alertes salinité élevée.

![Capteur salinité](images/capteurs/capteur-salinite.png)

| Paramètre | Unité | Plage |
|-----------|-------|-------|
| salinity | dS/m | 0+ |

---

### 4. Station météo (WEATHER_STATION)

Complément aux données OpenWeather : température, pluie, humidité de l'air. (Intégration à venir.)

![Station météo](images/capteurs/station-meteo.png)

| Paramètre | Unité |
|-----------|-------|
| tempMax | °C |
| rainfallSum | mm |
| humidity | % |

---

## Ajouter un capteur

### Étape 1 : Accéder à la page Capteurs

1. Connectez-vous avec un compte **Technicien** ou **Administrateur**.
2. Dans le menu latéral, cliquez sur **Capteurs**.
3. Cliquez sur **Ajouter un capteur**.

### Étape 2 : Remplir le formulaire

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| **Nom** | Oui | Nom descriptif (ex. « Capteur humidité parcelle A ») |
| **Type** | Oui | SOIL_PH, SOIL_MOISTURE, SOIL_SALINITY ou WEATHER_STATION |
| **Modèle** | Non | Modèle du capteur (ex. Soil Moisture Pro v2) |
| **Numéro de série** | Non | Numéro de série pour traçabilité |
| **Parcelle** | Oui | Parcelle à laquelle associer le capteur |

### Étape 3 : Créer et récupérer la clé API

Après création, une **clé API** est générée automatiquement. Cette clé est nécessaire pour envoyer les données vers la plateforme.

- Conservez-la en lieu sûr.
- Vous pouvez la copier ou la régénérer depuis la page de modification du capteur.

---

## Envoyer les données vers la plateforme

### Méthode : API REST (recommandée)

**Endpoint :** `POST /iot/ingest`

**URL complète :** `http://localhost:4000/iot/ingest` (ou l’URL de votre API)

**Headers :**
```
Content-Type: application/json
X-Sensor-Api-Key: <votre_clé_api>
```

**Corps (JSON) :**
```json
{
  "ph": 6.5,
  "soilMoisture": 45,
  "salinity": 2.1
}
```

Vous pouvez envoyer un ou plusieurs paramètres selon le type de capteur :

| Paramètre | Type | Description |
|-----------|------|-------------|
| ph | number | pH (0–14) |
| soilMoisture | number | Humidité % (0–100) |
| salinity | number | Salinité dS/m |

**Exemple avec cURL :**
```bash
curl -X POST http://localhost:4000/iot/ingest \
  -H "Content-Type: application/json" \
  -H "X-Sensor-Api-Key: sk_votre_cle_api" \
  -d '{"soilMoisture": 42}'
```

**Réponse en cas de succès :**
```json
{"success": true}
```

---

## Modifier ou désactiver un capteur

1. Allez sur **Capteurs**.
2. Cliquez sur **Modifier** pour le capteur concerné.
3. Modifiez les champs (nom, type, parcelle, etc.).
4. Cochez/décochez **Capteur actif** pour activer ou désactiver la réception des données.
5. Cliquez sur **Enregistrer**.

### Régénérer la clé API

Si la clé est compromise :

1. Ouvrez la page de modification du capteur.
2. Cliquez sur **Régénérer**.
3. La nouvelle clé est copiée dans le presse-papiers. **L’ancienne clé ne fonctionne plus.**

---

## Flux des données

```
Capteur physique
    ↓
Passerelle / Script (envoi HTTP)
    ↓
POST /iot/ingest (clé API)
    ↓
Profil sol de la parcelle mis à jour
    ↓
Alertes + Recommandations culturales
```

Les données reçues mettent à jour le **profil sol** de la parcelle associée. L’agriculteur peut les consulter sur la page de détail de sa parcelle. Les alertes (humidité faible, pH hors plage, etc.) et les recommandations culturales utilisent ces données.

---

## Dépannage

### Erreur « Clé API invalide ou capteur inactif »

- Vérifiez que la clé est correcte (sans espaces).
- Vérifiez que le capteur est **actif** dans la plateforme.

### Erreur « Aucune donnée à ingérer »

- Envoyez au moins un des paramètres : `ph`, `soilMoisture` ou `salinity`.

### Les données n’apparaissent pas sur la parcelle

- Vérifiez que le capteur est bien associé à la bonne parcelle.
- Vérifiez la date de **dernière lecture** sur la page du capteur.

### Aucune parcelle disponible

- Les parcelles doivent exister et être créées par les agriculteurs.
- Vérifiez qu’au moins une exploitation et une parcelle existent dans la plateforme.

---

## Résumé

| Action | Où |
|--------|-----|
| Lister les capteurs | Menu **Capteurs** |
| Ajouter un capteur | **Capteurs** → **Ajouter un capteur** |
| Modifier / désactiver | **Capteurs** → **Modifier** |
| Copier la clé API | Page de modification du capteur |
| Envoyer des données | `POST /iot/ingest` avec header `X-Sensor-Api-Key` |

---

*Documentation mise à jour — Agriculture Intelligente e-agricole Sénégal*
