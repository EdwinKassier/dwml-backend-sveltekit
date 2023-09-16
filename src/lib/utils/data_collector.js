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

  async convertResultToDataFrame(raw) {
    try {
      const data = await raw.json();
      const df = new dataForge.DataFrame(data.result['604800']);
      const renamedDf = df.renameSeries({
        '0': 'CloseTime',
        '1': 'OpenPrice',
        '2': 'HighPrice',
        '3': 'LowPrice',
        '4': 'ClosePrice',
        '5': 'Volume',
        '6': 'NA',
      });
      const newDateDf = renamedDf.generateSeries({
        CloseTime: (row) => new Date(parseInt(row.CloseTime)).toISOString(),
      });

      const columnNames = newDateDf.getColumnNames();
      console.log(columnNames);

      return newDateDf;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  createResultDict(averageStartPrice, averageEndPrice) {
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

  async checkSymbolExistsOnExchange() {
    try {
      const response = await fetch(
        `https://api.cryptowat.ch/markets/kraken/${this.coinSymbol}usd/price`,
        { timeout: 10000 }
      );
      const checkSymbol  = await response.json();

      if ('error' in checkSymbol && checkSymbol.error === 'Instrument not found') {
        return false;
      }

      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async driverLogic() {
    try {
      const dataCache = new DataCache(this.coinSymbol, this.investment);

      if (!(await this.checkSymbolExistsOnExchange())) {
        return 'Symbol doesn\'t exist';
      }

      if (isNaN(this.investment) || this.investment === 0) {
        return 'Invalid investment amount';
      }

      dataCache.insertIntoLogging();

      const coinSymbol = this.coinSymbol.toLowerCase();
      const from_date = Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 7 * 1080) / 1000);
      const today_date = Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 7 * 12) / 1000);

      if (await dataCache.checkIfHistoricalCacheExists()) {
        console.log('Opening average cache exists for symbol');
        const cachedHistoricalOpeningData = await dataCache.getHistoricalCache();
        var averageStartPrice = cachedHistoricalOpeningData;
      } else {
        console.log("We haven't seen this symbol before");
        const response = await fetch(
          `https://api.cryptowat.ch/markets/kraken/${coinSymbol}usd/ohlc?` +
          new URLSearchParams({ after: from_date, periods: '604800' }),
          { timeout: 10000 }
        );

        var dfStart = await this.convertResultToDataFrame(response);
        dfStart = dfStart.head(4);
        var averageStartPrice = dfStart.getSeries('ClosePrice').average();

        console.log(dfStart);

        const openingAverageResult = {
          SYMBOL: coinSymbol,
          AVERAGE: averageStartPrice,
        };
        dataCache.insertIntoOpeningAverage(openingAverageResult);
      }

      let dataRawCurrent = await fetch(
        `https://api.cryptowat.ch/markets/kraken/${coinSymbol}usd/ohlc?` +
        new URLSearchParams({ after: from_date, periods: '604800' }),
        { timeout: 10000 }
      );

      let dfEnd = await this.convertResultToDataFrame(dataRawCurrent);
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
