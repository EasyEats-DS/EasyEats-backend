'use strict';

/**
 * One-time repair: stored positions are [latitude, longitude], but the
 * 2dsphere indexes on users and restaurants require GeoJSON [longitude,
 * latitude]. Every $near query against this data has therefore been measuring
 * distances at a point on the other side of the planet, which is why
 * "nearby drivers" returned nothing.
 *
 *   Preview:  node src/scripts/fixCoordinateOrder.js
 *   Apply:    node src/scripts/fixCoordinateOrder.js --apply
 *
 * Idempotent: each repaired document is stamped `geoCoordinateOrder: 'geojson'`
 * and skipped on later runs, so running it twice cannot swap the values back.
 *
 * Take a database backup before applying. This rewrites stored data.
 */

const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

const USERS_URI = process.env.USERS_MONGO_URI || process.env.MONGO_URI;
const RESTAURANTS_URI =
  process.env.RESTAURANTS_MONGO_URI ||
  (USERS_URI && USERS_URI.replace('EasyEatsDB_users', 'EasyEatsDB_resturants'));

const MARKER = 'geojson';

/** Documents still holding the old [lat, lng] order. */
const needsRepair = {
  'position.coordinates': { $exists: true, $type: 'array' },
  geoCoordinateOrder: { $ne: MARKER },
};

async function repairCollection(connection, collectionName, label) {
  const collection = connection.collection(collectionName);
  const documents = await collection
    .find(needsRepair)
    .project({ position: 1, name: 1, firstName: 1, lastName: 1, role: 1 })
    .toArray();

  if (documents.length === 0) {
    console.log(`${label}: nothing to repair.`);
    return 0;
  }

  console.log(`\n${label}: ${documents.length} document(s) to repair`);

  const operations = [];

  for (const document of documents) {
    const coordinates = document.position?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      console.log(`  skip ${document._id} (coordinates are not a pair)`);
      continue;
    }

    const [first, second] = coordinates.map(Number);
    if (Number.isNaN(first) || Number.isNaN(second)) {
      console.log(`  skip ${document._id} (non-numeric coordinates)`);
      continue;
    }

    const swapped = [second, first];
    const name =
      document.name || [document.firstName, document.lastName].filter(Boolean).join(' ') || document._id;

    console.log(
      `  ${name}: [${first}, ${second}] -> [${swapped[0]}, ${swapped[1]}]`,
    );

    operations.push({
      updateOne: {
        filter: { _id: document._id },
        update: {
          $set: { 'position.coordinates': swapped, geoCoordinateOrder: MARKER },
        },
      },
    });
  }

  if (!APPLY) {
    console.log(`${label}: preview only, nothing written.`);
    return operations.length;
  }

  if (operations.length > 0) {
    const result = await collection.bulkWrite(operations);
    console.log(`${label}: ${result.modifiedCount} document(s) updated.`);
  }

  return operations.length;
}

async function main() {
  if (!USERS_URI) {
    console.error('Set MONGO_URI (or USERS_MONGO_URI) before running this script.');
    process.exit(1);
  }

  console.log(APPLY ? 'Applying coordinate repair...' : 'Previewing coordinate repair (no writes).');

  const usersConnection = await mongoose.createConnection(USERS_URI).asPromise();
  await repairCollection(usersConnection, 'users', 'users');
  await usersConnection.close();

  if (RESTAURANTS_URI) {
    const restaurantsConnection = await mongoose.createConnection(RESTAURANTS_URI).asPromise();
    // The collection is spelled the way the service spells it.
    const names = (await restaurantsConnection.db.listCollections().toArray()).map((c) => c.name);
    const collectionName = names.find((name) => /^rest?u?u?rants$/i.test(name) || /restur?ants/i.test(name));

    if (collectionName) {
      await repairCollection(restaurantsConnection, collectionName, `restaurants (${collectionName})`);
    } else {
      console.warn(`Could not find a restaurants collection. Saw: ${names.join(', ')}`);
    }

    await restaurantsConnection.close();
  }

  if (!APPLY) {
    console.log('\nRe-run with --apply to write these changes.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Coordinate repair failed:', error);
    process.exit(1);
  });
