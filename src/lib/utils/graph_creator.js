import * as dataForge from 'data-forge';

class GraphCreator {
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

      //console.log(data)

      //Create a danfo dataframe from the json result

      const df = new dataForge.DataFrame(data["result"]["604800"])
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
        "5": "Volume",
        "6": "NA"
        });

        var new_date_df = renamed_df.map(

          (item)=> { 
          
            // Parsing unix timestamp to date
          
            const newDate = new Date(item.CloseTime* 1000)

          
            return {...item, CloseTime:newDate}
          
          });


      const columnNames = new_date_df.getColumnNames();
      console.log(columnNames);

    
      return new_date_df;
    } catch (err) {
      console.log(err);
    }
  }

  async check_symbol_exists_on_exchange() {
    /*Check if we can get data about the given symbol on our target exchange*/

    try {
      const response = await fetch(
        `https://api.cryptowat.ch/markets/kraken/${this.coin_symbol}usd/price`,
        { timeout: 10000 }
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
      return false;
    }
  }

  async driver_logic(){
    /*Driver logic of the class to retrieve historical data*/

    try{

      if (await this.check_symbol_exists_on_exchange() == false) {
        return "Symbol doesn't exist";
      }

      if (isNaN(this.investment) || this.investment === 0){
        return "Invalid investment amount"
      }
        
        console.log('We should query the api')

        //Converting coin symbol to the lowercase version of itself
        let coin_symbol = this.coin_symbol.toLowerCase();

        //Creating timestamps for the time period before the coin was listed and
        const from_date = Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 7 * 1080) / 1000);
        // const today_date = int( (datetime.now() - timedelta(weeks=12)).timestamp())

        //generating request urls to REST api
        const response = await fetch(
            `https://api.cryptowat.ch/markets/kraken/${coin_symbol}usd/ohlc?` +
              new URLSearchParams({ after: from_date, periods: "604800" }),
            { timeout: 10000 }
          );

        //create pandas dataframe for the price data at the moment
        let data_frame = await this.convert_result_to_pd(response)

        //Remove two columns name is 'C' and 'D'
        let interim_df = data_frame.dropSeries(['OpenPrice', 'HighPrice',
        'LowPrice', 'Volume', 'NA']);

        //Rename columns for frontend
        let final_df = interim_df.renameSeries({
            'CloseTime': 'x',
            'ClosePrice': 'y'
          });


        let result = final_df.toJSON();

        //console.log(result)

        return result
    }
    catch(err){
        console.log(err)
    }
}

}

export default GraphCreator;
