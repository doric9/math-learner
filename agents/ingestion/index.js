import { IngestionAgent } from './IngestionAgent.js';
import path from 'path';

const agent = new IngestionAgent({
    serviceAccountPath: './serviceAccountKey.json'
});

// Assuming data is in ../scraper/data/amc8_data.json relative to this script
// But typically agents might share a data volume or path.
// For now, let's assume the user passes the path or we default to a known location.
const dataPath = process.argv[2] || '../scraper/data/amc8_data.json';

agent.ingest(dataPath).catch(console.error);
