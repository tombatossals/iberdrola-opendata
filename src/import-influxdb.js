import moment from "moment";
const Influx = require("influx");

const config = require("../config.json").influxdb;
const client = new Influx.InfluxDB(config.conn);

(async function() {
  try {
    const data = require("../measures.json");
    const measures = data.map(({ value, timestamp }) => ({
      fields: { value: parseFloat(value) },
      timestamp
    }));

    await client.writeMeasurement("iberdrola.watts/h", measures, {
      precision: "ms",
      database: "ha"
    });
  } catch (e) {
    console.log(e);
  }
})();
