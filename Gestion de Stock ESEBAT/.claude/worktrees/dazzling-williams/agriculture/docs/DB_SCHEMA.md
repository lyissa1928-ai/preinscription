# Schéma base de données

## Tables

### users
- id (cuid)
- email (unique)
- password_hash
- role (ADMIN | FARMER | AGRONOMIST | TECHNICIAN)
- is_active
- created_at, updated_at

### refresh_tokens
- id (cuid)
- jti (unique) - identifiant JWT pour lookup
- user_id (FK users)
- token_hash - hash Argon2 du token
- expires_at, revoked_at, created_at

### regions
- id (cuid)
- name, code (unique), zone
- created_at

Régions seedées: Dakar, Thiès, Diourbel, Fatick, Kaolack, Kaffrine, Saint-Louis, Louga, Matam, Tambacounda, Kédougou, Kolda, Sédhiou, Ziguinchor (avec zones Nord/Centre/Sud/Est/Ouest).

### farms (Sprint 1)
- id (cuid)
- user_id (unique, FK users)
- name, phone
- region_id (FK regions)
- total_area (float optionnel)
- farming_type (RAINFED | IRRIGATED | MIXED)
- description
- created_at, updated_at

1 farm par farmer (MVP).

### parcels (Sprint 1)
- id (cuid)
- farm_id (FK farms)
- name, area (required)
- region_id (FK regions)
- latitude, longitude (optionnels)
- soil_type (SANDY | CLAY | SILTY | LOAMY | UNKNOWN)
- status (ACTIVE | INACTIVE, default ACTIVE)
- deleted_at (soft delete)
- created_at, updated_at

Index: farmId, deletedAt, regionId.

### weather_daily (Sprint 2)
- id (cuid)
- parcel_id (FK parcels)
- date (date)
- t_min, t_max, t_avg, humidity_avg, rainfall_mm, wind_speed_avg
- provider (string)
- fetched_at
- created_at, updated_at

UNIQUE(parcel_id, date, provider). Index: parcel_id, date.

### weather_fetch_log (Sprint 2)
- id (cuid)
- parcel_id
- provider
- status (SUCCESS/FAILED)
- http_status, error_code
- fetched_at

Index: parcel_id, fetched_at.

### crops (Sprint 3)
- id (cuid)
- name (unique)
- scientific_name (optionnel)
- category (CEREAL | VEGETABLE | FRUIT | LEGUME | TUBER | OTHER)
- description (optionnel)
- default_planting_months (int[]), default_harvest_months (int[])
- created_at, updated_at

### crop_requirements (Sprint 3)
- id (cuid)
- crop_id (FK crops)
- region_id (FK regions, nullable = applicable partout)
- season (DRY | RAINY | ANY)
- ph_min, ph_max, soil_moisture_min/max, salinity_max, rainfall_min_mm, rainfall_max_mm, temp_min_c, temp_max_c
- weight_ph, weight_moisture, weight_salinity, weight_rainfall, weight_temp
- notes, version, is_active
- created_at, updated_at

UNIQUE(crop_id, region_id, season, version).

### parcel_soil_profiles (Sprint 3)
- id (cuid)
- parcel_id (unique, FK parcels)
- ph, soil_moisture (%), salinity
- updated_at

### recommendations (Sprint 3)
- id (cuid)
- parcel_id (FK parcels)
- generated_by_user_id
- generated_at
- engine_version (ex: rules-v1.0)
- season (DRY | RAINY)
- inputs (jsonb), results (jsonb)
- top_crop_id
- created_at

Index: parcel_id, generated_by_user_id, generated_at.

### recommendation_items (Sprint 3)
- id (cuid)
- recommendation_id (FK recommendations)
- crop_id, score
- reasons (jsonb), constraints (jsonb)
- created_at

### audit_logs
- id (cuid)
- actor_user_id (FK users, nullable)
- action, entity, entity_id
- metadata (json)
- created_at

### alert_rules (Sprint 4)
- id (cuid)
- scope (GLOBAL | REGION | PARCEL), default GLOBAL
- region_id (FK regions, nullable)
- parcel_id (FK parcels, nullable)
- type (enum AlertType)
- severity (INFO | WARNING | CRITICAL)
- is_active (boolean, default true)
- conditions (jsonb) — ex: { metric, operator, value, days? }
- window_days (int nullable) — pour météo (ex: 3, 14)
- cooldown_hours (int, default 24)
- message_template (text)
- created_by_user_id (nullable)
- created_at, updated_at

Index: type+isActive, regionId, parcelId.

### alerts (Sprint 4)
- id (cuid)
- farmer_user_id (FK users), parcel_id (FK parcels), rule_id (FK alert_rules)
- type, severity
- title, message
- status (OPEN | ACKED | RESOLVED | MUTED)
- triggered_at, acked_at, resolved_at, muted_until
- fingerprint (unique) — clé déduplication
- meta (jsonb)
- created_at

Index: farmerUserId, parcelId, ruleId, triggeredAt, fingerprint.

### alert_events (Sprint 4 — audit)
- id (cuid)
- alert_id (FK alerts)
- event_type (CREATED | ACKED | RESOLVED | MUTED)
- actor_user_id (FK users)
- created_at
