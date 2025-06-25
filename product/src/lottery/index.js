import "./index.css";
import "../css/animate.min.css";
import "./canvas.js";
import {
  addQipao,
  setPrizes,
  showPrizeList,
  setPrizeData,
  resetPrize
} from "./prizeList";
import { NUMBER_MATRIX, LETTER_MATRIX } from "./config.js";

const ROTATE_TIME = 3000;
const ROTATE_LOOP = 1000;
const BASE_HEIGHT = 1080;

let TOTAL_CARDS,
  btns = {
    enter: document.querySelector("#enter"),
    lotteryBar: document.querySelector("#lotteryBar"),
    lottery: document.querySelector("#lottery")
  },
  prizes,
  EACH_COUNT,
  ROW_COUNT = 7,
  COLUMN_COUNT = 19,
  COMPANY,
  HIGHLIGHT_CELL = [],
  // Rasio resolusi saat ini
  Resolution = 1;

let camera,
  scene,
  renderer,
  controls,
  threeDCards = [],
  targets = {
    table: [],
    sphere: []
  };

let rotateObj;

let selectedCardIndex = [],
  rotate = false,
  basicData = {
    prizes: [], //Informasi hadiah
    users: [], //Semua peserta
    luckyUsers: {}, //Peserta yang sudah menang
    leftUsers: [] //Peserta yang belum menang
  },
  interval,
  // Hadiah yang sedang diundi, mulai dari hadiah terkecil sampai hadiah utama
  currentPrizeIndex,
  currentPrize,
  // Sedang mengundi
  isLotting = false,
  currentLuckys = [];

initAll();
// console.log("DEBUG CARD:", user);
/**
 * Inisialisasi semua DOM
 */
function initAll() {
  window.AJAX({
    url: "/getTempData",
    success(data) {
      // Mendapatkan data dasar
      prizes = data.cfgData.prizes;
      EACH_COUNT = data.cfgData.EACH_COUNT;
      COMPANY = data.cfgData.COMPANY;
      HIGHLIGHT_CELL = createHighlight();
      basicData.prizes = prizes;
      setPrizes(prizes);

      TOTAL_CARDS = ROW_COUNT * COLUMN_COUNT;

      // Membaca hasil undian yang sudah disetel
      basicData.leftUsers = data.leftUsers || [];
      basicData.luckyUsers = data.luckyData || {};

      let prizeIndex = basicData.prizes.length - 1;
      for (; prizeIndex > -1; prizeIndex--) {
        if (
          data.luckyData[prizeIndex] &&
          data.luckyData[prizeIndex].length >= basicData.prizes[prizeIndex].count
        ) {
          continue;
        }
        currentPrizeIndex = prizeIndex;
        currentPrize = basicData.prizes[currentPrizeIndex];
        break;
      }

      showPrizeList(currentPrizeIndex);
      let curLucks = basicData.luckyUsers[currentPrize.type];
      setPrizeData(currentPrizeIndex, curLucks ? curLucks.length : 0, true);
    }
  });

  window.AJAX({
    url: "/getUsers",
    success(data) {
      basicData.users = data;
      // FIX: Selalu update leftUsers juga!
      basicData.leftUsers = data.slice();
      // DEBUG: cek isi peserta
      console.log("Peserta users:", basicData.users.length, basicData.users.slice(0, 3));
      console.log("Peserta leftUsers:", basicData.leftUsers.length, basicData.leftUsers.slice(0, 3));

      initCards();
      animate();
      shineCard();
    }
  });
}

function initCards() {
  let member = basicData.users.slice(),
    showCards = [],
    length = member.length;

  let isBold = false,
    showTable = basicData.leftUsers.length === basicData.users.length,
    index = 0,
    totalMember = member.length,
    position = {
      x: (140 * COLUMN_COUNT - 20) / 2,
      y: (180 * ROW_COUNT - 20) / 2
    };

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 3000;

  scene = new THREE.Scene();

  for (let i = 0; i < ROW_COUNT; i++) {
    for (let j = 0; j < COLUMN_COUNT; j++) {
      isBold = HIGHLIGHT_CELL.includes(j + "-" + i);
      var element = createCard(
        member[index % length],
        isBold,
        index,
        showTable
      );

      var object = new THREE.CSS3DObject(element);
      object.position.x = Math.random() * 4000 - 2000;
      object.position.y = Math.random() * 4000 - 2000;
      object.position.z = Math.random() * 4000 - 2000;
      scene.add(object);
      threeDCards.push(object);
      //

      var object = new THREE.Object3D();
      object.position.x = j * 140 - position.x;
      object.position.y = -(i * 180) + position.y;
      targets.table.push(object);
      index++;
    }
  }

  // sphere

  var vector = new THREE.Vector3();

  for (var i = 0, l = threeDCards.length; i < l; i++) {
    var phi = Math.acos(-1 + (2 * i) / l);
    var theta = Math.sqrt(l * Math.PI) * phi;
    var object = new THREE.Object3D();
    object.position.setFromSphericalCoords(800 * Resolution, phi, theta);
    vector.copy(object.position).multiplyScalar(2);
    object.lookAt(vector);
    targets.sphere.push(object);
  }

  renderer = new THREE.CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  //

  controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 0.5;
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener("change", render);

  bindEvent();

  if (showTable) {
    switchScreen("enter");
  } else {
    switchScreen("lottery");
  }
}

function setLotteryStatus(status = false) {
  isLotting = status;
}

/**
 * Event binding
 */
function bindEvent() {
  document.querySelector("#menu").addEventListener("click", function (e) {
    e.stopPropagation();
    // Jika sedang mengundi, larang semua operasi
    if (isLotting) {
      if (e.target.id === "lottery") {
        rotateObj.stop();
        btns.lottery.innerHTML = "Mulai Undian";
      } else {
        addQipao("Sedang mengundi, harap tunggu sebentar~~");
      }
      return false;
    }

    let target = e.target.id;
    switch (target) {
      // Tampilkan dinding angka
      case "welcome":
        switchScreen("enter");
        rotate = false;
        break;
      // Masuk ke undian
      case "enter":
        removeHighlight();
        addQipao(`Akan segera mengundi [${currentPrize.title}], jangan pergi.`);
        // rotate = !rotate;
        rotate = true;
        switchScreen("lottery");
        break;
      // Reset
      case "reset":
        let doREset = window.confirm(
          "Apakah Anda yakin ingin mereset data? Setelah reset, semua hadiah yang sudah diundi akan dikosongkan?"
        );
        if (!doREset) {
          return;
        }
        addQipao("Mereset semua data, memulai undian kembali");
        addHighlight();
        resetCard();
        // Reset semua data
        currentLuckys = [];
        basicData.leftUsers = Object.assign([], basicData.users);
        basicData.luckyUsers = {};
        currentPrizeIndex = basicData.prizes.length - 1;
        currentPrize = basicData.prizes[currentPrizeIndex];

        resetPrize(currentPrizeIndex);
        reset();
        switchScreen("enter");
        break;
      // Undian
      case "lottery":
        setLotteryStatus(true);
        // Simpan data undian sebelumnya sebelum mengundi
        // saveData();
        // Hapus saveData() dari sini. Kita simpan setelah konfirmasi.
        //Perbarui tampilan jumlah undian yang tersisa
        changePrize();
        resetCard().then(res => {
          // Mengundi
          lottery();
        });
        addQipao(`Sedang mengundi [${currentPrize.title}], bersiap-siap`);
        break;
      // Undi ulang
      case "reLottery":
        if (currentLuckys.length === 0) {
          addQipao(`Belum ada undian, tidak bisa mengundi ulang~~`);
          return;
        }
        setErrorData(currentLuckys);
        addQipao(`Mengundi ulang [${currentPrize.title}], bersiap-siap`);
        setLotteryStatus(true);
        // Langsung mengundi tanpa menyimpan data undian sebelumnya
        // Mengundi
        resetCard().then(res => {
          // Mengundi
          lottery();
        });
        break;
      // Ekspor hasil undian
      case "save":
        saveData().then(res => {
          resetCard().then(res => {
            // Kosongkan catatan sebelumnya
            currentLuckys = [];
          });
          exportData();
          addQipao(`Data telah disimpan ke dalam EXCEL.`);
        });
        break;
    }
  });

  // Tambahkan event listener BARU untuk tombol konfirmasi
  document.querySelector('#confirmWinnersBtn').addEventListener('click', handleConfirm);
  document.querySelector('#cancelDrawBtn').addEventListener('click', handleCancel);

  // ... (event listener untuk resize tetap sama) ...
  window.addEventListener("resize", onWindowResize, false);
}

function switchScreen(type) {
  switch (type) {
    case "enter":
      btns.enter.classList.remove("none");
      btns.lotteryBar.classList.add("none");
      transform(targets.table, 2000);
      break;
    default:
      btns.enter.classList.add("none");
      btns.lotteryBar.classList.remove("none");
      transform(targets.sphere, 2000);
      break;
  }
}

/**
 * Membuat elemen
 */
function createElement(css, text) {
  let dom = document.createElement("div");
  dom.className = css || "";
  dom.innerHTML = text || "";
  return dom;
}

/**
 * Membuat kartu nama
 */
function createCard(user, isBold, id, showTable) {
  var element = createElement();
  element.id = "card-" + id;

  if (isBold) {
    element.className = "element lightitem";
    if (showTable) {
      element.classList.add("highlight");
    }
  } else {
    element.className = "element";
    element.style.backgroundColor =
      "rgba(0,127,127," + (Math.random() * 0.7 + 0.25) + ")";
  }
  //Tambahkan logo perusahaan
  element.appendChild(createElement("company", COMPANY));

  element.appendChild(createElement("name", user.msisdn || "-"));

  element.appendChild(createElement("details", user.region + "<br/>" + user.city));
  return element;
}

function removeHighlight() {
  document.querySelectorAll(".highlight").forEach(node => {
    node.classList.remove("highlight");
  });
}

function addHighlight() {
  document.querySelectorAll(".lightitem").forEach(node => {
    node.classList.add("highlight");
  });
}

/**
 * Render globe dll
 */
function transform(targets, duration) {
  // TWEEN.removeAll();
  for (var i = 0; i < threeDCards.length; i++) {
    var object = threeDCards[i];
    var target = targets[i];

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  }

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start();
}

function rotateBall() {
  return new Promise((resolve, reject) => {
    scene.rotation.y = 0;
    rotateObj = new TWEEN.Tween(scene.rotation);
    rotateObj
      .to(
        {
          y: Math.PI * 6 * ROTATE_LOOP
        },
        ROTATE_TIME * ROTATE_LOOP
      )
      .onUpdate(render)
      // .easing(TWEEN.Easing.Linear)
      .start()
      .onStop(() => {
        scene.rotation.y = 0;
        resolve();
      })
      .onComplete(() => {
        resolve();
      });
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();
}

function render() {
  renderer.render(scene, camera);
}

// Variabel global baru di bagian atas file
let invalidatedLuckys = []; 
function selectCard(duration = 600) {
  rotate = false;
  let width = 140,
    tag = -(currentLuckys.length - 1) / 2,
    locates = [];

  // Hitung informasi posisi, jika lebih dari 5 tampilkan dalam dua baris
  if (currentLuckys.length > 5) {
    let yPosition = [-87, 87],
      l = selectedCardIndex.length,
      mid = Math.ceil(l / 2);
    tag = -(mid - 1) / 2;
    for (let i = 0; i < mid; i++) {
      locates.push({
        x: tag * width * Resolution,
        y: yPosition[0] * Resolution
      });
      tag++;
    }

    tag = -(l - mid - 1) / 2;
    for (let i = mid; i < l; i++) {
      locates.push({
        x: tag * width * Resolution,
        y: yPosition[1] * Resolution
      });
      tag++;
    }
  } else {
    for (let i = selectedCardIndex.length; i > 0; i--) {
      locates.push({
        x: tag * width * Resolution,
        y: 0 * Resolution
      });
      tag++;
    }
  }

  let text = currentLuckys.map(item => item[1]);
  addQipao(
    `Selamat kepada ${text.join(", ")} memenangkan ${currentPrize.title}, SEmarak HAdiah pelanggan.`
  );

  selectedCardIndex.forEach((cardIndex, index) => {
    changeCard(cardIndex, currentLuckys[index]);
    var object = threeDCards[cardIndex];
    new TWEEN.Tween(object.position)
      .to(
        {
          x: locates[index].x,
          y: locates[index].y * Resolution,
          z: 2200
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: 0,
          y: 0,
          z: 0
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    object.element.classList.add("prize");
    tag++;
  });

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start()
    .onComplete(() => {
      // Bisa dioperasikan setelah animasi selesai
      // setLotteryStatus();
      // BUKAN setLotteryStatus(), tapi kita panggil fungsi untuk masuk mode konfirmasi
      enterConfirmationMode();
    });
}

// GANTI SELURUH FUNGSI INI DENGAN VERSI BARU
function enterConfirmationMode() {
    btns.lottery.classList.add('none');
    document.querySelector('#reLottery').classList.add('none');
    document.querySelector('#confirmWinnersBtn').classList.remove('none');
    document.querySelector('#cancelDrawBtn').classList.remove('none');
    invalidatedLuckys = [];

    selectedCardIndex.forEach((cardIndex, index) => {
        const cardElement = threeDCards[cardIndex].element;
        const luckyUser = currentLuckys[index];

        const cardClickHandler = () => {
            console.group(`--- MENG-KLIK KARTU PEMENANG ---`);
            console.log("Data Pemenang yang di-klik:", luckyUser);

            cardElement.classList.toggle('invalidated');

            // === PERBAIKAN UTAMA DI SINI ===
            // Kita bandingkan objeknya secara langsung, bukan hanya ID-nya. Ini lebih andal.
            const invalidatedIndex = invalidatedLuckys.findIndex(user => user === luckyUser);

            if (invalidatedIndex > -1) {
                // Jika sudah ada, hapus (artinya pembatalan 'tidak sah')
                invalidatedLuckys.splice(invalidatedIndex, 1);
            } else {
                // Jika belum ada, tambahkan
                invalidatedLuckys.push(luckyUser);
            }
            
            console.log("Isi 'invalidatedLuckys' sekarang:", invalidatedLuckys);
            console.groupEnd();
        };

        cardElement.handler = cardClickHandler;
        cardElement.addEventListener('click', cardElement.handler);
    });
}

/**
 * Reset konten kartu undian
 */
function resetCard(duration = 500) {
  if (currentLuckys.length === 0) {
    return Promise.resolve();
  }

  selectedCardIndex.forEach(index => {
    let object = threeDCards[index],
      target = targets.sphere[index];

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  });

  return new Promise((resolve, reject) => {
    new TWEEN.Tween(this)
      .to({}, duration * 2)
      .onUpdate(render)
      .start()
      .onComplete(() => {
        selectedCardIndex.forEach(index => {
          let object = threeDCards[index];
          object.element.classList.remove("prize");
        });
        resolve();
      });
  });
}

/**
 * Mengundi
 */
/**
 * Menjalankan proses undian.
 * @param {object} redrawInfo - (Opsional) Objek berisi pesanan undi ulang per wilayah.
 * Contoh: { JATENG: 1, BALNUS: 2 }
 */
function lottery(redrawInfo) {
  btns.lottery.innerHTML = "Hentikan Undian";
  rotateBall().then(() => {
    currentLuckys = [];
    selectedCardIndex = [];

    const isRedraw = redrawInfo && Object.keys(redrawInfo).length > 0;

    if (isRedraw) {
      // --- BLOK UNDIAN ULANG SPESIFIK (SUDAH BENAR) ---
      console.log("Menjalankan mode UNDI ULANG dengan pesanan:", redrawInfo);
      let leftPrizeCount = currentPrize.count - (basicData.luckyUsers[currentPrize.type] || []).length;
      for (const region in redrawInfo) {
        const countNeeded = redrawInfo[region];
        const regionalPool = basicData.leftUsers.filter(u => (u.region || 'GLOBAL').trim().toUpperCase() === region.trim().toUpperCase());
        for (let i = 0; i < countNeeded; i++) {
          if (regionalPool.length > 0 && leftPrizeCount > 0) {
            let luckyId = random(regionalPool.length);
            let winner = regionalPool.splice(luckyId, 1)[0];
            let leftIdx = basicData.leftUsers.findIndex(u => u === winner);
            if (leftIdx !== -1) basicData.leftUsers.splice(leftIdx, 1);
            currentLuckys.push(winner);
            leftPrizeCount--;
            let cardIndex = random(TOTAL_CARDS);
            while (selectedCardIndex.includes(cardIndex)) {
              cardIndex = random(TOTAL_CARDS);
            }
            selectedCardIndex.push(cardIndex);
          } else {
            addQipao(`Peserta dari wilayah ${region} tidak cukup untuk diundi ulang.`);
            break;
          }
        }
      }
    } else {
      // --- BLOK UNDIAN NORMAL (DENGAN PERBAIKAN FINAL) ---
      const luckyData = basicData.luckyUsers[currentPrize.type] || [];
      let leftPrizeCount = currentPrize.count - luckyData.length;

      if (leftPrizeCount <= 0) {
        addQipao(`Semua hadiah untuk [${currentPrize.title}] sudah diundi.`);
        setLotteryStatus(false);
        btns.lottery.innerHTML = "Mulai Undian";
        return;
      }

      const batch = EACH_COUNT[currentPrizeIndex];
      const countForThisTurn = Math.min(batch, leftPrizeCount);

      if (currentPrize.regionQuota) {
        let regionList = Object.entries(currentPrize.regionQuota).map(([region, quota]) => {
          let sudahMenang = luckyData.filter(u => u.region === region).length;
          return { region, quotaLeft: quota - sudahMenang };
        }).filter(r => r.quotaLeft > 0);
        let pool = {};
        regionList.forEach(r => {
          pool[r.region] = basicData.leftUsers.filter(u => (u.region || '').trim().toUpperCase() === r.region.trim().toUpperCase());
        });

        // === PERBAIKAN: Definisi diletakkan di sini, sebelum digunakan ===
        let pickedCount = 0;
        let regionIdx = 0;

        while (pickedCount < countForThisTurn && leftPrizeCount > 0 && regionList.length > 0) {
          let r = regionList[regionIdx % regionList.length];
          let pesertaRegion = pool[r.region];
          if (pesertaRegion && pesertaRegion.length > 0 && r.quotaLeft > 0) {
            let luckyId = random(pesertaRegion.length);
            let winner = pesertaRegion.splice(luckyId, 1)[0];
            let leftIdx = basicData.leftUsers.findIndex(u => u === winner);
            if (leftIdx !== -1) basicData.leftUsers.splice(leftIdx, 1);
            currentLuckys.push(winner);
            let cardIndex = random(TOTAL_CARDS);
            while (selectedCardIndex.includes(cardIndex)) {
              cardIndex = random(TOTAL_CARDS);
            }
            selectedCardIndex.push(cardIndex);
            r.quotaLeft--;
            pickedCount++;
            leftPrizeCount--;
          }
          regionIdx++;
          regionList = regionList.filter(rr => rr.quotaLeft > 0);
          if (regionList.length === 0) break;
        }
        if (pickedCount < countForThisTurn) {
          addQipao(`Pemenang yang bisa diundi hanya ${pickedCount} dari ${countForThisTurn} (kuota/partisipan region habis).`);
        }
      } else {
        // Logika undian global tanpa region
        let leftCount = basicData.leftUsers.length;
        let undiCount = Math.min(countForThisTurn, leftCount);
        if (leftCount < countForThisTurn) {
          addQipao(`Peserta undian yang tersisa hanya ${leftCount}, akan diundi semua!`);
        }
        for (let i = 0; i < undiCount; i++) {
          let luckyId = random(leftCount);
          currentLuckys.push(basicData.leftUsers.splice(luckyId, 1)[0]);
          leftCount--;
          leftPrizeCount--;
          let cardIndex = random(TOTAL_CARDS);
          while (selectedCardIndex.includes(cardIndex)) {
            cardIndex = random(TOTAL_CARDS);
          }
          selectedCardIndex.push(cardIndex);
          if (leftPrizeCount === 0) {
            break;
          }
        }
      }
    }

    selectCard();
  });
}

/**
 * Menyimpan hasil undian sebelumnya
 */
// GANTI SELURUH FUNGSI SAVEDATA ANDA DENGAN INI
function saveData(winnersToSave) {
  if (!currentPrize) {
    return Promise.resolve();
  }

  const luckys = winnersToSave !== undefined ? winnersToSave : currentLuckys;
  if (!luckys || luckys.length === 0) {
    return Promise.resolve();
  }

  let type = currentPrize.type;
  let existingLuckys = basicData.luckyUsers[type] || [];
  const allLuckysForPrize = existingLuckys.concat(luckys);
  basicData.luckyUsers[type] = allLuckysForPrize;

  // Di sinilah perpindahan hadiah berpotensi terjadi
  if (currentPrize.count <= allLuckysForPrize.length) {
    // ===================================================================
    // KITA PASANG MATA-MATA SUPER LENGKAP DI SINI
    console.group(`--- HADIAH '${currentPrize.title}' SUDAH HABIS, MEMULAI PERPINDAHAN ---`);
    console.log("Kondisi SEBELUM pindah:");
    console.log("Index Hadiah LAMA:", currentPrizeIndex);
    console.log("Total Pemenang Tercatat:", allLuckysForPrize.length);
    console.log("Kuota Hadiah:", currentPrize.count);
    
    // Pindah ke hadiah berikutnya
    currentPrizeIndex--;
    if (currentPrizeIndex < 0) { // Pakai < 0 agar lebih aman
      currentPrizeIndex = 0; // Atau hentikan jika semua benar-benar habis
    }
    currentPrize = basicData.prizes[currentPrizeIndex];

    console.log("-----------------------------------------");
    console.log("Kondisi SETELAH pindah:");
    console.log("Index Hadiah BARU:", currentPrizeIndex);
    console.log("Objek Hadiah BARU:", currentPrize);

    // Langsung periksa kondisi untuk hadiah baru ini
    const nextLuckyData = basicData.luckyUsers[currentPrize.type] || [];
    console.log("Pemenang untuk hadiah BARU (seharusnya kosong):", nextLuckyData);
    
    const nextLeftCount = currentPrize.count - nextLuckyData.length;
    console.log(`Perhitungan sisa hadiah untuk hadiah BARU: ${currentPrize.count} - ${nextLuckyData.length} = ${nextLeftCount}`);
    
    if (nextLeftCount <= 0) {
        console.error("!!! MASALAH TERDETEKSI: Sisa hadiah untuk hadiah berikutnya sudah 0. Ini penyebab macet.");
    }
    console.groupEnd();
    // ===================================================================
  }

  return setData(type, luckys);
}

function changePrize() {
  let luckys = basicData.luckyUsers[currentPrize.type];
  let luckyCount = (luckys ? luckys.length : 0) + EACH_COUNT[currentPrizeIndex];
  // Ubah jumlah dan persentase prize di sebelah kiri
  setPrizeData(currentPrizeIndex, luckyCount);
}

/**
 * Undian acak
 */
function random(num) {
  return Math.floor(Math.random() * num);
}

/**
 * Mengganti informasi peserta di kartu nama
 */
function changeCard(cardIndex, user) {
  let card = threeDCards[cardIndex].element;

  card.innerHTML = `<div class="company">${COMPANY}</div><div class="name">${user.msisdn
    }</div><div class="details">${user.region || ""}<br/>${user.city || "PSST"}</div>`;
}

/**
 * Mengganti latar belakang kartu nama
 */
function shine(cardIndex, color) {
  let card = threeDCards[cardIndex].element;
  card.style.backgroundColor =
    color || "rgba(0,127,127," + (Math.random() * 0.7 + 0.25) + ")";
}

/**
 * Mengganti latar belakang dan informasi peserta secara acak
 */
function shineCard() {
  let maxCard = 10,
    maxUser;
  let shineCard = 10 + random(maxCard);

  setInterval(() => {
    // Berhenti berkedip jika sedang mengundi
    if (isLotting) {
      return;
    }
    maxUser = basicData.leftUsers.length;
    for (let i = 0; i < shineCard; i++) {
      let index = random(maxUser),
        cardIndex = random(TOTAL_CARDS);
      // Daftar pemenang yang sedang ditampilkan tidak diganti secara acak
      if (selectedCardIndex.includes(cardIndex)) {
        continue;
      }
      shine(cardIndex);
      changeCard(cardIndex, basicData.leftUsers[index]);
    }
  }, 500);
}

function setData(type, data) {
  return new Promise((resolve, reject) => {
    window.AJAX({
      url: "/saveData",
      data: {
        type,
        data
      },
      success() {
        resolve();
      },
      error() {
        reject();
      }
    });
  });
}

function setErrorData(data) {
  return new Promise((resolve, reject) => {
    window.AJAX({
      url: "/errorData",
      data: {
        data
      },
      success() {
        resolve();
      },
      error() {
        reject();
      }
    });
  });
}

function exportData() {
  window.AJAX({
    url: "/export",
    success(data) {
      if (data.type === "success") {
        location.href = data.url;
      }
    }
  });
}

function reset() {
  window.AJAX({
    url: "/reset",
    success(data) {
      console.log("Reset berhasil");
    }
  });
}

// function createHighlight() {
//   let year = new Date().getFullYear() + "";
//   let step = 4,
//     xoffset = 1,
//     yoffset = 1,
//     highlight = [];

//   year.split("").forEach(n => {
//     highlight = highlight.concat(
//       NUMBER_MATRIX[n].map(item => {
//         return `${item[0] + xoffset}-${item[1] + yoffset}`;
//       })
//     );
//     xoffset += step;
//   });

//   return highlight;
// }

function createHighlight() {
  let word = "SETIA";
  let step = 4;
  let xoffset = 1;
  let yoffset = 1;
  let highlight = [];

  const totalWidth = (word.length * step) - (step - 3);
  const gridWidth = COLUMN_COUNT;
  xoffset = Math.floor((gridWidth - totalWidth) / 2);

  word.split("").forEach(char => {
    if (LETTER_MATRIX[char]) {
      highlight = highlight.concat(
        LETTER_MATRIX[char].map(item => {
          return `${item[0] + xoffset}-${item[1] + yoffset}`;
        })
      );
    }
    xoffset += step;
  });

  return highlight;
}

// Tambahkan fungsi-fungsi baru ini di file index.js Anda

// GANTI SELURUH FUNGSI HANDLECONFIRM ANDA DENGAN INI
function handleConfirm() {
  setLotteryStatus(true);

  const validWinners = currentLuckys.filter(
    lucky => !invalidatedLuckys.find(invalid => invalid === lucky)
  );
  const usersToReturn = invalidatedLuckys;

  const redrawInfo = usersToReturn.reduce((acc, user) => {
    const region = user.region;
    if (region) {
      acc[region] = (acc[region] || 0) + 1;
    } else {
      acc.GLOBAL = (acc.GLOBAL || 0) + 1;
    }
    return acc;
  }, {});
  
  usersToReturn.forEach(user => {
    basicData.leftUsers.push(user);
  });

  // 1. Simpan dulu pemenang yang sudah pasti SAH
  saveData(validWinners).then(() => {
    resetUIAndCards().then(() => {
      if (Object.keys(redrawInfo).length > 0) {
        addQipao(`Mengundi ulang untuk ${Object.values(redrawInfo).reduce((a, b) => a + b, 0)} slot yang kosong...`);
        
        // 2. Jalankan undian ulang DAN TANGKAP HASILNYA dengan .then()
        lottery(redrawInfo).then(newlyDrawnWinners => {
          console.log("Pemenang hasil undi ulang:", newlyDrawnWinners);
          
          // 3. SIMPAN PEMENANG BARU HASIL UNDI ULANG
          if (newlyDrawnWinners && newlyDrawnWinners.length > 0) {
            saveData(newlyDrawnWinners).then(() => {
              addQipao("Undi ulang selesai dan semua pemenang telah disimpan!");
              setLotteryStatus(false);
            });
          } else {
            addQipao("Undi ulang selesai.");
            setLotteryStatus(false);
          }
        });
      } else {
        addQipao("Semua pemenang telah dikonfirmasi!");
        setLotteryStatus(false);
      }
    });
  });
}

function handleCancel() {
    // Fungsi ini sederhana, hanya mereset ke keadaan sebelum undian
    addQipao("Undian saat ini dibatalkan, semua pemenang akan diundi ulang.");
    resetUIAndCards().then(() => {
        setLotteryStatus(false);
    });
}

// Fungsi helper untuk membersihkan UI
function resetUIAndCards() {
    // Sembunyikan tombol konfirmasi
    document.querySelector('#confirmWinnersBtn').classList.add('none');
    document.querySelector('#cancelDrawBtn').classList.add('none');
    
    // Tampilkan kembali tombol utama
    btns.lottery.classList.remove('none');
    document.querySelector('#reLottery').classList.remove('none');

    // Hapus event listener dari kartu-kartu
    selectedCardIndex.forEach(cardIndex => {
        const cardElement = threeDCards[cardIndex].element;
        if (cardElement.handler) {
            cardElement.removeEventListener('click', cardElement.handler);
        }
    });

    // Reset visual kartu
    return resetCard(); 
}

let onload = window.onload;

window.onload = function () {
  onload && onload();

  let music = document.querySelector("#music");

  let rotated = 0,
    stopAnimate = false,
    musicBox = document.querySelector("#musicBox");

  function animate() {
    requestAnimationFrame(function () {
      if (stopAnimate) {
        return;
      }
      rotated = rotated % 360;
      musicBox.style.transform = "rotate(" + rotated + "deg)";
      rotated += 1;
      animate();
    });
  }

  musicBox.addEventListener(
    "click",
    function (e) {
      if (music.paused) {
        music.play().then(
          () => {
            stopAnimate = false;
            animate();
          },
          () => {
            addQipao("Musik latar gagal diputar otomatis, harap putar manual!");
          }
        );
      } else {
        music.pause();
        stopAnimate = true;
      }
    },
    false
  );

  setTimeout(function () {
    musicBox.click();
  }, 1000);
};