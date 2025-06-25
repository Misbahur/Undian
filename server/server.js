const express = require("express");
const opn = require("opn");
const bodyParser = require("body-parser");
const path = require("path");
const chokidar = require("chokidar");
const cfg = require("./config");

const {
  loadXML,
  loadTempData,
  writeXML,
  saveDataFile,
  shuffle,
  saveErrorDataFile
} = require("./help");

let app = express(),
  router = express.Router(),
  cwd = process.cwd(),
  dataBath = __dirname,
  port = 8090,
  curData = {},
  luckyData = {},
  errorData = [],
  defaultType = cfg.prizes[0]["type"],
  defaultPage = `default data`;

// Menggunakan format JSON untuk parameter
app.use(
  bodyParser.json({
    limit: "1mb"
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

if (process.argv.length > 2) {
  port = process.argv[2];
}

app.use(express.static(cwd));

// Jika alamat permintaan kosong, redirect ke index.html
app.get("/", (req, res) => {
  res.redirect(301, "index.html");
});

// Mengatur CORS (Cross-Origin Resource Sharing)
app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By", " 3.2.1");
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

app.post("*", (req, res, next) => {
  log(`Isi permintaan：${JSON.stringify(req.path, 2)}`);
  next();
});

// Mendapatkan data yang sudah diatur sebelumnya
router.post("/getTempData", (req, res, next) => {
  getLeftUsers();
  res.json({
    cfgData: cfg,
    leftUsers: curData.leftUsers,
    luckyData: luckyData
  });
});

// Reset semua data
router.post("/reset", (req, res, next) => {
  luckyData = {};
  errorData = [];
  log(`Berhasil mereset data`);
  saveErrorDataFile(errorData);
  return saveDataFile(luckyData).then(data => {
    res.json({
      type: "success"
    });
  });
});

// Mendapatkan semua pengguna
router.post("/getUsers", (req, res, next) => {
  res.json(curData.users);
  log(`Berhasil mengembalikan data peserta undian`);
});

// Mendapatkan informasi hadiah
router.post("/getPrizes", (req, res, next) => {
  log(`Berhasil mengembalikan data hadiah`);
});

// Menyimpan data undian
router.post("/saveData", (req, res, next) => {
  let data = req.body;
  setLucky(data.type, data.data)
    .then(t => {
      res.json({
        type: "Pengaturan berhasil!"
      });
      log(`Berhasil menyimpan data hadiah`);
    })
    .catch(data => {
      res.json({
        type: "Pengaturan gagal!"
      });
      log(`Gagal menyimpan data hadiah`);
    });
});

// Menyimpan data error
router.post("/errorData", (req, res, next) => {
  let data = req.body;
  setErrorData(data.data)
    .then(t => {
      res.json({
        type: "Pengaturan berhasil!"
      });
      log(`Berhasil menyimpan data peserta yang tidak hadir`);
    })
    .catch(data => {
      res.json({
        type: "Pengaturan gagal!"
      });
      log(`Gagal menyimpan data peserta yang tidak hadir`);
    });
});

// Mengekspor data ke Excel
router.post("/export", (req, res, next) => {
  let outData = [["MSISDN", "Region", "Kota", "Channel"]]; // Header

  cfg.prizes.forEach(item => {
    outData.push([item.text]);
    const winners = luckyData[item.type] || [];
    winners.forEach(obj => {
      outData.push([obj.msisdn, obj.region, obj.city, obj.channel]);
    });
  });

  writeXML(outData, "/Hasil Undian.xlsx")
    .then(dt => {
      res.status(200).json({
        type: "success",
        url: "Hasil Undian.xlsx"
      });
      log(`Berhasil mengekspor data!`);
    })
    .catch(err => {
      console.error("Export error:", err);
      res.json({
        type: "error",
        error: err.error
      });
      log(`Gagal mengekspor data!`);
    });
});

// Untuk path atau permintaan yang tidak cocok, kembalikan halaman default
// Kembalikan konten yang berbeda berdasarkan jenis permintaan
router.all("*", (req, res) => {
  if (req.method.toLowerCase() === "get") {
    if (/\.(html|htm)/.test(req.originalUrl)) {
      res.set("Content-Type", "text/html");
      res.send(defaultPage);
    } else {
      res.status(404).end();
    }
  } else if (req.method.toLowerCase() === "post") {
    let postBackData = {
      error: "empty"
    };
    res.send(JSON.stringify(postBackData));
  }
});

function log(text) {
  global.console.log(text);
  global.console.log("-----------------------------------------------");
}

function setLucky(type, data) {
  if (luckyData[type]) {
    luckyData[type] = luckyData[type].concat(data);
  } else {
    luckyData[type] = Array.isArray(data) ? data : [data];
  }

  return saveDataFile(luckyData);
}

function setErrorData(data) {
  errorData = errorData.concat(data);

  return saveErrorDataFile(errorData);
}

app.use(router);

function loadData() {
  console.log("Memuat data file EXCEL");
  let cfgData = {};

  curData.users = loadXML(path.join(dataBath, "data/list.xlsx"));
  // Acak ulang data
  shuffle(curData.users);

  // Membaca hasil undian yang sudah ada
  loadTempData()
    .then(data => {
      luckyData = data[0];
      errorData = data[1];
    })
    .catch(data => {
      curData.leftUsers = Object.assign([], curData.users);
    });
}

function getLeftUsers() {
  // Catat pengguna yang sudah diundi
  let lotteredUser = {};
  for (let key in luckyData) {
    let luckys = luckyData[key];
    luckys.forEach(item => {
      lotteredUser[item[0]] = true;
    });
  }
  // Catat pengguna yang sudah diundi tapi tidak hadir
  errorData.forEach(item => {
    lotteredUser[item[0]] = true;
  });

  let leftUsers = Object.assign([], curData.users);
  leftUsers = leftUsers.filter(user => {
    return !lotteredUser[user[0]];
  });
  curData.leftUsers = leftUsers;
}

loadData();

module.exports = {
  run: function (devPort, noOpen) {
    let openBrowser = true;
    if (process.argv.length > 3) {
      if (process.argv[3] && (process.argv[3] + "").toLowerCase() === "n") {
        openBrowser = false;
      }
    }

    if (noOpen) {
      openBrowser = noOpen !== "n";
    }

    if (devPort) {
      port = devPort;
    }

    let server = app.listen(port, () => {
      let host = server.address().address;
      let port = server.address().port;
      global.console.log(`Server undian berjalan di http://${host}:${port}`);
      openBrowser && opn(`http://127.0.0.1:${port}`);
    });
  }
};