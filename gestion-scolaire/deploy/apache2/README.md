# Déploiement Apache2

1. Activer les modules : `a2enmod proxy proxy_http`
2. Copier `gestion-scolaire.conf` dans `/etc/apache2/sites-available/`
3. Activer le site : `a2ensite gestion-scolaire`
4. Recharger Apache : `systemctl reload apache2`
5. Lancer backend (port 3000) et frontend (port 3001) avec PM2 ou systemd
