# Configuration SMTP — ESEBAT

Pour que les emails (réinitialisation de mot de passe, notifications) soient **réellement envoyés**, configurez le SMTP dans le fichier **`.env`** à la racine du projet.

---

## 1. Variables à modifier dans `.env`

| Variable | Description | Exemple |
|----------|-------------|---------|
| `MAIL_MAILER` | `smtp` pour envoi réel, `log` pour tout écrire dans les logs | `smtp` |
| `MAIL_HOST` | Serveur SMTP | `smtp.gmail.com` |
| `MAIL_PORT` | Port (souvent 587 ou 465) | `587` |
| `MAIL_USERNAME` | Adresse email d’envoi (ou identifiant SMTP) | `votre@email.com` |
| `MAIL_PASSWORD` | Mot de passe de l’email ou *mot de passe d’application* | `xxxx xxxx xxxx xxxx` |
| `MAIL_ENCRYPTION` | `tls` (port 587) ou `ssl` (port 465) | `tls` |
| `MAIL_FROM_ADDRESS` | Adresse affichée comme expéditeur | `noreply@votredomaine.com` |
| `MAIL_FROM_NAME` | Nom affiché (souvent le nom de l’app) | `"${APP_NAME}"` |

**Important :** `APP_URL` dans `.env` doit correspondre à l’URL réelle du site (ex. `http://192.168.1.76:8000`), car les liens dans les emails (ex. réinitialisation) sont générés à partir de cette valeur.

---

## 2. Exemples par fournisseur

### Gmail

1. **Important :** Gmail exige un **mot de passe d’application** (pas le mot de passe du compte). Sinon vous obtiendrez l’erreur « Application-specific password required ».
   - Aller sur [Google Compte → Sécurité](https://myaccount.google.com/security).
   - Activer la **validation en 2 étapes** si besoin.
   - Puis **Mots de passe des applications** : créer un mot de passe pour « Mail » (ou « Autre »), copier les 16 caractères.
2. **Vérifier qu’il n’y a qu’un seul `@`** dans l’adresse (ex. `lyissa15@gmail.com` et non `lyissa15@@gmail.com`).
3. Dans `.env` :

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre.adresse@gmail.com
MAIL_PASSWORD=xxxx_xxxx_xxxx_xxxx
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=votre.adresse@gmail.com
MAIL_FROM_NAME="${APP_NAME}"
```

### Outlook / Microsoft 365

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.office365.com
MAIL_PORT=587
MAIL_USERNAME=votre.adresse@outlook.com
MAIL_PASSWORD=votre_mot_de_passe
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=votre.adresse@outlook.com
MAIL_FROM_NAME="${APP_NAME}"
```

### OVH (hébergement web)

Récupérer les paramètres SMTP dans l’espace client OVH (Infos du serveur de messagerie). Exemple :

```env
MAIL_MAILER=smtp
MAIL_HOST=ssl0.ovh.net
MAIL_PORT=587
MAIL_USERNAME=contact@votredomaine.com
MAIL_PASSWORD=mot_de_passe_boite_mail
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@votredomaine.com
MAIL_FROM_NAME="${APP_NAME}"
```

### Mailtrap (test sans envoi réel)

Utile en développement : les emails sont capturés dans un bac Mailtrap, aucun envoi vers de vraies boîtes.

1. Créer un compte sur [mailtrap.io](https://mailtrap.io), récupérer les identifiants SMTP du bac.
2. Dans `.env` :

```env
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=xxxx
MAIL_PASSWORD=xxxx
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="esebat@example.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### Autre serveur SMTP (générique)

```env
MAIL_MAILER=smtp
MAIL_HOST=serveur-smtp.votre-hebergeur.com
MAIL_PORT=587
MAIL_USERNAME=votre_identifiant
MAIL_PASSWORD=votre_mot_de_passe
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@votredomaine.com
MAIL_FROM_NAME="${APP_NAME}"
```

Si le serveur utilise le port 465 (SSL), mettez `MAIL_PORT=465` et `MAIL_ENCRYPTION=ssl`.

---

## 3. Après modification du `.env`

Sur le serveur, vider le cache de configuration pour que Laravel prenne en compte les nouvelles valeurs :

```bash
cd /var/www/gestion-stock-btp
php artisan config:clear
php artisan config:cache
```

Puis tester : aller sur **Mot de passe oublié**, saisir une adresse email de test et vérifier la réception (ou le bac Mailtrap en test).

---

## 4. Dépannage

- **« Application-specific password required » (Gmail)** : utiliser un **mot de passe d’application** Google (Sécurité → Validation en 2 étapes → Mots de passe des applications), pas le mot de passe du compte.
- **« Failed to authenticate with username "xxx@@gmail.com" »** : il y a une **double arobase** dans `.env`. Corriger `MAIL_USERNAME` et `MAIL_FROM_ADDRESS` pour n’avoir qu’un seul `@` (ex. `lyissa15@gmail.com`).
- **Aucun email reçu** : vérifier les courriers indésirables ; s’assurer que `MAIL_MAILER=smtp` et que les identifiants sont corrects.
- **Erreur « Connection could not be established »** : vérifier `MAIL_HOST`, `MAIL_PORT`, `MAIL_ENCRYPTION` (tls vs ssl) et que le pare-feu autorise les sorties sur ce port.
- **Lien dans l’email pointe vers localhost** : corriger `APP_URL` dans `.env` (ex. `http://192.168.1.76:8000` ou l’URL publique du site).

---

*Document pour le projet gestion-stock-btp (ESEBAT).*
