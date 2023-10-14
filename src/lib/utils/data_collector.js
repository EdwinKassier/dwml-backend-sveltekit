import { PrismaClient } from '@prisma/client';
import DataCache from './data_cache';
import fetch from 'node-fetch'; // Added import for fetch
import * as dataForge from 'data-forge';

const prisma = new PrismaClient();

class DataCollector {
  constructor(coinSymbol, investment) {
    this.coin_symbol = coinSymbol;
    this.investment = investment;
  }

  async convert_result_to_pd(raw) {
    /*Having been given a raw response from the api request,
  convert this into a danfo dataframe*/

    try {
      //Convert raw response to a json representation
      const data =await raw.json();

      console.log(data)

      const keysWithUSD = Object.keys(data.result).filter(key => key.includes('USD'));

      console.log(`target key is ${keysWithUSD}`)

      let target_data =data["result"][keysWithUSD]

      console.log(`target data is ${target_data}`)

      //Create a danfo dataframe from the json result

      const df = new dataForge.DataFrame(target_data)
      /*
      const df = new dfd.DataFrame(data["result"]["604800"], {
        columns: [
          "CloseTime",
          "OpenPrice",
          "HighPrice",
          "LowPrice",
          "ClosePrice",
          "Volume",
          "NA",
        ],
      });
      */

      let renamed_df = df.renameSeries({
        "0": "CloseTime",
        "1": "OpenPrice",
        "2": "HighPrice",
        "3": "LowPrice",
        "4": "ClosePrice",
        "5": "VWap",
        "6": "Volume",
        "7": "Count"
        });

        
        let new_date_df = renamed_df.generateSeries({
            CloseTime: row => new Date(parseInt(row.CloseTime)).toISOString(),
            ClosePrice: row => parseFloat(row.ClosePrice)
        });
        

      const columnNames = new_date_df.getColumnNames();
      console.log(columnNames);

      //console.log(console.log(df.toString()))

      

      //Make a date out of CloseTime
      //df["CloseTime"] = df["CloseTime"].map(d => new Date(d));
      //console.log(df["CloseTime"].values)

      //make CloseTime Index of the data_frame
      //df.setIndex({column: "CloseTime", inplace: true})

      //df.print()
      return new_date_df;
    } catch (err) {
      console.log(err);
    }
  }

  async create_result_dict(average_start_price, average_end_price) {
    /*Create final result dict to be passed to the front end*/

    //init result dict - will become a json in the REST response
    let result_dict = {};

    console.log(
      `Create result dict average start price : ${average_start_price}`
    );

    //Number of coins purchased at the beginning
    let number_of_coins = this.investment / average_start_price;

    //What is our profit if we sold at the average price of the last month
    let profit = (
      number_of_coins * average_end_price -
      this.investment
    ).toFixed(2);

    //Growth factor of the initial investment
    let growth_factor = (profit / this.investment).toFixed(2);

    //number of lambos user could buy using this profit
    // - assuming the price of an average lamborghini is $200000
    let number_of_lambos = (profit / 200000).toFixed(2);

    result_dict = Object.assign({}, result_dict, {
        NUMBERCOINS: number_of_coins,
        PROFIT: profit,
        GROWTHFACTOR: growth_factor,
        LAMBOS: number_of_lambos,
        INVESTMENT: this.investment,
        SYMBOL: this.coin_symbol,
        GENERATIONDATE: new Date().toISOString(),
      });

    return result_dict;
  }

  async check_symbol_exists_on_exchange() {
    /*Check if we can get data about the given symbol on our target exchange*/

    try {
      const response = await fetch(
        `https://api.kraken.com/0/public/OHLC?pair=${this.coin_symbol}USD&interval=21600&since=1548111600`
      );
      const check_symbol = await response.json();

      if (
        "error" in check_symbol &&
        check_symbol.error === "Instrument not found"
      ) {
        return false;
      }

      return true;
    } catch (err) {
      console.log(err);
    }

    return false;
  }

  async driver_logic() {
    /*Driver logic to run all business logic*/

    try {
      const dataCache = new DataCache(
        String(this.coin_symbol),
        this.investment
      );

      //Irrelevant of what the user gave, we insert the query into the logging table
      dataCache.insertIntoLogging();

      if (this.check_symbol_exists_on_exchange() == false) {
        return "Symbol doesn't exist";
      }

      console.log("We should query the api");


      //Creating timestamps for the time period before the coin was listed and the last month
      const from_date = Math.floor(
        (Date.now() - 1000 * 60 * 60 * 24 * 7 * 1080) / 1000
      );
      const today_date = Math.floor(
        (Date.now() - 1000 * 60 * 60 * 24 * 7 * 12) / 1000
      );

      // Here we are checking the datacache first to see if we even need to query the api
      // for the opening prices for the symbol, saving on long term storage and api costs
      if (dataCache.checkIfHistoricalCacheExists()==true) {
        console.log("Opening average cache exists for symbol");

        let cached_historical_opening_data =
          await dataCache.getHistoricalCache();

        //console.log(cached_historical_opening_data);

        var average_start_price = cached_historical_opening_data;
      } else {
        console.log("We haven't seen this symbol before");

        const response = await fetch(
          `https://api.kraken.com/0/public/OHLC?pair=${this.coin_symbol}USD&interval=21600&since=1548111600`
        );

        // create pandas dataframe for the price data at the coins inception
        var df_start = await this.convert_result_to_pd(response);

        // We are only looking at the first month
        df_start = df_start.head(4);

        // Average price for the starting period
        var average_start_price = df_start.getSeries("ClosePrice").average();

        //console.log(df_start);

        let opening_average_result = {
          SYMBOL: this.coin_symbol,
          AVERAGE: average_start_price,
        };

        dataCache.insertIntoOpeningAverage(opening_average_result);
      }

      //generating request urls to REST api
      const data_raw_current = await fetch(
        `https://api.kraken.com/0/public/OHLC?pair=${this.coin_symbol}USD&interval=21600&since=1548111600`
      );

      //create pandas dataframe for the price data at the moment
      let df_end = await this.convert_result_to_pd(data_raw_current);

      //console.log(df_end)


      //Average price for the current period
      let average_end_price = df_end.getSeries("ClosePrice").average();

      let final_result = await this.create_result_dict(
        average_start_price,
        average_end_price
      );

      console.log(final_result)

      dataCache.insertIntoResult(final_result);

      //console.log(df_end);
      //console.log(average_end_price);

      //console.log(final_result);

      if (final_result.GROWTHFACTOR !== "NaN"){

        return final_result;
      }
      else{

        return "Symbol doesn't exist"

      }


    } catch (err) {
      console.log(err);
    }
  }
}

export default DataCollector;
