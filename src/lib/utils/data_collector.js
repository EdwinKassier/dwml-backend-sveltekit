import { PrismaClient } from '@prisma/client';
import DataCache from './data_cache';
import fetch from 'node-fetch'; // Added import for fetch
import * as dataForge from 'data-forge';

const prisma = new PrismaClient();

class DataCollector {


  constructor(coinSymbol, investment) {
    this.coinSymbol = coinSymbol;
    this.investment = investment;
  }

  async convert_result_to_pd(raw) {
    /*Having been given a raw response from the api request,
  convert this into a danfo dataframe*/

    try {
      //Convert raw response to a json representation
      const data =await raw.json();


      const keysWithUSD = Object.keys(data.result).filter(key => key.includes('USD'));


      let target_data =data["result"][keysWithUSD]

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

  async createResultDict(averageStartPrice, averageEndPrice) {
    const resultDict = {};

    console.log(`Create result dict average start price : ${averageStartPrice}`);

    const numberOfCoins = this.investment / averageStartPrice;
    const profit = (
      numberOfCoins * averageEndPrice - this.investment
    ).toFixed(2);
    const growthFactor = (profit / this.investment).toFixed(2);
    const numberOfLambos = (profit / 200000).toFixed(2);

    resultDict.NUMBERCOINS = numberOfCoins;
    resultDict.PROFIT = profit;
    resultDict.GROWTHFACTOR = growthFactor;
    resultDict.LAMBOS = numberOfLambos;
    resultDict.INVESTMENT = this.investment;
    resultDict.SYMBOL = this.coinSymbol;
    resultDict.GENERATIONDATE = new Date().toISOString();

    return resultDict;
  }

  async check_symbol_exists_on_exchange() {
    /*Check if we can get data about the given symbol on our target exchange*/

    try {
      const response = await fetch(
        `https://api.kraken.com/0/public/OHLC?pair=${this.coinSymbol}USD&interval=21600&since=1548111600`
      );
      const check_symbol = await response.json();

      console.log(`checking if symbol exists ${JSON.stringify(check_symbol)}`)

      if (
        check_symbol["error"].toString() !== ""
      ) {
        return false;
      }

      return true;
    } catch (err) {
      console.log(err);
    }

    return false;
  }

  async driverLogic() {
    try {
      const dataCache = new DataCache(this.coinSymbol, this.investment);

      if (!(await this.check_symbol_exists_on_exchange())) {
        return 'Symbol doesn\'t exist';
      }

      if (isNaN(this.investment) || this.investment === 0) {
        return 'Invalid investment amount';
      }

      dataCache.insertIntoLogging();

      const from_date = Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 7 * 1080) / 1000);
      const today_date = Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 7 * 12) / 1000);

      if (await dataCache.checkIfHistoricalCacheExists()) {
        console.log('Opening average cache exists for symbol');
        const cachedHistoricalOpeningData = await dataCache.getHistoricalCache();
        var averageStartPrice = cachedHistoricalOpeningData;
      } else {
        console.log("We haven't seen this symbol before");
        const response = await fetch(
          `https://api.kraken.com/0/public/OHLC?pair=${this.coinSymbol}USD&interval=21600&since=1548111600`
        );

        var dfStart = await this.convert_result_to_pd(response);
        // dfStart = dfStart.head(4);
        var averageStartPrice = dfStart.getSeries('ClosePrice').average();

        console.log(dfStart);

        const openingAverageResult = {
          SYMBOL: this.coinSymbol,
          AVERAGE: averageStartPrice,
        };
        dataCache.insertIntoOpeningAverage(openingAverageResult);
      }

      const dataRawCurrent = await fetch(
        `https://api.kraken.com/0/public/OHLC?pair=${this.coinSymbol}USD&interval=21600&since=1548111600`
      );

      let dfEnd = await this.convert_result_to_pd(dataRawCurrent);
      let averageEndPrice = dfEnd.getSeries('ClosePrice').average();
      let finalResult = this.createResultDict(averageStartPrice, averageEndPrice);

      dataCache.insertIntoResult(finalResult);

      console.log(finalResult);

      return finalResult;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

export default DataCollector;
