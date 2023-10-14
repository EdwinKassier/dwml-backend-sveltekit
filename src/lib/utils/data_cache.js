import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class DataCache {

  constructor(coinSymbol, investment) {
    this.coinSymbol = coinSymbol;
    this.investment = investment;
  }

  async checkIfValidFinalResultExists() {
    try {
      const existingResult = await prisma.results.findFirst({
        where: { SYMBOL: this.coinSymbol, INVESTMENT: this.investment },
      });

      return !!existingResult;
    } catch (error) {
      console.error('Error checking for valid final result:', error);
      return false;
    }
  }

  async getValidFinalResult() {
    try {
      const existingResult = await prisma.results.findFirst({
        where: { SYMBOL: this.coinSymbol, INVESTMENT: this.investment },
      });

      return existingResult || {};
    } catch (error) {
      console.error('Error retrieving valid final result:', error);
      return {};
    }
  }

  async checkIfHistoricalCacheExists() {
    try {
      const existingResult = await prisma.opening_Average.findFirst({
        where: { SYMBOL: this.coinSymbol },
      });

      return !!existingResult;
    } catch (error) {
      console.error('Error checking for historical cache:', error);
      return false;
    }
  }

  async getHistoricalCache() {
    try {
      const existingResult = await prisma.opening_Average.findFirst({
        where: { SYMBOL: this.coinSymbol },
      });

      return existingResult ? parseFloat(existingResult.AVERAGE) : false;
    } catch (error) {
      console.error('Error retrieving historical cache:', error);
      return false;
    }
  }

  async insertIntoLogging() {
    

    try {
      const loggingItem = {
        SYMBOL: this.coinSymbol,
        INVESTMENT: this.investment,
        GENERATIONDATE: new Date().toISOString(),
      };
      
      const log = await prisma.logging.create({ data: loggingItem });
      console.log(log + ' was saved to logs');
    } catch (error) {
      console.error('Error inserting into logging:', error);
    }
  }

  async insertIntoResult(result) {
    const QUERY = `${this.coinSymbol}-${this.investment}`;

  

    try {

      const resultItem = {
        QUERY,
        NUMBERCOINS: parseFloat(result.NUMBERCOINS.toString()),
        PROFIT: parseFloat(result.PROFIT.toString()),
        GROWTHFACTOR: parseFloat(result.GROWTHFACTOR.toString()),
        LAMBOS: parseFloat(result.LAMBOS.toString()),
        INVESTMENT: this.investment,
        SYMBOL: this.coinSymbol,
        GENERATIONDATE: new Date().toISOString(),
      };

      const log = await prisma.results.create({ data: resultItem });
      console.log(log + ' was saved to results');
    } catch (error) {
      console.error('Error inserting into results:', error);
    }
  }

  async insertIntoOpeningAverage(result) {

    try {
      const openingAverageItem = {
        SYMBOL: this.coinSymbol,
        AVERAGE: parseFloat(result.AVERAGE.toString()),
        GENERATIONDATE: new Date().toISOString(),
      };

      const item = await prisma.opening_Average.create({ data: openingAverageItem });
      console.log(item + ' was saved to opening_average');
    } catch (error) {
      console.error('Error inserting into opening_average:', error);
    }
  }
}

export default DataCache;