import { ScraperAgent } from './ScraperAgent.js';

const agent = new ScraperAgent({
    outputDir: './data'
});

agent.scrape();
