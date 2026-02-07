const whaleSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
let isMuted = false;
let tradeWS, allSymbols = [], tradeHistory = [];
let baseVol = 0, baseCount = 0, circSupply = 0, lastP = 0;

// --- WATCHLIST & AUTO-TOKENOMIC LOGIC ---
let upcomingCoins = JSON.parse(localStorage.getItem('myWatchlist')) || [];
const tokenomicsDB = { 
    "MYX": "2026-02-07T23:30:00", 
    "MONAD": "2026-02-15T15:00:00", 
    "ZAMA": "2026-02-10T10:00:00" 
};

function addCoinPrompt() {
    const name = prompt("Ketik Nama Koin (Contoh: MYX):").toUpperCase();
    if(!name) return;
    let time;
    if(tokenomicsDB[name]) {
        time = tokenomicsDB[name];
        alert(name + " terdeteksi! Mengambil data otomatis...");
    } else {
        const manual = prompt("Data tidak ada. Masukkan waktu (YYYY-MM-DD HH:MM:SS):", "2026-02-08 20:00:00");
        if(!manual) return;
        time = manual.replace(" ", "T");
    }
    upcomingCoins.push({ name, time });
    saveAndRender();
}

function saveAndRender() { 
    localStorage.setItem('myWatchlist', JSON.stringify(upcomingCoins)); 
    renderWatchlist(); 
}

function renderWatchlist() {
    const container = document.getElementById('watchlist-container');
    const now = new Date().getTime();
    upcomingCoins.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    container.innerHTML = '';
    upcomingCoins.forEach((c, i) => {
        const diff = new Date(c.time).getTime() - now;
        const isReleased = diff <= 0;
        let tStr = "LIVE NOW";
        if(!isReleased) {
            const d = Math.floor(diff/86400000), 
                  h = Math.floor((diff%86400000)/3600000), 
                  m = Math.floor((diff%3600000)/60000), 
                  s = Math.floor((diff%60000)/1000);
            tStr = `${d}d ${h}h ${m}m ${s}s`;
        }
        container.innerHTML += `
            <div class="listing-item ${isReleased ? 'released' : ''}">
                <div><b style="font-size:13px">${c.name}</b><div style="font-size:8px; color:var(--gray)">${c.time.split('T')[0]}</div></div>
                <div style="text-align:right">
                    <div style="font-family:'Roboto Mono'; font-size:11px; color:${isReleased ? 'var(--up)' : 'var(--yellow)'}">${tStr}</div>
                    <span onclick="delCoin(${i})" style="color:var(--down); font-size:9px; cursor:pointer">DEL</span>
                </div>
            </div>`;
    });
}

function delCoin(i) { upcomingCoins.splice(i, 1); saveAndRender(); }
setInterval(renderWatchlist, 1000);

// --- CORE LOGIC ---
const coinMap = { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'BNB': 'binancecoin', 'XRP': 'ripple', 'ADA': 'cardano', 'DOGE': 'dogecoin' };
const savedLimit = localStorage.getItem('whaleLimit');

if (savedLimit) document.getElementById('whale-input').value = savedLimit;
document.getElementById('whale-input').onchange = (e) => localStorage.setItem('whaleLimit', e.target.value);
document.getElementById('mute-btn').onclick = function() { 
    isMuted = !isMuted; 
    this.innerText = isMuted ? '🔇' : '🔊'; 
};

async function updateMarketSeason() {
    try {
        const symbols = ["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT"];
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`);
        const data = await res.json();
        const btc = data.find(x => x.symbol === "BTCUSDT");
        const btcChange = parseFloat(btc.priceChangePercent);
        const alts = data.filter(x => x.symbol !== "BTCUSDT");
        const altsAvgChange = alts.reduce((acc, curr) => acc + parseFloat(curr.priceChangePercent), 0) / alts.length;
        let score = 50 + ((altsAvgChange - btcChange) * 5); 
        score = Math.min(Math.max(score, 5), 95);
        document.getElementById('season-progress').style.width = score + '%';
        const textEl = document.getElementById('season-text');
        if (score > 60) { textEl.innerText = "ALTCOIN SEASON"; textEl.style.color = "var(--up)"; }
        else if (score < 40) { textEl.innerText = "BITCOIN SEASON"; textEl.style.color = "var(--yellow)"; }
        else { textEl.innerText = "NEUTRAL MOMENTUM"; textEl.style.color = "#fff"; }
    } catch (e) {}
}

async function fetchFund(s) {
    try {
        const ticker = s.replace('USDT', '');
        const id = coinMap[ticker] || ticker.toLowerCase();
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}`);
        const d = await res.json();
        if(d.market_data) {
            circSupply = d.market_data.circulating_supply;
            document.getElementById('disp-circ').innerText = Math.round(circSupply).toLocaleString();
            if(lastP > 0) document.getElementById('live-mkt-cap').innerText = `$${Math.round(lastP * circSupply).toLocaleString()}`;
        }
    } catch(e) { document.getElementById('disp-circ').innerText = "Data N/A"; }
}

async function startLive(symbol) {
    if (tradeWS) tradeWS.close();
    tradeHistory = [];
    try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        const d = await res.json();
        baseVol = parseFloat(d.quoteVolume); baseCount = parseInt(d.count); lastP = parseFloat(d.lastPrice);
        document.getElementById('price-change').innerText = `${parseFloat(d.priceChangePercent).toFixed(2)}%`;
        document.getElementById('price-change').style.color = d.priceChangePercent >= 0 ? 'var(--up)' : 'var(--down)';
    } catch(e) {}
    fetchFund(symbol);
    tradeWS = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@aggTrade`);
    tradeWS.onmessage = (e) => {
        const data = JSON.parse(e.data);
        const p = parseFloat(data.p), v = p * parseFloat(data.q), limit = parseFloat(document.getElementById('whale-input').value) || 50000;
        const pEl = document.getElementById('live-price');
        pEl.style.color = p >= lastP ? 'var(--up)' : 'var(--down)';
        pEl.innerText = `$${p.toLocaleString()}`;
        if(circSupply > 0) document.getElementById('live-mkt-cap').innerText = `$${Math.round(p * circSupply).toLocaleString()}`;
        baseVol += v; baseCount++;
        document.getElementById('live-vol-24h').innerText = `$${Math.round(baseVol).toLocaleString()}`;
        document.getElementById('live-count-24h').innerText = baseCount.toLocaleString();
        let isWhale = v >= limit;
        if (isWhale) {
            if(!isMuted) { whaleSound.currentTime = 0; whaleSound.play().catch(()=>{}); }
            document.body.style.backgroundColor = "#1c1c1c";
            setTimeout(() => document.body.style.backgroundColor = "#0b0e11", 150);
        }
        tradeHistory.push({v, s: data.m});
        if(tradeHistory.length > 50) tradeHistory.shift();
        let bv=0, sv=0; tradeHistory.forEach(t=> t.s ? sv+=t.v : bv+=t.v);
        const total = bv+sv;
        document.getElementById('buy-bar').style.width = (bv/total*100)+'%';
        document.getElementById('buy-pct').innerText = Math.round(bv/total*100)+'%';
        document.getElementById('sell-pct').innerText = Math.round(sv/total*100)+'%';
        const row = `<div class="trade-entry ${isWhale ? 'whale-row' : ''}"><span>${isWhale ? '🐋 WHALE' : new Date().toLocaleTimeString([], {hour12:false})}</span><span style="color:${data.m ? 'var(--down)' : 'var(--up)'}; font-weight:bold">${p.toFixed(symbol.includes('BTC') ? 2 : 4)}</span><b style="${isWhale ? 'color:var(--yellow)' : ''}">$${Math.round(v).toLocaleString()}</b></div>`;
        const f = document.getElementById('trade-feed');
        f.insertAdjacentHTML('afterbegin', row);
        if (f.childNodes.length > 40) f.lastChild.remove();
        lastP = p;
    };
}

async function refreshFearGreedGauge() {
    try {
        const response = await fetch('https://api.alternative.me/fng/');
        const json = await response.json();
        const value = parseInt(json.data[0].value);
        document.getElementById('fg-value-display').innerText = value;
        document.getElementById('fg-status-text').innerText = json.data[0].value_classification.toUpperCase();
        document.getElementById('fg-needle').style.transform = `translateX(-50%) rotate(${(value * 1.8) - 90}deg)`;
    } catch (err) {}
}

function loadChart(s) {
    new TradingView.widget({
        "autosize": true, 
        "symbol": "BINANCE:"+s, 
        "interval": "1", 
        "theme": "dark", 
        "container_id": "tv_engine", 
        "timezone": "Asia/Jakarta", 
        "hide_side_toolbar": false, 
        "allow_symbol_change": true, 
        "save_image": false
    });
}

// Gabungkan semua menjadi satu object sectorConfig
const sectorConfig = {
    "LAYER 1 (MAJORS)": ["BTC", "ETH", "SOL", "BNB", "ADA", "AVAX", "DOT", "NEAR", "SUI", "APT", "ALGO", "INJ"],
    "LAYER 2 (ETH)": ["OP", "ARB", "MATIC", "STRK", "METIS", "MANTA", "ZK", "CELO", "LRC"],
    "AI & BIG DATA": ["FET", "TAO", "RNDR", "GRT", "NEAR", "ARKM", "GLM", "AIOZ", "PHB"],
    "MEME COINS": ["DOGE", "SHIB", "PEPE", "WIF", "BONK", "FLOKI", "MEME", "BOME", "MYRO"],
    "DEFI 2.0": ["UNI", "AAVE", "LINK", "CAKE", "MKR", "PENDLE", "JUP", "RAY", "CRV", "LDO"],
    "RWA (REAL WORLD ASSET)": ["ONDO", "POLYX", "OM", "CFG", "GFI", "TRU", "MPL"],
    "DEPIN": ["HNT", "FIL", "AR", "THETA", "IOTX", "ANKR", "JASMY"],
    "GAMING & METAVERSE": ["IMX", "GALA", "BEAM", "AXS", "PIXEL", "PORTAL", "SAND", "MANA", "ENJ"],
    "STORAGE & CLOUD": ["FIL", "STORJ", "SC", "BLZ", "BTT"],
    "PRIVACY & SECURITY": ["ZEC", "ZEN", "ROSE", "NYM", "SCRT"]
};

async function updateNarrativeWatchlist() {
    try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        if (!res.ok) throw new Error('Network response was not ok');
        const allTickers = await res.json();
        
        const grid = document.getElementById('narrative-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (const [sectorName, coins] of Object.entries(sectorConfig)) {
            // Filter koin yang valid untuk sektor ini
            let sectorTickers = allTickers.filter(t => 
                coins.some(c => t.symbol === c + "USDT")
            );

            if (sectorTickers.length === 0) continue;

            // HITUNG RATA-RATA PERFORMANCE SEKTOR
            const avgChange = sectorTickers.reduce((acc, curr) => acc + parseFloat(curr.priceChangePercent), 0) / sectorTickers.length;
            const avgColor = avgChange >= 0 ? 'var(--up)' : 'var(--down)';

            // Urutkan koin berdasarkan gainer tertinggi
            sectorTickers.sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));

            let coinRowsHtml = '';
            // Ambil 4 koin teratas per sektor
            sectorTickers.slice(0, 4).forEach(coin => {
                const change = parseFloat(coin.priceChangePercent).toFixed(2);
                const isPos = change >= 0;
                const cleanSymbol = coin.symbol.replace('USDT', '');
                
                coinRowsHtml += `
                    <div class="narrative-coin-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="font-weight: bold;">${cleanSymbol}</span>
                        <span class="pct-badge ${isPos ? 'pct-up' : 'pct-down'}" style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; ${isPos ? 'background: rgba(2,192,118,0.1); color: var(--up);' : 'background: rgba(248,73,96,0.1); color: var(--down);'}">
                            ${isPos ? '▲' : '▼'} ${Math.abs(change)}%
                        </span>
                    </div>`;
            });

            grid.innerHTML += `
                <div class="narrative-card" style="background: #181a20; border: 1px solid var(--line); border-radius: 6px; padding: 12px; transition: 0.3s;">
                    <div class="narrative-title" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 1px solid var(--line); padding-bottom: 8px;">
                        <div>
                            <div style="font-size: 10px; color: var(--yellow); font-weight: 800; letter-spacing: 0.5px;">${sectorName}</div>
                            <div style="font-size: 8px; color: var(--gray);">${sectorTickers.length} ASSETS</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 11px; font-weight: 900; color: ${avgColor}">${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%</div>
                            <div style="font-size: 7px; color: var(--gray);">AVG 24H</div>
                        </div>
                    </div>
                    ${coinRowsHtml}
                </div>
            `;
        }
        
        const updateEl = document.getElementById('last-update-narrative');
        if (updateEl) updateEl.innerText = "LAST SYNC: " + new Date().toLocaleTimeString();
        
    } catch (e) {
        console.error("Narrative Update Error:", e);
    }
}

// Inisialisasi awal
updateNarrativeWatchlist();
// Update otomatis setiap 30 detik
setInterval(updateNarrativeWatchlist, 30000);
// Jalankan fungsi
updateNarrativeWatchlist();
setInterval(updateNarrativeWatchlist, 30000); // Update setiap 30 detik

// 2. Fungsi Mengambil Data Sektor
async function updateNarrativeWatchlist() {
    try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        const allTickers = await res.json();
        const grid = document.getElementById('narrative-grid');
        grid.innerHTML = '';

        for (const [sectorName, coins] of Object.entries(sectorConfig)) {
            // Filter koin yang ada di sektor ini dari data Binance
            let sectorData = allTickers.filter(t => 
                coins.some(c => t.symbol === c + "USDT")
            );

            // Urutkan berdasarkan persentase kenaikan tertinggi
            sectorData.sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));

            // Ambil 3 teratas per sektor
            const top3 = sectorData.slice(0, 3);

            if (top3.length > 0) {
                let coinHtml = '';
                top3.forEach(coin => {
                    const change = parseFloat(coin.priceChangePercent).toFixed(2);
                    const colorClass = change >= 0 ? 'pos' : 'neg';
                    const cleanSymbol = coin.symbol.replace('USDT', '');
                    coinHtml += `
                        <div class="narrative-coin">
                            <span>${cleanSymbol}</span>
                            <span class="${colorClass}">${change > 0 ? '+' : ''}${change}%</span>
                        </div>`;
                });

                grid.innerHTML += `
                    <div class="narrative-card">
                        <div class="narrative-title">
                            <span>${sectorName}</span>
                            <span style="color:var(--yellow)">🔥</span>
                        </div>
                        ${coinHtml}
                    </div>
                `;
            }
        }
        document.getElementById('last-update-narrative').innerText = "LAST SYNC: " + new Date().toLocaleTimeString();
    } catch (e) {
        console.error("Narrative fetch error:", e);
    }
}

// 3. Tambahkan ke Lifecycle (panggil saat startup dan setiap 30 detik)
updateNarrativeWatchlist();
setInterval(updateNarrativeWatchlist, 30000);

// Inisialisasi daftar simbol dari Binance
fetch('https://api.binance.com/api/v3/exchangeInfo').then(r=>r.json()).then(d=>{
    allSymbols = d.symbols.filter(s=>s.quoteAsset==='USDT').map(s=>s.symbol);
});

// Event Listener untuk Search
document.getElementById('coin-search').addEventListener('input', (e)=>{
    const v = e.target.value.toUpperCase();
    const res = document.getElementById('search-results');
    res.innerHTML = '';
    if(v){
        res.style.display='block';
        allSymbols.filter(s=>s.includes(v)).slice(0,10).forEach(m=>{
            const i = document.createElement('div'); i.className='result-item'; i.innerText=m;
            i.onclick = () => { 
                loadChart(m); 
                startLive(m); 
                res.style.display='none'; 
                e.target.value=''; 
                document.getElementById('coin-name').innerText = m + ' / USDT'; 
            };
            res.appendChild(i);
        });
    } else res.style.display='none';
});

// Tambahkan ini di akhir file chart.js Anda
document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateNarrativeWatchlist === 'function') {
        updateNarrativeWatchlist();
        setInterval(updateNarrativeWatchlist, 30000);
    }
});

// Run Application
loadChart('BTCUSDT'); 
startLive('BTCUSDT'); 
refreshFearGreedGauge(); 
updateMarketSeason(); 
renderWatchlist();

setInterval(refreshFearGreedGauge, 300000); 
setInterval(updateMarketSeason, 60000);