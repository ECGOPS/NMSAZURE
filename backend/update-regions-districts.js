const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config({ path: __dirname + '/.env' });

console.log('COSMOS_DB_ENDPOINT:', process.env.COSMOS_DB_ENDPOINT);
console.log('COSMOS_DB_KEY:', process.env.COSMOS_DB_KEY ? 'set' : 'not set');
console.log('COSMOS_DB_DATABASE:', process.env.COSMOS_DB_DATABASE);

// Cosmos DB connection
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const regionsContainerId = 'regions';
const districtsContainerId = 'districts';

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const regionsContainer = database.container(regionsContainerId);
const districtsContainer = database.container(districtsContainerId);

// New data structure based on user's requirements
const newRegions = [
  { id: 'subtransmission-accra', name: 'SUBTRANSMISSION ACCRA', code: 'STA' },
  { id: 'subtransmission-ashanti', name: 'SUBTRANSMISSION ASHANTI', code: 'STASH' },
  { id: 'accra-east', name: 'ACCRA EAST REGION', code: 'AER' },
  { id: 'accra-west', name: 'ACCRA WEST REGION', code: 'AWR' },
  { id: 'ashanti-east', name: 'ASHANTI EAST REGION', code: 'ASHER' },
  { id: 'ashanti-west', name: 'ASHANTI WEST REGION', code: 'ASHWR' },
  { id: 'ashanti-south', name: 'ASHANTI SOUTH REGION', code: 'ASHSR' },
  { id: 'central', name: 'CENTRAL REGION', code: 'CR' },
  { id: 'eastern', name: 'EASTERN REGION', code: 'ER' },
  { id: 'tema', name: 'TEMA REGION', code: 'TR' },
  { id: 'volta', name: 'VOLTA REGION', code: 'VR' },
  { id: 'western', name: 'WESTERN REGION', code: 'WR' }
];

const newDistricts = [
  // SUBTRANSMISSION ACCRA
  { id: 'district-1', name: 'SUBSTATION MAINTENANCE', regionId: 'subtransmission-accra', code: 'STA-SM' },
  { id: 'district-2', name: 'CONTROL OPERATIONS', regionId: 'subtransmission-accra', code: 'STA-CO' },
  { id: 'district-3', name: 'NETWORK MAINTENANCE', regionId: 'subtransmission-accra', code: 'STA-NM' },
  { id: 'district-4', name: 'PROTECTION MAINTENANCE', regionId: 'subtransmission-accra', code: 'STA-PM' },

  // SUBTRANSMISSION ASHANTI
  { id: 'district-5', name: 'SUBSTATION MAINTENANCE', regionId: 'subtransmission-ashanti', code: 'STASH-SM' },
  { id: 'district-6', name: 'CONTROL OPERATIONS', regionId: 'subtransmission-ashanti', code: 'STASH-CO' },
  { id: 'district-7', name: 'NETWORK MAINTENANCE', regionId: 'subtransmission-ashanti', code: 'STASH-NM' },
  { id: 'district-8', name: 'PROTECTION MAINTENANCE', regionId: 'subtransmission-ashanti', code: 'STASH-PM' },

  // ACCRA EAST REGION
  { id: 'district-9', name: 'ADENTA', regionId: 'accra-east', code: 'AER-AD' },
  { id: 'district-10', name: 'DODOWA', regionId: 'accra-east', code: 'AER-DD' },
  { id: 'district-11', name: 'KWABENYA', regionId: 'accra-east', code: 'AER-KW' },
  { id: 'district-12', name: 'LEGON', regionId: 'accra-east', code: 'AER-LE' },
  { id: 'district-13', name: 'MAKOLA', regionId: 'accra-east', code: 'AER-MA' },
  { id: 'district-14', name: 'AKWAPIM MAMPONG', regionId: 'accra-east', code: 'AER-AM' },
  { id: 'district-15', name: 'ROMAN RIDGE', regionId: 'accra-east', code: 'AER-RR' },
  { id: 'district-16', name: 'TESHIE', regionId: 'accra-east', code: 'AER-TE' },

  // ACCRA WEST REGION
  { id: 'district-17', name: 'ABLEKUMA', regionId: 'accra-west', code: 'AWR-AB' },
  { id: 'district-18', name: 'ACHIMOTA', regionId: 'accra-west', code: 'AWR-AC' },
  { id: 'district-19', name: 'AMASAMAN', regionId: 'accra-west', code: 'AWR-AM' },
  { id: 'district-20', name: 'BORTIANOR', regionId: 'accra-west', code: 'AWR-BO' },
  { id: 'district-21', name: 'DANSOMAN', regionId: 'accra-west', code: 'AWR-DA' },
  { id: 'district-22', name: 'KANESHIE', regionId: 'accra-west', code: 'AWR-KA' },
  { id: 'district-23', name: 'KORLE-BU', regionId: 'accra-west', code: 'AWR-KO' },
  { id: 'district-24', name: 'NSAWAM', regionId: 'accra-west', code: 'AWR-NS' },

  // ASHANTI EAST REGION
  { id: 'district-25', name: 'AYIGYA', regionId: 'ashanti-east', code: 'ASHER-AY' },
  { id: 'district-26', name: 'EFFIDUASE', regionId: 'ashanti-east', code: 'ASHER-EF' },
  { id: 'district-27', name: 'EJISU', regionId: 'ashanti-east', code: 'ASHER-EJ' },
  { id: 'district-28', name: 'KONONGO', regionId: 'ashanti-east', code: 'ASHER-KO' },
  { id: 'district-29', name: 'KWABRE', regionId: 'ashanti-east', code: 'ASHER-KW' },
  { id: 'district-30', name: 'MAMPONG', regionId: 'ashanti-east', code: 'ASHER-MA' },
  { id: 'district-31', name: 'MANHYIA', regionId: 'ashanti-east', code: 'ASHER-MH' },

  // ASHANTI WEST REGION
  { id: 'district-32', name: 'ABUAKWA', regionId: 'ashanti-west', code: 'ASHWR-AB' },
  { id: 'district-33', name: 'ADUM', regionId: 'ashanti-west', code: 'ASHWR-AD' },
  { id: 'district-34', name: 'AHINSAN', regionId: 'ashanti-west', code: 'ASHWR-AH' },
  { id: 'district-35', name: 'BIBIANI', regionId: 'ashanti-west', code: 'ASHWR-BI' },
  { id: 'district-36', name: 'DANYAME', regionId: 'ashanti-west', code: 'ASHWR-DA' },
  { id: 'district-37', name: 'KOKOBEN', regionId: 'ashanti-west', code: 'ASHWR-KO' },
  { id: 'district-38', name: 'SUAME', regionId: 'ashanti-west', code: 'ASHWR-SU' },
  { id: 'district-39', name: 'OFFINSO', regionId: 'ashanti-west', code: 'ASHWR-OF' },

  // ASHANTI SOUTH REGION
  { id: 'district-40', name: 'ASOKWA', regionId: 'ashanti-south', code: 'ASHSR-AS' },
  { id: 'district-41', name: 'BEKWAI', regionId: 'ashanti-south', code: 'ASHSR-BE' },
  { id: 'district-42', name: 'DUNKWA', regionId: 'ashanti-south', code: 'ASHSR-DU' },
  { id: 'district-43', name: 'MANSO NKWANTA', regionId: 'ashanti-south', code: 'ASHSR-MN' },
  { id: 'district-44', name: 'NEW EDUBIASE', regionId: 'ashanti-south', code: 'ASHSR-NE' },
  { id: 'district-45', name: 'OBUASI', regionId: 'ashanti-south', code: 'ASHSR-OB' },

  // CENTRAL REGION
  { id: 'district-46', name: 'AGONA SWEDRU', regionId: 'central', code: 'CR-AS' },
  { id: 'district-47', name: 'AJUMAKO', regionId: 'central', code: 'CR-AJ' },
  { id: 'district-48', name: 'ASSIN FOSO', regionId: 'central', code: 'CR-AF' },
  { id: 'district-49', name: 'BREMAN ASIKUMA', regionId: 'central', code: 'CR-BA' },
  { id: 'district-50', name: 'CAPE COAST', regionId: 'central', code: 'CR-CC' },
  { id: 'district-51', name: 'KASOA NORTH', regionId: 'central', code: 'CR-KN' },
  { id: 'district-52', name: 'KASOA SOUTH', regionId: 'central', code: 'CR-KS' },
  { id: 'district-53', name: 'SALTPOND', regionId: 'central', code: 'CR-SA' },
  { id: 'district-54', name: 'TWIFU PRASO', regionId: 'central', code: 'CR-TP' },
  { id: 'district-55', name: 'WINNEBA', regionId: 'central', code: 'CR-WI' },

  // EASTERN REGION
  { id: 'district-56', name: 'AKIM ODA', regionId: 'eastern', code: 'ER-AO' },
  { id: 'district-57', name: 'AKIM TAFO', regionId: 'eastern', code: 'ER-AT' },
  { id: 'district-58', name: 'AKWATIA', regionId: 'eastern', code: 'ER-AK' },
  { id: 'district-59', name: 'ASAMANKESE', regionId: 'eastern', code: 'ER-AS' },
  { id: 'district-60', name: 'BEGORO', regionId: 'eastern', code: 'ER-BE' },
  { id: 'district-61', name: 'DONKORKROM', regionId: 'eastern', code: 'ER-DO' },
  { id: 'district-62', name: 'KADE', regionId: 'eastern', code: 'ER-KA' },
  { id: 'district-63', name: 'KIBI', regionId: 'eastern', code: 'ER-KI' },
  { id: 'district-64', name: 'KOFORIDUA', regionId: 'eastern', code: 'ER-KO' },
  { id: 'district-65', name: 'MPRAESO', regionId: 'eastern', code: 'ER-MP' },
  { id: 'district-66', name: 'NEW ABIREM', regionId: 'eastern', code: 'ER-NA' },
  { id: 'district-67', name: 'NKAWKAW', regionId: 'eastern', code: 'ER-NK' },
  { id: 'district-68', name: 'SUHUM', regionId: 'eastern', code: 'ER-SU' },
  { id: 'district-69', name: 'ASESEWA', regionId: 'eastern', code: 'ER-AS' },

  // TEMA REGION
  { id: 'district-70', name: 'ADA', regionId: 'tema', code: 'TR-AD' },
  { id: 'district-71', name: 'AFIENYA', regionId: 'tema', code: 'TR-AF' },
  { id: 'district-72', name: 'ASHAIMAN', regionId: 'tema', code: 'TR-AS' },
  { id: 'district-73', name: 'JUAPONG', regionId: 'tema', code: 'TR-JU' },
  { id: 'district-74', name: 'KROBO', regionId: 'tema', code: 'TR-KR' },
  { id: 'district-75', name: 'NUNGUA', regionId: 'tema', code: 'TR-NU' },
  { id: 'district-76', name: 'PRAMPRAM', regionId: 'tema', code: 'TR-PR' },
  { id: 'district-77', name: 'TEMA NORTH', regionId: 'tema', code: 'TR-TN' },
  { id: 'district-78', name: 'TEMA SOUTH', regionId: 'tema', code: 'TR-TS' },

  // VOLTA REGION
  { id: 'district-79', name: 'AKATSI', regionId: 'volta', code: 'VR-AK' },
  { id: 'district-80', name: 'DAMBAI', regionId: 'volta', code: 'VR-DA' },
  { id: 'district-81', name: 'DENU', regionId: 'volta', code: 'VR-DE' },
  { id: 'district-82', name: 'HO', regionId: 'volta', code: 'VR-HO' },
  { id: 'district-83', name: 'HOHOE', regionId: 'volta', code: 'VR-HH' },
  { id: 'district-84', name: 'JASIKAN', regionId: 'volta', code: 'VR-JA' },
  { id: 'district-85', name: 'KETA', regionId: 'volta', code: 'VR-KE' },
  { id: 'district-86', name: 'KPANDU', regionId: 'volta', code: 'VR-KP' },
  { id: 'district-87', name: 'KPEVE', regionId: 'volta', code: 'VR-KV' },
  { id: 'district-88', name: 'NKWANTA', regionId: 'volta', code: 'VR-NK' },
  { id: 'district-89', name: 'SOGAKOPE', regionId: 'volta', code: 'VR-SO' },

  // WESTERN REGION
  { id: 'district-90', name: 'AGONA', regionId: 'western', code: 'WR-AG' },
  { id: 'district-91', name: 'ASANKRAGUA', regionId: 'western', code: 'WR-AS' },
  { id: 'district-92', name: 'AXIM', regionId: 'western', code: 'WR-AX' },
  { id: 'district-93', name: 'BOGOSO', regionId: 'western', code: 'WR-BO' },
  { id: 'district-94', name: 'ENCHI', regionId: 'western', code: 'WR-EN' },
  { id: 'district-95', name: 'HALF ASSINI', regionId: 'western', code: 'WR-HA' },
  { id: 'district-96', name: 'SEFWI WIAWSO', regionId: 'western', code: 'WR-SW' },
  { id: 'district-97', name: 'JUABESO', regionId: 'western', code: 'WR-JU' },
  { id: 'district-98', name: 'SEKONDI', regionId: 'western', code: 'WR-SE' },
  { id: 'district-99', name: 'TAKORADI', regionId: 'western', code: 'WR-TA' },
  { id: 'district-100', name: 'TARKWA', regionId: 'western', code: 'WR-TK' }
];

async function updateRegionsAndDistricts() {
  try {
    console.log('Starting to update regions and districts...');

    // Delete all existing regions
    console.log('Deleting existing regions...');
    const { resources: existingRegions } = await regionsContainer.items.readAll().fetchAll();
    for (const region of existingRegions) {
      try {
        await regionsContainer.item(region.id, region.id).delete();
        console.log(`Deleted region: ${region.id}`);
      } catch (error) {
        console.error(`Error deleting region ${region.id}:`, error.message);
      }
    }

    // Delete all existing districts
    console.log('Deleting existing districts...');
    const { resources: existingDistricts } = await districtsContainer.items.readAll().fetchAll();
    for (const district of existingDistricts) {
      try {
        await districtsContainer.item(district.id, district.id).delete();
        console.log(`Deleted district: ${district.id}`);
      } catch (error) {
        console.error(`Error deleting district ${district.id}:`, error.message);
      }
    }

    // Create new regions
    console.log('Creating new regions...');
    for (const region of newRegions) {
      try {
        await regionsContainer.items.create(region);
        console.log(`Created region: ${region.id} - ${region.name}`);
      } catch (error) {
        console.error(`Error creating region ${region.id}:`, error.message);
      }
    }

    // Create new districts
    console.log('Creating new districts...');
    for (const district of newDistricts) {
      try {
        // Add population data structure
        const districtWithPopulation = {
          ...district,
          population: {
            rural: null,
            urban: null,
            metro: null
          },
          populationHistory: [],
          updatedAt: {
            _seconds: Math.floor(Date.now() / 1000),
            _nanoseconds: 0
          }
        };
        
        await districtsContainer.items.create(districtWithPopulation);
        console.log(`Created district: ${district.id} - ${district.name} (${district.regionId})`);
      } catch (error) {
        console.error(`Error creating district ${district.id}:`, error.message);
      }
    }

    console.log('✅ Regions and districts update completed successfully!');
    console.log(`Created ${newRegions.length} regions and ${newDistricts.length} districts`);

  } catch (error) {
    console.error('Error updating regions and districts:', error);
  }
}

updateRegionsAndDistricts(); 