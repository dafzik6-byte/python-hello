const crypto = require('crypto-js');
const fs = require('fs');

class Block {
    constructor(index, timestamp, data, previousHash = '', nonce = 0, hash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.nonce = nonce; 
        this.hash = hash || this.calculateHash();
    }

    calculateHash() {
        return crypto.SHA256(
            this.index +
            this.previousHash +
            this.timestamp +
            JSON.stringify(this.data) +
            this.nonce
        ).toString();
    }

    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== '0'.repeat(difficulty)) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log("Block mined: " + this.hash);
    }
}

class CryptoChain {
    constructor() {
        this.path = './blockchain.json';
        this.difficulty = 3;
        
        // 1. Muat data dari file
        this.chain = this.loadData(); 

        // 2. LANGSUNG VALIDASI
        if (this.isChainValid()) {
            console.log("✅ [Integritas] Rantai data valid dan aman.");
        } else {
            console.log("❌ [WARNING] DATA BLOCKCHAIN TELAH DIMODIFIKASI SECARA ILEGAL!");
        }
    }

    createGenesisBlock() {
        return new Block(0, "01/01/2026", "Genesis Block - Dafzik6 Terminal", "0");
    }

    loadData() {
        if (fs.existsSync(this.path)) {
            console.log("📂 [Sistem] Menemukan data lama. Memuat blockchain...");
            const data = fs.readFileSync(this.path);
            const parsedChain = JSON.parse(data);
            
            return parsedChain.map(blockData => new Block(
                blockData.index,
                blockData.timestamp,
                blockData.data,
                blockData.previousHash,
                blockData.nonce,
                blockData.hash
            ));
        } else {
            console.log("✨ [Sistem] Tidak ada data lama. Membuat Genesis Block...");
            return [this.createGenesisBlock()];
        }
    }

    saveData() {
        const dataString = JSON.stringify(this.chain, null, 4);
        fs.writeFileSync(this.path, dataString);
        console.log("💾 [Sistem] Blockchain berhasil diamankan ke file!");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(newData) {
        const newBlock = new Block(
            this.chain.length,
            new Date().toLocaleString(),
            newData,
            this.getLatestBlock().hash
        );
        console.log(`Menambang blok ${newBlock.index}...`);
        newBlock.mineBlock(this.difficulty); 
        this.chain.push(newBlock);
        this.saveData(); 
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                console.log("Bahaya! Hash blok " + i + " tidak valid!");
                return false;
            }
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.log("Bahaya! Rantai terputus di blok " + i);
                return false;
            }
        }
        return true;
    }
}

module.exports = CryptoChain;