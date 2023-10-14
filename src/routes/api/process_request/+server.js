// Import necessary modules
import { error, json } from "@sveltejs/kit"
import DataCache from '$utils/data_cache.js';
import DataCollector from '$utils/data_collector.js';
import GraphCreator from '$utils/graph_creator.js';

export async function GET({ url }) {
  try {
    console.log(url)
    // Extract query parameters from the request
    const urlParams = new URLSearchParams(url.searchParams);
    const symbol = urlParams.get('symbol') ?? "";
	  const investment = parseFloat(urlParams.get('investment')) ?? "";

    console.log('Request Body', urlParams.get('symbol'))

    if (symbol == "" ){
      return json({"result":"Symbol doesn't exist","graph_data":"Symbol doesn't exist"});
    }

    if (investment=="" || typeof investment == 'string'){
      return json({"result":"Invalid investment amount","graph_data":"Invalid investment amount"});
    }

    // Create instances of your utility classes
    const cache = new DataCache(symbol, investment);
    const collector = new DataCollector(symbol, investment);
    const creator = new GraphCreator(symbol, investment);

    // Perform the necessary logic
    let result = await collector.driver_logic();
    let graph_data = await creator.driver_logic();

    // Log the result (optional)
    console.log(`Received result: ${result}`);

    if (result == undefined){
      result = "Symbol doesn't exist"
      graph_data = "Symbol doesn't exist"
    }

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
