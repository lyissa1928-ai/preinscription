# Hébergement sur Debian 12 — Prérequis et installation

Guide pour déployer **ESEBAT / gestion-stock-btp** (Laravel 12) sur un serveur Debian 12.

---

## 1. Prérequis côté serveur

- **OS** : Debian 12 (Bookworm)
- **Accès** : root ou utilisateur avec `sudo`
- **Réseau** : accès internet pour installer les paquets
- **Optionnel** : nom de domaine pointant vers l’IP du serveur (pour HTTPS)

---

## 2. Mise à jour du système

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 3. Logiciels à installer

### 3.1 PHP 8.2+ (et extensions Laravel)

Laravel 12 demande PHP ^8.2. Sur Debian 12, installer PHP 8.2 et les extensions nécessaires :

```bash
sudo apt install -y php8.2 php8.2-fpm php8.2-cli \
  php8.2-mysql php8.2-sqlite3 php8.2-pgsql \
  php8.2-mbstring php8.2-xml php8.2-bcmath php8.2-curl \
  php8.2-zip php8.2-gd php8.2-intl php8.2-redis
```

Vérification :

```bash
php -v
php -m
```

### 3.2 Composer

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
composer --version
```

### 3.3 Serveur web : Nginx (recommandé)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3.4 Base de données

Tu peux utiliser **SQLite** (simple) ou **MySQL/MariaDB** (recommandé en production).

**Option A — SQLite (minimal)**  
Déjà utilisable avec PHP ; aucun service à installer. Assure-toi que le fichier de base (ex. `database/database.sqlite`) est créé et que le dossier est inscriptible.

**Option B — MariaDB (recommandé pour la prod)**

```bash
sudo apt install -y mariadb-server mariadb-client
sudo systemctl enable mariadb
sudo systemctl start mariadb
sudo mysql_secure_installation
```

Créer la base et l’utilisateur :

```bash
sudo mysql -e "CREATE DATABASE esebat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'esebat'@'localhost' IDENTIFIED BY 'MOT_DE_PASSE_FORT';"
sudo mysql -e "GRANT ALL ON esebat.* TO 'esebat'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

### 3.5 Redis (optionnel)

Utile si tu passes `CACHE_STORE`, `SESSION_DRIVER` ou `QUEUE_CONNECTION` en `redis` :

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 3.6 Node.js et npm (si build frontend Vite/Blade)

Si le projet a des assets à compiler (Vite, etc.) :

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 3.7 Git

```bash
sudo apt install -y git
```

### 3.8 Autres outils utiles

```bash
sudo apt install -y unzip curl
```

---

## 4. Récapitulatif des paquets (une commande)

À adapter selon tes choix (avec MariaDB + Redis + Node) :

```bash
sudo apt update
sudo apt install -y \
  nginx php8.2 php8.2-fpm php8.2-cli \
  php8.2-mysql php8.2-sqlite3 php8.2-mbstring php8.2-xml php8.2-bcmath \
  php8.2-curl php8.2-zip php8.2-gd php8.2-intl php8.2-redis \
  mariadb-server mariadb-client redis-server \
  git unzip curl
```

Puis Composer (voir ci-dessus) et éventuellement Node.js.

---

## 5. Configuration Nginx pour Laravel

Créer un vhost (remplace `votre-domaine` et le chemin de l’app) :

```bash
sudo nano /etc/nginx/sites-available/esebat
```

Contenu type :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    root /var/www/gestion-stock-btp/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
        fastcgi_read_timeout 300;
    }
}
```

Activer le site et recharger Nginx :

```bash
sudo ln -s /etc/nginx/sites-available/esebat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Déploiement de l’application

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/lyissa1928-ai/sunudepot.git gestion-stock-btp
cd gestion-stock-btp
```

Créer `.env` à partir de `.env.example`, configurer `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`, et la base (SQLite ou MySQL) :

```bash
cp .env.example .env
nano .env
```

Puis :

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Droits :

```bash
sudo chown -R www-data:www-data /var/www/gestion-stock-btp
sudo chmod -R 755 /var/www/gestion-stock-btp
sudo chmod -R 775 /var/www/gestion-stock-btp/storage /var/www/gestion-stock-btp/bootstrap/cache
```

---

## 7. File d’attente (queue) — optionnel

Si tu utilises `QUEUE_CONNECTION=database` ou `redis`, faire tourner le worker (ex. avec systemd ou Supervisor) :

```bash
php artisan queue:work --sleep=3 --tries=3
```

En production, utiliser un service systemd ou **Supervisor** pour garder le worker actif.

---

## 8. HTTPS avec Let’s Encrypt (recommandé)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

Renouvellement automatique : déjà géré par un timer systemd.

---

## 9. Checklist rapide

| Élément              | Commande / action |
|---------------------|-------------------|
| Système à jour      | `apt update && apt upgrade` |
| PHP 8.2 + extensions| `php8.2`, `php8.2-fpm`, `mbstring`, `xml`, `bcmath`, `mysql`/`sqlite3`, etc. |
| Composer            | install depuis getcomposer.org |
| Nginx               | `apt install nginx` |
| Base de données     | SQLite (rien) ou MariaDB |
| Redis (optionnel)  | `apt install redis-server` |
| Node/npm (optionnel)| NodeSource 20.x si build frontend |
| Git                 | `apt install git` |
| Vhost Nginx         | `root` = `.../public`, PHP-FPM 8.2 |
| Laravel             | `composer install --no-dev`, `artisan key:generate`, `migrate`, caches |
| Droits              | `www-data` propriétaire, `storage` et `bootstrap/cache` en 775 |
| HTTPS               | `certbot --nginx` |

---

## 10. En cas de souci

- **502 Bad Gateway** : PHP-FPM actif ? `sudo systemctl status php8.2-fpm`
- **500** : `APP_DEBUG=false`, consulter `storage/logs/laravel.log`
- **Permissions** : revérifier propriétaire `www-data` et droits 775 sur `storage` et `bootstrap/cache`

Tu peux utiliser ce fichier comme référence unique pour « tout ce qu’il faut installer » sur Debian 12 pour ce projet.
