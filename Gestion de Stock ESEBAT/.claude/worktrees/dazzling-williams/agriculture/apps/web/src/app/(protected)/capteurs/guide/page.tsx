'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Cpu,
  Terminal,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Copy,
  BookOpen,
  Server,
  Code2,
  Shield,
  HelpCircle,
  Cpu as CpuIcon,
} from 'lucide-react';

const SENSOR_TYPES_DETAILED = [
  {
    code: 'SOIL_PH',
    name: 'Capteur pH sol',
    params: [{ key: 'ph', unit: '—', range: '0–14', desc: 'Acidité/alcalinité du sol' }],
    img: '/images/capteurs/capteur-ph-sol.png',
    usage: 'Utilisé pour les alertes pH hors plage et les recommandations culturales. Un pH entre 6 et 7 est idéal pour la plupart des cultures.',
  },
  {
    code: 'SOIL_MOISTURE',
    name: 'Capteur humidité sol',
    params: [{ key: 'soilMoisture', unit: '%', range: '0–100', desc: 'Teneur en eau du sol' }],
    img: '/images/capteurs/capteur-humidite-sol.png',
    usage: 'Déclenche des alertes si humidité trop faible. Les recommandations d\'irrigation s\'appuient sur cette donnée.',
  },
  {
    code: 'SOIL_SALINITY',
    name: 'Capteur salinité',
    params: [{ key: 'salinity', unit: 'dS/m', range: '≥ 0', desc: 'Conductivité électrique (EC)' }],
    img: '/images/capteurs/capteur-salinite.png',
    usage: 'Alerte si salinité élevée (risque pour les cultures). Important en zones côtières ou irriguées.',
  },
  {
    code: 'WEATHER_STATION',
    name: 'Station météo',
    params: [
      { key: 'tempMax', unit: '°C', range: '—', desc: 'Température max' },
      { key: 'rainfallSum', unit: 'mm', range: '—', desc: 'Cumul pluie' },
      { key: 'humidity', unit: '%', range: '0–100', desc: 'Humidité air' },
    ],
    img: '/images/capteurs/station-meteo.png',
    usage: 'Complément aux données OpenWeather. Intégration météo locale en cours.',
  },
];

const CODE_EXAMPLES = {
  curl: `# Envoi simple (humidité uniquement)
curl -X POST http://localhost:4000/iot/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-Sensor-Api-Key: sk_votre_cle_api" \\
  -d '{"soilMoisture": 42}'

# Envoi multiple (pH + humidité + salinité)
curl -X POST http://localhost:4000/iot/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-Sensor-Api-Key: sk_votre_cle_api" \\
  -d '{"ph": 6.5, "soilMoisture": 45, "salinity": 2.1}'`,

  python: `import requests

API_URL = "http://localhost:4000/iot/ingest"
API_KEY = "sk_votre_cle_api"

def send_reading(ph=None, soil_moisture=None, salinity=None):
    data = {}
    if ph is not None:
        data["ph"] = round(ph, 2)
    if soil_moisture is not None:
        data["soilMoisture"] = round(soil_moisture, 2)
    if salinity is not None:
        data["salinity"] = round(salinity, 2)

    if not data:
        raise ValueError("Au moins un paramètre requis")

    r = requests.post(
        API_URL,
        json=data,
        headers={
            "Content-Type": "application/json",
            "X-Sensor-Api-Key": API_KEY,
        },
    )
    r.raise_for_status()
    return r.json()

# Exemple
send_reading(soil_moisture=42.5, ph=6.3)`,

  nodejs: `const API_URL = "http://localhost:4000/iot/ingest";
const API_KEY = "sk_votre_cle_api";

async function sendReading(ph, soilMoisture, salinity) {
  const data = {};
  if (ph != null) data.ph = ph;
  if (soilMoisture != null) data.soilMoisture = soilMoisture;
  if (salinity != null) data.salinity = salinity;

  if (Object.keys(data).length === 0) {
    throw new Error("Au moins un paramètre requis");
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sensor-Api-Key": API_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}`,

  esp32: `// ESP32 Arduino - envoi HTTP vers l'API
#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "votre_wifi";
const char* WIFI_PASS = "mot_de_passe";
const char* API_URL = "http://192.168.1.100:4000/iot/ingest";
const char* API_KEY = "sk_votre_cle_api";

void sendReading(float ph, float soilMoisture, float salinity) {
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Sensor-Api-Key", API_KEY);

  String payload = "{";
  if (ph >= 0) payload += "\"ph\":" + String(ph, 2);
  if (soilMoisture >= 0) payload += "\"soilMoisture\":" + String(soilMoisture, 2);
  if (salinity >= 0) payload += "\"salinity\":" + String(salinity, 2);
  payload += "}";

  int code = http.POST(payload);
  http.end();
}`,
};

const TOC = [
  { id: 'intro', label: 'Introduction' },
  { id: 'prerequis', label: 'Prérequis' },
  { id: 'flux', label: 'Flux des données' },
  { id: 'types', label: 'Types de capteurs' },
  { id: 'creation', label: 'Création d\'un capteur' },
  { id: 'api', label: 'Spécification API' },
  { id: 'code', label: 'Exemples de code' },
  { id: 'materiel', label: 'Intégration matériel' },
  { id: 'pratiques', label: 'Bonnes pratiques' },
  { id: 'depannage', label: 'Dépannage' },
  { id: 'faq', label: 'FAQ' },
];

export default function GuideTechniciensPage() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const CodeBlock = ({ id, label, code }: { id: string; label: string; code: string }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-stone-600">{label}</p>
      <div className="relative">
        <pre className="p-5 rounded-2xl bg-stone-100 text-sm overflow-x-auto pr-12 max-h-80 overflow-y-auto">
          {code}
        </pre>
        <button
          onClick={() => copyToClipboard(code, id)}
          className="absolute top-3 right-3 p-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 transition"
          title="Copier"
        >
          {copied === id ? (
            <span className="text-xs text-emerald-600 font-medium">Copié</span>
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <Link
        href="/capteurs"
        className="inline-flex items-center gap-2 text-stone-600 hover:text-emerald-600 transition font-medium mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux capteurs
      </Link>

      <div className="flex items-start gap-4 mb-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-stone-900">
            Documentation complète — Capteurs IoT
          </h1>
          <p className="text-stone-500 mt-2">
            Guide technique ultra-détaillé pour l&apos;implémentation des capteurs sur la plateforme Agriculture Intelligente.
          </p>
        </div>
      </div>

      {/* Table des matières */}
      <nav className="mb-12 p-6 rounded-2xl bg-stone-50 border border-stone-100">
        <h2 className="font-semibold text-stone-800 mb-4">Sommaire</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {TOC.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="space-y-12">
        {/* 1. Introduction */}
        <section id="intro" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <CpuIcon className="w-5 h-5 text-violet-500" />
            1. Introduction
          </h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            Ce guide explique comment connecter des capteurs IoT (pH, humidité, salinité, station météo) à la plateforme Agriculture Intelligente. Les données collectées alimentent automatiquement le profil sol des parcelles, déclenchent des alertes et améliorent les recommandations culturales.
          </p>
          <p className="text-stone-600 leading-relaxed">
            Les capteurs envoient leurs mesures via une API REST HTTP. Aucun protocole propriétaire : une simple requête POST avec une clé API suffit.
          </p>
        </section>

        {/* 2. Prérequis */}
        <section id="prerequis" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            2. Prérequis
          </h2>
          <ul className="list-disc list-inside text-stone-600 space-y-2">
            <li>Migration <code className="bg-stone-100 px-1.5 py-0.5 rounded">20250217000000_add_sensors</code> appliquée : <code className="bg-stone-100 px-1.5 py-0.5 rounded">pnpm db:migrate</code></li>
            <li>Compte <strong>Technicien</strong> ou <strong>Administrateur</strong> pour créer et gérer les capteurs</li>
            <li>Au moins une parcelle créée par un agriculteur (les capteurs doivent être associés à une parcelle)</li>
            <li>Accès réseau à l&apos;API (HTTP/HTTPS)</li>
          </ul>
        </section>

        {/* 3. Flux des données */}
        <section id="flux" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            3. Flux des données
          </h2>
          <div className="p-5 rounded-2xl bg-stone-900 text-stone-100 font-mono text-sm">
            <pre className="whitespace-pre-wrap">{`Capteur physique (terrain)
    ↓
Microcontrôleur / Passerelle (ESP32, Arduino, Raspberry Pi…)
    ↓
Requête HTTP POST vers l'API
    ↓
POST /iot/ingest (header X-Sensor-Api-Key)
    ↓
Profil sol de la parcelle mis à jour (ParcelSoilProfile)
    ↓
→ Alertes (humidité faible, pH hors plage, salinité élevée)
→ Recommandations culturales
→ Affichage sur la page parcelle pour l'agriculteur`}</pre>
          </div>
        </section>

        {/* 4. Types de capteurs */}
        <section id="types" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-violet-500" />
            4. Types de capteurs supportés
          </h2>
          <div className="space-y-6">
            {SENSOR_TYPES_DETAILED.map((s) => (
              <div key={s.code} className="p-6 rounded-2xl bg-white border border-stone-100 shadow-sm">
                <div className="flex gap-4">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                    <Image src={s.img} alt={s.name} fill className="object-cover" sizes="96px" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-stone-900">{s.name}</h3>
                    <code className="text-sm text-stone-500">{s.code}</code>
                    <p className="text-stone-600 text-sm mt-2">{s.usage}</p>
                    <div className="mt-3 overflow-x-auto">
                      <table className="text-sm text-stone-600 border border-stone-200 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-stone-50">
                            <th className="px-3 py-2 text-left">Paramètre</th>
                            <th className="px-3 py-2 text-left">Unité</th>
                            <th className="px-3 py-2 text-left">Plage</th>
                            <th className="px-3 py-2 text-left">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.params.map((p) => (
                            <tr key={p.key} className="border-t border-stone-100">
                              <td className="px-3 py-2 font-mono">{p.key}</td>
                              <td className="px-3 py-2">{p.unit}</td>
                              <td className="px-3 py-2">{p.range}</td>
                              <td className="px-3 py-2">{p.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Création d'un capteur */}
        <section id="creation" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-500" />
            5. Création d&apos;un capteur sur la plateforme
          </h2>
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100">
              <h4 className="font-semibold text-stone-800 mb-2">Étape 1 : Accéder à la page Capteurs</h4>
              <p className="text-stone-600 text-sm">Connectez-vous avec un compte Technicien ou Admin. Menu latéral → Capteurs → Ajouter un capteur.</p>
            </div>
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100">
              <h4 className="font-semibold text-stone-800 mb-2">Étape 2 : Remplir le formulaire</h4>
              <table className="text-sm w-full">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 font-semibold">Champ</th>
                    <th className="py-2 font-semibold">Obligatoire</th>
                    <th className="py-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="text-stone-600">
                  <tr><td className="py-1">Nom</td><td>Oui</td><td>Ex. « Capteur humidité parcelle A »</td></tr>
                  <tr><td className="py-1">Type</td><td>Oui</td><td>SOIL_PH, SOIL_MOISTURE, SOIL_SALINITY, WEATHER_STATION</td></tr>
                  <tr><td className="py-1">Modèle</td><td>Non</td><td>Ex. « Soil Moisture Pro v2 »</td></tr>
                  <tr><td className="py-1">Numéro de série</td><td>Non</td><td>Pour traçabilité</td></tr>
                  <tr><td className="py-1">Parcelle</td><td>Oui</td><td>Parcelle à laquelle associer le capteur</td></tr>
                </tbody>
              </table>
            </div>
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">Étape 3 : Récupérer la clé API</h4>
              <p className="text-amber-700 text-sm">Après création, une clé API au format <code className="bg-amber-100 px-1 rounded">sk_xxx</code> est générée. Conservez-la en lieu sûr. Elle est nécessaire pour chaque envoi de données.</p>
            </div>
          </div>
        </section>

        {/* 6. Spécification API */}
        <section id="api" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-sky-500" />
            6. Spécification API complète
          </h2>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-stone-800 mb-2">Endpoint</h4>
              <div className="p-4 rounded-xl bg-stone-900 text-stone-100 font-mono">
                <span className="text-emerald-400">POST</span> /iot/ingest
              </div>
              <p className="text-stone-500 text-sm mt-1">URL complète : <code>http://localhost:4000/iot/ingest</code> (ou production)</p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-800 mb-2">Headers obligatoires</h4>
              <table className="text-sm w-full border border-stone-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-stone-50">
                    <th className="px-3 py-2 text-left">Header</th>
                    <th className="px-3 py-2 text-left">Description</th>
                  </tr>
                </thead>
                <tbody className="text-stone-600">
                  <tr><td className="px-3 py-2 font-mono">Content-Type</td><td>application/json</td></tr>
                  <tr><td className="px-3 py-2 font-mono">X-Sensor-Api-Key</td><td>Clé API du capteur (sk_xxx)</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="font-semibold text-stone-800 mb-2">Corps (JSON)</h4>
              <p className="text-stone-600 text-sm mb-2">Au moins un des paramètres suivants requis :</p>
              <table className="text-sm w-full border border-stone-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-stone-50">
                    <th className="px-3 py-2 text-left">Clé</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Plage</th>
                  </tr>
                </thead>
                <tbody className="text-stone-600">
                  <tr><td className="px-3 py-2 font-mono">ph</td><td>number</td><td>0–14</td></tr>
                  <tr><td className="px-3 py-2 font-mono">soilMoisture</td><td>number</td><td>0–100</td></tr>
                  <tr><td className="px-3 py-2 font-mono">salinity</td><td>number</td><td>≥ 0</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="font-semibold text-stone-800 mb-2">Réponses et codes d&apos;erreur</h4>
              <table className="text-sm w-full border border-stone-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-stone-50">
                    <th className="px-3 py-2 text-left">Code HTTP</th>
                    <th className="px-3 py-2 text-left">Code erreur</th>
                    <th className="px-3 py-2 text-left">Message</th>
                  </tr>
                </thead>
                <tbody className="text-stone-600">
                  <tr className="bg-emerald-50"><td className="px-3 py-2">200</td><td>—</td><td>Succès : {"{ \"success\": true }"}</td></tr>
                  <tr><td className="px-3 py-2">400</td><td>NO_DATA</td><td>Aucune donnée à ingérer</td></tr>
                  <tr><td className="px-3 py-2">400</td><td>—</td><td>Validation échouée (valeurs hors plage)</td></tr>
                  <tr><td className="px-3 py-2">401</td><td>MISSING_API_KEY</td><td>Header X-Sensor-Api-Key requis</td></tr>
                  <tr><td className="px-3 py-2">401</td><td>INVALID_API_KEY</td><td>Clé invalide ou capteur inactif</td></tr>
                </tbody>
              </table>
              <p className="text-stone-500 text-xs mt-2">Exemple d&apos;erreur : {"{ \"statusCode\": 401, \"code\": \"INVALID_API_KEY\", \"message\": \"Clé API invalide ou capteur inactif\" }"}</p>
            </div>
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-200">
              <h4 className="font-semibold text-sky-800 mb-1">Sécurité en production</h4>
              <p className="text-sky-700 text-sm">Utilisez HTTPS pour éviter l&apos;interception de la clé API. Ne jamais exposer la clé dans des logs ou dépôts publics.</p>
            </div>
          </div>
        </section>

        {/* 7. Exemples de code */}
        <section id="code" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-violet-500" />
            7. Exemples de code
          </h2>
          <div className="space-y-6">
            <CodeBlock id="curl" label="cURL" code={CODE_EXAMPLES.curl} />
            <CodeBlock id="python" label="Python" code={CODE_EXAMPLES.python} />
            <CodeBlock id="nodejs" label="Node.js / JavaScript" code={CODE_EXAMPLES.nodejs} />
            <CodeBlock id="esp32" label="ESP32 / Arduino" code={CODE_EXAMPLES.esp32} />
          </div>
        </section>

        {/* 8. Intégration matériel */}
        <section id="materiel" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <CpuIcon className="w-5 h-5 text-violet-500" />
            8. Intégration matériel
          </h2>
          <div className="space-y-4 text-stone-600">
            <p><strong>ESP32 / Arduino</strong> : Utilisez le client HTTP (WiFiClient ou HTTPClient). Envoyez une requête POST toutes les 15–60 minutes selon la variabilité des mesures.</p>
            <p><strong>Raspberry Pi</strong> : Script Python avec <code className="bg-stone-100 px-1 rounded">requests</code></p>
            <p><strong>Passerelle LoRa / Sigfox</strong> : La passerelle doit agréger les données et les envoyer vers l&apos;API via HTTP.</p>
            <p><strong>Fréquence recommandée</strong> : 15 min à 1 h pour le sol. Éviter plus de 1 requête par minute.</p>
          </div>
        </section>

        {/* 9. Bonnes pratiques */}
        <section id="pratiques" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            9. Bonnes pratiques
          </h2>
          <ul className="list-disc list-inside text-stone-600 space-y-2">
            <li>Ne jamais exposer la clé API dans le code source public (variables d&apos;environnement)</li>
            <li>En cas de compromission : régénérer la clé depuis la page de modification du capteur</li>
            <li>Arrondir les valeurs à 2 décimales (ph, soilMoisture, salinity)</li>
            <li>Implémenter une logique de retry en cas d&apos;échec réseau (3 tentatives max)</li>
            <li>Logger les erreurs côté capteur pour le dépannage</li>
          </ul>
        </section>

        {/* 10. Dépannage */}
        <section id="depannage" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            10. Dépannage
          </h2>
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100">
              <h4 className="font-semibold text-stone-800">« Clé API invalide ou capteur inactif »</h4>
              <p className="text-stone-600 text-sm mt-1">Vérifiez la clé (sans espaces, copie exacte). Vérifiez que le capteur est actif dans la plateforme.</p>
            </div>
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100">
              <h4 className="font-semibold text-stone-800">« Aucune donnée à ingérer »</h4>
              <p className="text-stone-600 text-sm mt-1">Envoyez au moins un des paramètres : ph, soilMoisture ou salinity. Le corps JSON ne doit pas être vide.</p>
            </div>
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100">
              <h4 className="font-semibold text-stone-800">Les données n&apos;apparaissent pas sur la parcelle</h4>
              <p className="text-stone-600 text-sm mt-1">Vérifiez l&apos;association parcelle/capteur. Consultez la date de dernière lecture sur la page du capteur.</p>
            </div>
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100">
              <h4 className="font-semibold text-stone-800">« Aucune parcelle disponible »</h4>
              <p className="text-stone-600 text-sm mt-1">Les parcelles doivent exister et être créées par les agriculteurs. Vérifiez qu&apos;au moins une exploitation et une parcelle existent.</p>
            </div>
          </div>
        </section>

        {/* 11. FAQ */}
        <section id="faq" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-sky-500" />
            11. FAQ
          </h2>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-stone-800">Puis-je envoyer plusieurs paramètres en une seule requête ?</h4>
              <p className="text-stone-600 text-sm">Oui. Envoyez ph, soilMoisture et salinity dans le même JSON selon les mesures disponibles.</p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-800">L&apos;API nécessite-t-elle une authentification utilisateur ?</h4>
              <p className="text-stone-600 text-sm">Non. L&apos;endpoint /iot/ingest est public. Seule la clé API du capteur (X-Sensor-Api-Key) est requise.</p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-800">Que se passe-t-il si j&apos;envoie des valeurs hors plage ?</h4>
              <p className="text-stone-600 text-sm">ph : 0–14, soilMoisture : 0–100. Les valeurs hors plage sont rejetées (validation 400).</p>
            </div>
            <div>
              <h4 className="font-semibold text-stone-800">Comment régénérer la clé API ?</h4>
              <p className="text-stone-600 text-sm">Ouvrez la page de modification du capteur → Régénérer. L&apos;ancienne clé ne fonctionne plus immédiatement.</p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-12 p-6 rounded-2xl bg-stone-50 border border-stone-100">
        <p className="text-sm text-stone-500">
          Documentation complète : <code className="bg-stone-200 px-2 py-1 rounded">docs/GUIDE_CAPTEURS.md</code> dans le projet.
        </p>
      </div>
    </div>
  );
}
