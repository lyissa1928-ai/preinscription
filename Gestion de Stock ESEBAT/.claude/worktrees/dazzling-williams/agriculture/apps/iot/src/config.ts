export const config = {
  mqttEnabled: process.env.IOT_MQTT_ENABLED === 'true',
  mqttBroker: process.env.IOT_MQTT_BROKER || 'mqtt://localhost:1883',
};
