const CryptoChain = require('./blockchain');
const Block = require('./block');

let dafzikChain = new CryptoChain();

console.log("=== Menginisialisasi Batch Input 12 Blok ===\n");

// Data Market Cap yang sudah kamu kumpulkan
const historicalData = [
    { symbol: "BTCUSDT", price: "95,432.10", marketCap: "1.89T", analysis: "Bullish Strong" },
    { symbol: "ETHUSDT", price: "2,745.50", marketCap: "330.4B", analysis: "Consolidating" },
    { symbol: "SOLUSDT", price: "184.20", marketCap: "87.1B", analysis: "High Volume" },
    { symbol: "BNBUSDT", price: "592.15", marketCap: "85.8B", analysis: "Stable" },
    { symbol: "XRPUSDT", price: "2.45", marketCap: "139.7B", analysis: "Pump Expected" },
    { symbol: "ADAUSDT", price: "0.72", marketCap: "25.6B", analysis: "Accumulating" },
    { symbol: "AVAXUSDT", price: "34.10", marketCap: "14.2B", analysis: "Neutral" },
    { symbol: "DOTUSDT", price: "6.85", marketCap: "9.8B", analysis: "Support Level" },
    { symbol: "LINKUSDT", price: "17.40", marketCap: "10.5B", analysis: "Oracle High Demand" },
    { symbol: "PLUME", price: "1.25", marketCap: "250M", analysis: "New Listing Focus" },
    { symbol: "SUIUSDT", price: "3.10", marketCap: "8.9B", analysis: "L1 Growing" },
    { symbol: "NEARUSDT", price: "4.55", marketCap: "5.6B", analysis: "AI Narrative" }
];

// Memasukkan data secara otomatis ke dalam rantai
historicalData.forEach((data, i) => {
    console.log(`Menambahkan Blok ${i + 1} (${data.symbol})...`);
    dafzikChain.addBlock(data);
});

console.log("\n=== STATUS BLOCKCHAIN ===");
console.log("Jumlah Blok  : " + dafzikChain.chain.length);
console.log("Chain Valid? : " + dafzikChain.isChainValid());

// Menampilkan blok terakhir (Index 12)
console.log("\n=== DETAIL BLOK TERAKHIR ===");
console.log(JSON.stringify(dafzikChain.getLatestBlock(), null, 4));