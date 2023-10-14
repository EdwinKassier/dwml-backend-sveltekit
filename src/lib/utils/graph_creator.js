import * as dataForge from 'data-forge';

class GraphCreator {
  constructor(coinSymbol) {
    this.coin_symbol = coinSymbol;
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

  async driver_logic(){
    /*Driver logic of the class to retrieve historical data*/

    try{

        if (this.check_symbol_exists_on_exchange() == false){
            return "Symbol doesn\'t exist"
        }
        console.log('We should query the api')

        //Creating timestamps for the time period before the coin was listed and
        const from_date = Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 7 * 1080) / 1000);
        // const today_date = int( (datetime.now() - timedelta(weeks=12)).timestamp())

        //generating request urls to REST api
        const response = await fetch(
            `https://api.kraken.com/0/public/OHLC?pair=${this.coin_symbol}USD&interval=21600&since=1548111600`
          );

        //create pandas dataframe for the price data at the moment
        let data_frame = await this.convert_result_to_pd(response)

        //Remove two columns name is 'C' and 'D'
        let interim_df = data_frame.dropSeries(['OpenPrice', 'HighPrice',
        'LowPrice', 'Volume', 'VWap', 'Count']);

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
