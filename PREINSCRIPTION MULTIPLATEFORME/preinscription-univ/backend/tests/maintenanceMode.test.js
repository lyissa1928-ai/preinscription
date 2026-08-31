const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('maintenanceMode', () => {
  let prev;

  beforeEach(() => {
    prev = process.env.MAINTENANCE_MODE;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.MAINTENANCE_MODE;
    else process.env.MAINTENANCE_MODE = prev;
    delete require.cache[require.resolve('../utils/maintenanceMode')];
  });

  it('détecte MAINTENANCE_MODE', () => {
    process.env.MAINTENANCE_MODE = '1';
    delete require.cache[require.resolve('../utils/maintenanceMode')];
    const { isMaintenanceModeEnabled } = require('../utils/maintenanceMode');
    assert.equal(isMaintenanceModeEnabled(), true);
  });
});
