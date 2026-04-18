const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Konfigurasi EJS sebagai View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware untuk menyajikan file statis dan folder uploads agar gambar bisa ditampilkan di web
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Konfigurasi Multer untuk penyimpanan gambar sementara
const upload = multer({ dest: 'uploads/' });

// Route GET: Menampilkan Halaman Utama
app.get('/', (req, res) => {
    res.render('index', { result: null, imagePath: null, error: null });
});

// Route POST: Menangani Upload Gambar & Memanggil AI Service
app.post('/cek-kelayakan', upload.single('image'), async (req, res) => {
    try {
        // 1. Validasi apakah UMKM benar-benar mengunggah gambar
        if (!req.file) {
            return res.render('index', { result: null, imagePath: null, error: "Mohon unggah gambar manggis terlebih dahulu!" });
        }

        // 2. Membungkus gambar ke dalam format form-data untuk dikirim ke Python
        const formData = new FormData();
        formData.append('image', fs.createReadStream(req.file.path));

        // 3. Mengirim HTTP POST ke AI Service (Flask) yang berjalan di Port 5000
        const aiResponse = await axios.post('http://127.0.0.1:5000/predict', formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        // 4. Merender ulang halaman dengan membawa data hasil deteksi dari AI
        res.render('index', {
            result: aiResponse.data,
            imagePath: `/uploads/${req.file.filename}`, // URL gambar untuk ditampilkan
            error: null
        });

    } catch (error) {
        console.error("Error dari AI Service:", error.message);
        res.render('index', { 
            result: null, 
            imagePath: null, 
            error: "Gagal terhubung ke AI Service. Pastikan server Python menyala." 
        });
    }
});

// Menjalankan Server Node.js
app.listen(PORT, () => {
    console.log(`Server Sistem Manggis berjalan dengan mulus di http://localhost:${PORT}`);
});