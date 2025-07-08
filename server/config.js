/**
 * Konfigurasi Hadiah
 * type: Pengidentifikasi unik, 0 adalah placeholder untuk hadiah spesial default, tidak bisa digunakan oleh hadiah lain
 * count: Jumlah hadiah
 * title: Deskripsi hadiah
 * text: Judul hadiah
 * img: URL gambar
 */
const prizes = [
  {
    type: 0,
    count: 0,
    title: "",
    text: "Hadiah Spesial"
  },
  {
    type: 1,
    count: 3,
    text: "Hadiah Utama",
    title: "Honda Beat Deluxe Smart Key",
    img: "../img/beat.jpg",
    regionQuota: { BALNUS: 1, JATENG: 1, JATIM: 1 }
  },
  {
    type: 2,
    count: 3,
    text: "Hadiah Kedua",
    title: "Samsung S24",
    img: "../img/s24.jpg",
    regionQuota: { BALNUS: 1, JATENG: 1, JATIM: 1 }
  },
  {
    type: 3,
    count: 9,
    text: "Hadiah Ketiga",
    title: "Xiaomi 14T Pro",
    img: "../img/xiaomi.jpg",
    regionQuota: { BALNUS: 3, JATENG: 3, JATIM: 3 }
  },
  {
    type: 4,
    count: 9,
    text: "Hadiah Keempat",
    title: "Sepeda Listrik Lankeileisi S20 Pro",
    img: "../img/sepeda.jpg",
    regionQuota: { BALNUS: 3, JATENG: 3, JATIM: 3 }
  },
  {
    type: 5,
    count: 9,
    text: "Hadiah Kelima",
    title: "Galaxy Tab A9+ 5G",
    img: "../img/galaxytab.jpg",
    regionQuota: { BALNUS: 3, JATENG: 3, JATIM: 3 }
  },
];

/**
 * Jumlah hadiah yang diambil sekali undi, sesuai dengan array prizes
 */
const EACH_COUNT = [1, 1, 3, 9, 9, 9];

/**
 * Identifikasi nama perusahaan pada kartu
 */
const COMPANY = "Telkomsel";

module.exports = {
  prizes,
  EACH_COUNT,
  COMPANY
};