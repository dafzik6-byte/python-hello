const express = require('express');
const cors = require('cors'); // <--- Tambahkan ini
const CryptoChain = require('./blockchain');

const app = express();
const port = 5000;

const dafzikChain = new CryptoChain();

app.use(cors()); // <--- Tambahkan ini (IZIN AKSES UNTUK FRONTEND)
app.use(express.json());

// ... sisa route lainnya sama (GET /blocks, POST /mine, dll) ...

app.listen(port, () => {
    console.log(`🚀 SERVER SIAP MELAYANI FRONTEND DI PORT ${port}`);
});