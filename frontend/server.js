const express = require('express');
const multer  = require('multer');
const axios   = require('axios');
const FormData = require('form-data');
const fs   = require('fs');
const path = require('path');

const app  = express();
const PORT = 3000;

// ── View Engine ──────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Static Files ─────────────────────────────────────────────
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// ── Upload Config ─────────────────────────────────────────────
const upload = multer({ dest: 'uploads/' });

// ── In-memory history store (reset on server restart) ─────────
let analysisHistory = [];

// ── Routes ───────────────────────────────────────────────────

// Redirect root → beranda
app.get('/', (req, res) => {
    res.redirect('/beranda');
});

// Beranda (Landing Page)
app.get('/beranda', (req, res) => {
    res.render('beranda');
});

// Halaman Analisis
app.get('/analisis', (req, res) => {
    res.render('analisis', { result: null, imagePath: null, error: null, fromHistory: false });
});

// Proses Analisis (POST)
app.post('/cek-kelayakan', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.render('analisis', {
                result: null, imagePath: null,
                error: 'Mohon unggah gambar manggis terlebih dahulu!'
            });
        }

        const formData = new FormData();
        formData.append('image', fs.createReadStream(req.file.path));

        const aiResponse = await axios.post('http://127.0.0.1:5000/predict', formData, {
            headers: { ...formData.getHeaders() }
        });

        const result    = aiResponse.data;
        const imagePath = `/uploads/${req.file.filename}`;

        // Simpan ke riwayat
        const layakCount = result.data
            ? result.data.filter(d => d.kelayakan === 'Layak Ekspor').length
            : 0;
        const entryId = Date.now();
        analysisHistory.unshift({
            id:        entryId,
            tanggal:   new Date().toISOString(),
            imagePath: imagePath,
            jumlah:    result.jumlah_manggis_terdeteksi || 0,
            layak:     layakCount,
            result:    result,
        });

        res.render('analisis', { result, imagePath, error: null, fromHistory: false });

    } catch (err) {
        console.error('Error dari AI Service:', err.message);
        res.render('analisis', {
            result: null, imagePath: null,
            error: 'Gagal terhubung ke AI Service. Pastikan server Python sudah berjalan.',
            fromHistory: false,
        });
    }
});

// Riwayat Analisis
app.get('/riwayat', (req, res) => {
    res.render('riwayat', { history: analysisHistory });
});

// Detail Riwayat — tampilkan ulang hasil analisis
app.get('/riwayat/:id', (req, res) => {
    const entry = analysisHistory.find(h => String(h.id) === req.params.id);
    if (!entry) return res.redirect('/riwayat');
    res.render('analisis', {
        result:      entry.result,
        imagePath:   entry.imagePath,
        error:       null,
        fromHistory: true,
    });
});

// About Us
app.get('/about', (req, res) => {
    res.render('about');
});

// Backward compat — index redirect
app.get('/index', (req, res) => {
    res.redirect('/analisis');
});

// ── Start Server ──────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🍇  Manggoes berjalan di http://localhost:${PORT}\n`);
    console.log(`   Beranda  → http://localhost:${PORT}/beranda`);
    console.log(`   Analisis → http://localhost:${PORT}/analisis`);
    console.log(`   Riwayat  → http://localhost:${PORT}/riwayat`);
    console.log(`   About    → http://localhost:${PORT}/about\n`);
});