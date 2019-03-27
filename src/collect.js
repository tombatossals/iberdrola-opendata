import urljoin from "url-join";
import moment from "moment";
import program from "commander";
import fetch from "node-fetch";
import fs from "fs";

class Iberdrola {
  constructor(username, password) {
    this.baseUrl =
      "https://www.iberdroladistribucionelectrica.com/consumidores/rest/";
    this.username = username;
    this.password = password;
    this.loginURL = "loginNew/login";
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 11_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15G77",
      "content-type": "application/json; charset=utf-8",
      movilAPP: "si",
      tipoAPP: "ios",
      esVersionNueva: "1",
      idioma: "es"
    };
  }

  async login() {
    const response = await fetch(urljoin(this.baseUrl, this.loginURL), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify([
        this.username,
        this.password,
        "",
        "iOS 11.4.1",
        "Movil",
        "Aplicación móvil V. 15",
        "0",
        "0",
        "0",
        "",
        "n"
      ])
    });
    this.cookies = response.headers.get("set-cookie");
  }

  processData(data, date) {
    return data.y.data[0].map((d, index) => ({
      value: parseFloat(d.valor),
      timestamp: moment(date, "DD-MM-YYYY")
        .add(index + 1, "hours").valueOf()
    }));
  }

  async fetchAll() {
    const url = "/consumoNew/obtenerLimiteFechasConsumo";
    const data = await fetch(urljoin(this.baseUrl, url), {
      method: "GET",
      headers: { cookie: this.cookies }
    });

    const fechas = await data.json();
    const inicio = moment(fechas.fechaMinima, "DD-MM-YYYYHH:mm:ss");
    // const inicio = moment(fechas.fechaMaxima, "DD-MM-YYYYHH:mm:ss").subtract(6, "days");
    const fin = moment(fechas.fechaMaxima, "DD-MM-YYYYHH:mm:ss");
    let actual = fin.clone();
    const result = [];
    while (actual.isAfter(inicio)) {
      const data = await this.fetch(actual.format("DD-MM-YYYY"));
      actual.subtract(1, "days");
      result.push(data);
    }
    return [].concat(...result);
  }

  async fetch(date) {
    const url = `/consumoNew/obtenerDatosConsumo/fechaInicio/${date}00:00:00/colectivo/USU/frecuencia/horas/acumular/false`;
    const data = await fetch(urljoin(this.baseUrl, url), {
      method: "GET",
      headers: { cookie: this.cookies }
    });

    return this.processData(await data.json(), date);
  }
}

(async function() {
  const config = require("../config.json").iberdrola;

  program
    .option("-d, --date <date>")
    .option("--all")
    .parse(process.argv);

  const username = config.username;
  const password = config.password;
  const date = program.args[0] || moment().format("DD-MM-YYYY");

  const iberdrola = new Iberdrola(username, password);
  await iberdrola.login();

  const datos = program.all
    ? await iberdrola.fetchAll()
    : await iberdrola.fetch(date);
  fs.writeFileSync("measures.json", JSON.stringify(datos));
})();
