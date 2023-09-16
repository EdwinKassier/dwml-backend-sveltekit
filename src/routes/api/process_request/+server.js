// Import necessary modules
import { error, json } from "@sveltejs/kit"
import DataCache from '$utils/data_cache.js';
import DataCollector from '$utils/data_collector.js';
import GraphCreator from '$utils/graph_creator.js';

export async function GET({ request, cookies }) {
  try {
    // Extract query parameters from the request
    const requestBody = await request.text();
    let symbol = 'ETH'
    let investment = 200

    console.log(requestBody)

    // Check if symbol and investment are provided
    if (!symbol || isNaN(investment)) {
      return {
        status: 400, // Bad Request
        body: { error: 'Invalid request data' },
      };
    }

    // Create instances of your utility classes
    const cache = new DataCache(symbol, investment);
    const collector = new DataCollector(symbol, investment);
    const creator = new GraphCreator(symbol, investment);

    // Perform the necessary logic
    const result = await collector.driverLogic();
    const graph_data = await creator.driver_logic();

    // Log the result (optional)
    console.log(`Received result: ${result}`);

    // Return a JSON response
    return json({ result: result,graph_data:graph_data })
  } catch (error) {
    console.error('Error:', error);

    // Return an error response
    return {
      status: 500, // Internal Server Error
      body: { error: 'Internal server error' },
    };
  }
}
