/**
 * Service IoT - Agriculture Intelligente
 * MQTT consumer + simulateur (à venir)
 */
import { config } from './config';

function main() {
  console.log('[IoT] Service démarré');
  console.log('[IoT] MQTT enabled:', config.mqttEnabled);
  console.log('[IoT] Broker:', config.mqttBroker);
  // TODO: Connexion MQTT et traitement des messages
}

main();
