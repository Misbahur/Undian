const fs = require("fs");
const path = require("path");
const xlsx = require("node-xlsx").default;
let cwd = path.join(__dirname, "cache");

if (!fs.existsSync(cwd)) {
  fs.mkdirSync(cwd);
}

/**
 * Membaca data cache
 */
function loadTempData() {
  let pros = [];
  pros.push(
    new Promise((resolve, reject) => {
      fs.readFile(path.join(cwd, "temp.json"), "utf8", (err, data) => {
        if (err) {
          resolve({});
          return;
        }
        resolve(JSON.parse(data));
      });
    })
  );

  pros.push(
    new Promise((resolve, reject) => {
      fs.readFile(path.join(cwd, "error.json"), "utf8", (err, data) => {
        if (err) {
          resolve([]);
          return;
        }
        resolve(JSON.parse(data));
      });
    })
  );

  return Promise.all(pros);
}

/**
 * Membaca data file XML
 */
function loadXML(xmlPath) {
  let userData = xlsx.parse(xmlPath);
  let outData = [];
  userData.forEach(item => {
    let rows = item.data;
    const header = rows.shift();
    rows.forEach(row => {
      // Buat object {msisdn:..., region:..., dst}
      let obj = {};
      header.forEach((col, idx) => {
        obj[col.trim().toLowerCase()] = (row[idx] !== undefined ? row[idx] : '').toString().trim();
      });
      // Filter baris kosong (jika msisdn kosong)
      if (obj.msisdn) outData.push(obj);
    });
    return false;
  });
  return outData;
}

/**
 * Menulis data ke Excel
 * @param {Array} data
 * @param {string} name
 */
function writeXML(data, name) {
  let buffer = xlsx.build([
    {
      name: "Hasil Undian",
      data: data
    }
  ]);

  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(process.cwd(), name), buffer, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/**
 * Menyimpan data ke file
 * @param {*} data
 */
function saveDataFile(data) {
  data = JSON.stringify(data, "", 2);

  if (!fs.existsSync(cwd)) {
    fs.mkdirSync(cwd);
  }

  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(cwd, "temp.json"), data, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
      console.log("Data berhasil disimpan");
    });
  });
}

/**
 * Menyimpan log error ke file
 * @param {*} data
 */
function saveErrorDataFile(data) {
  data = JSON.stringify(data, "", 2);
  if (!fs.existsSync(cwd)) {
    fs.mkdirSync(cwd);
  }

  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(cwd, "error.json"), data, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
      console.log("Data berhasil disimpan");
    });
  });
}

/**
 * Algoritma pengacakan (shuffle)
 * @param {*} arr
 */
function shuffle(arr) {
  let i = arr.length;
  while (i) {
    let j = Math.floor(Math.random() * i--);
    let temp = arr[j];
    arr[j] = arr[i];
    arr[i] = temp;
  }
}

module.exports = {
  loadTempData,
  loadXML,
  shuffle,
  writeXML,
  saveDataFile,
  saveErrorDataFile
};