import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'lyissa1928@gmail.com';
const ADMIN_PASSWORD = 'Passer@12345';

const REGIONS_SENEGAL = [
  { name: 'Dakar', code: 'DK', zone: 'Ouest' },
  { name: 'Thiès', code: 'TH', zone: 'Ouest' },
  { name: 'Diourbel', code: 'DB', zone: 'Centre' },
  { name: 'Fatick', code: 'FK', zone: 'Centre' },
  { name: 'Kaolack', code: 'KL', zone: 'Centre' },
  { name: 'Kaffrine', code: 'KF', zone: 'Centre' },
  { name: 'Saint-Louis', code: 'SL', zone: 'Nord' },
  { name: 'Louga', code: 'LG', zone: 'Nord' },
  { name: 'Matam', code: 'MT', zone: 'Nord' },
  { name: 'Tambacounda', code: 'TC', zone: 'Est' },
  { name: 'Kédougou', code: 'KG', zone: 'Est' },
  { name: 'Kolda', code: 'KD', zone: 'Sud' },
  { name: 'Sédhiou', code: 'SE', zone: 'Sud' },
  { name: 'Ziguinchor', code: 'ZG', zone: 'Sud' },
];

async function main() {
  console.log('Seeding admin principal...');
  const passwordHash = await argon2.hash(ADMIN_PASSWORD);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL.toLowerCase() },
    create: {
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    update: { passwordHash, role: 'ADMIN', isActive: true },
  });
  console.log('Admin principal créé :', ADMIN_EMAIL);

  console.log('Seeding regions...');
  for (const region of REGIONS_SENEGAL) {
    await prisma.region.upsert({
      where: { code: region.code },
      create: { ...region, isActive: true },
      update: { name: region.name, zone: region.zone },
    });
  }
  console.log(`Seeded ${REGIONS_SENEGAL.length} regions.`);

  const CROPS = [
    { name: 'Riz', scientificName: 'Oryza sativa', category: 'CEREAL', planting: [6, 7, 8], harvest: [10, 11] },
    { name: 'Arachide', scientificName: 'Arachis hypogaea', category: 'LEGUME', planting: [6, 7], harvest: [9, 10] },
    { name: 'Mil', scientificName: 'Pennisetum glaucum', category: 'CEREAL', planting: [6, 7], harvest: [10, 11] },
    { name: 'Sorgho', scientificName: 'Sorghum bicolor', category: 'CEREAL', planting: [6, 7], harvest: [10, 11] },
    { name: 'Maïs', scientificName: 'Zea mays', category: 'CEREAL', planting: [6, 7], harvest: [9, 10] },
    { name: 'Tomate', scientificName: 'Solanum lycopersicum', category: 'VEGETABLE', planting: [9, 10, 11], harvest: [1, 2, 3] },
    { name: 'Oignon', scientificName: 'Allium cepa', category: 'VEGETABLE', planting: [11, 12, 1], harvest: [3, 4, 5] },
    { name: 'Mangue', scientificName: 'Mangifera indica', category: 'FRUIT', planting: [6, 7, 8], harvest: [4, 5, 6] },
    { name: 'Anacarde', scientificName: 'Anacardium occidentale', category: 'FRUIT', planting: [6, 7], harvest: [3, 4, 5] },
    { name: 'Pastèque', scientificName: 'Citrullus lanatus', category: 'VEGETABLE', planting: [1, 2, 3, 11, 12], harvest: [3, 4, 5, 1, 2] },
    { name: 'Niébé', scientificName: 'Vigna unguiculata', category: 'LEGUME', planting: [7, 8], harvest: [10, 11] },
  ];

  console.log('Seeding crops...');
  const cropIds: Record<string, string> = {};
  for (const c of CROPS) {
    const crop = await prisma.crop.upsert({
      where: { name: c.name },
      create: {
        name: c.name,
        scientificName: c.scientificName,
        category: c.category,
        defaultPlantingMonths: c.planting,
        defaultHarvestMonths: c.harvest,
      },
      update: { scientificName: c.scientificName, category: c.category },
    });
    cropIds[c.name] = crop.id;
  }
  console.log(`Seeded ${CROPS.length} crops.`);

  const regions = await prisma.region.findMany();
  const regionByCode = Object.fromEntries(regions.map((r) => [r.code, r.id]));

  console.log('Seeding crop requirements...');
  const requirements = [
    { crop: 'Riz', regionCodes: ['SL', 'ZG'], season: 'RAINY' as const, phMin: 5, phMax: 7.5, rainfallMin: 800, rainfallMax: 2500, tempMin: 20, tempMax: 35 },
    { crop: 'Arachide', regionCodes: ['KL', 'DB', 'FK'], season: 'RAINY' as const, phMin: 5.5, phMax: 7.5, rainfallMin: 500, rainfallMax: 1200, tempMin: 22, tempMax: 35 },
    { crop: 'Mil', regionCodes: ['KL', 'DB', 'FK', 'KF'], season: 'RAINY' as const, phMin: 5, phMax: 8, rainfallMin: 300, rainfallMax: 800, tempMin: 20, tempMax: 38 },
    { crop: 'Sorgho', regionCodes: ['KL', 'DB', 'FK'], season: 'RAINY' as const, phMin: 5.5, phMax: 8.5, rainfallMin: 400, rainfallMax: 900, tempMin: 21, tempMax: 35 },
    { crop: 'Maïs', regionCodes: [], season: 'RAINY' as const, phMin: 5.5, phMax: 7.5, rainfallMin: 500, rainfallMax: 1500, tempMin: 18, tempMax: 35 },
    { crop: 'Tomate', regionCodes: [], season: 'DRY' as const, phMin: 5.5, phMax: 7, rainfallMin: 0, rainfallMax: 600, tempMin: 15, tempMax: 32 },
    { crop: 'Oignon', regionCodes: [], season: 'DRY' as const, phMin: 6, phMax: 7.5, rainfallMin: 0, rainfallMax: 500, tempMin: 13, tempMax: 28 },
    { crop: 'Mangue', regionCodes: ['ZG', 'KD', 'SE'], season: 'ANY' as const, phMin: 5.5, phMax: 7.5, rainfallMin: 500, rainfallMax: 2500, tempMin: 20, tempMax: 38 },
    { crop: 'Anacarde', regionCodes: ['ZG', 'KD', 'SE', 'KG'], season: 'ANY' as const, phMin: 5, phMax: 7.5, rainfallMin: 600, rainfallMax: 2000, tempMin: 22, tempMax: 38 },
    { crop: 'Pastèque', regionCodes: [], season: 'DRY' as const, phMin: 5.5, phMax: 7, rainfallMin: 0, rainfallMax: 400, tempMin: 20, tempMax: 35 },
    { crop: 'Niébé', regionCodes: [], season: 'RAINY' as const, phMin: 5.5, phMax: 7.5, rainfallMin: 400, rainfallMax: 1000, tempMin: 20, tempMax: 35 },
  ];

  for (const req of requirements) {
    const cropId = cropIds[req.crop];
    if (!cropId) continue;
    const regionIds: (string | null)[] = req.regionCodes.length > 0
      ? req.regionCodes.map((c) => regionByCode[c]).filter((id): id is string => Boolean(id))
      : [null];
    for (const rid of regionIds) {
      const data = {
        cropId,
        regionId: rid,
        season: req.season,
        phMin: req.phMin,
        phMax: req.phMax,
        rainfallMinMm: req.rainfallMin,
        rainfallMaxMm: req.rainfallMax,
        tempMinC: req.tempMin,
        tempMaxC: req.tempMax,
        notes: 'Règle initiale V1',
      };
      if (rid === null) {
        const existing = await prisma.cropRequirement.findFirst({
          where: { cropId, regionId: null, season: req.season, version: 1 },
        });
        if (!existing) {
          await prisma.cropRequirement.create({ data });
        }
      } else {
        await prisma.cropRequirement.upsert({
          where: {
            cropId_regionId_season_version: {
              cropId,
              regionId: rid,
              season: req.season,
              version: 1,
            },
          },
          create: data,
          update: { notes: 'Règle initiale V1' },
        });
      }
    }
  }
  console.log('Seeded crop requirements.');

  console.log('Seeding alert rules...');
  const alertRules = [
    { type: 'SOIL_MOISTURE_LOW', severity: 'WARNING', conditions: { metric: 'soilMoisture', operator: '<', value: 35 }, windowDays: null, cooldownHours: 24, messageTemplate: 'Humidite du sol faible: {{soilMoisture}}% (seuil: {{threshold}}%)' },
    { type: 'SOIL_SALINITY_HIGH', severity: 'WARNING', conditions: { metric: 'salinity', operator: '>', value: 4 }, windowDays: null, cooldownHours: 48, messageTemplate: 'Salinite elevee: {{salinity}} dS/m (seuil: {{threshold}})' },
    { type: 'SOIL_PH_OUT_OF_RANGE', severity: 'WARNING', conditions: { metric: 'ph', operator: '<', value: 5.5 }, windowDays: null, cooldownHours: 24, messageTemplate: 'pH trop bas: {{ph}} (optimum > 5.5)' },
    { type: 'HEAT_WAVE_RISK', severity: 'CRITICAL', conditions: { metric: 'tempMaxDays', operator: '>', value: 40, days: 3 }, windowDays: 3, cooldownHours: 24, messageTemplate: 'Risque vague de chaleur: Tmax {{tempMaxDays}}°C sur 3 jours (seuil 40°C)' },
    { type: 'HEAVY_RAIN_RISK', severity: 'WARNING', conditions: { metric: 'rainfallSumDays', operator: '>', value: 60, days: 2 }, windowDays: 2, cooldownHours: 12, messageTemplate: 'Forte pluie: {{rainfallSumDays}}mm en 2 jours (seuil 60mm)' },
    { type: 'DROUGHT_RISK', severity: 'WARNING', conditions: { metric: 'rainfallSumDays', operator: '<', value: 10, days: 14 }, windowDays: 14, cooldownHours: 48, messageTemplate: 'Risque secheresse: {{rainfallSumDays}}mm en 14 jours (seuil 10mm)' },
  ];
  for (const r of alertRules) {
    const existing = await prisma.alertRule.findFirst({
      where: { type: r.type, scope: 'GLOBAL' },
    });
    if (!existing) {
      await prisma.alertRule.create({
        data: {
          scope: 'GLOBAL',
          type: r.type,
          severity: r.severity,
          conditions: r.conditions as object,
          windowDays: r.windowDays,
          cooldownHours: r.cooldownHours,
          messageTemplate: r.messageTemplate,
        },
      });
    }
  }
  console.log('Seeded alert rules.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
