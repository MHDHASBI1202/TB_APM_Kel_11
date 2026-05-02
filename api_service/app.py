from flask import Flask, request, jsonify
from ultralytics import YOLO
import io
from PIL import Image

app = Flask(__name__)

# 1. Inisialisasi dan Load Model YOLOv8
try:
    model = YOLO("best.pt")
    print("Model best.pt (7000+ Data) berhasil dimuat!")
except Exception as e:
    print(f"Gagal memuat model: {e}")

@app.route('/predict', methods=['POST'])
def predict():
    # 2. Validasi Input Request
    if 'image' not in request.files:
        return jsonify({"error": "Tidak ada file gambar yang dikirim"}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({"error": "Nama file kosong"}), 400

    try:
        # 3. Preprocessing 
        image_bytes = file.read()
        img = Image.open(io.BytesIO(image_bytes))

        # 4. Inference (Proses Prediksi)
        results = model.predict(img, imgsz=640)

        # 5. Ekstraksi Data Hasil Deteksi & TERJEMAHAN
        result = results[0] 
        detections = []
        
        # === KAMUS PENERJEMAH (CLASS MAPPING) ===
        kamus_kelayakan = {
            "Ripe": "Layak Ekspor",         
            "Un_Ripe": "Tidak Layak Ekspor" 
        }
        
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            class_id = int(box.cls[0])
            
            # Ambil nama asli dari model YOLOv8 (yaitu "Ripe" atau "Un_Ripe")
            nama_asli_ai = model.names[class_id]

            # Terjemahkan secara instan! 
            # Jika tidak ada di kamus, biarkan pakai nama aslinya
            nama_terjemahan = kamus_kelayakan.get(nama_asli_ai, nama_asli_ai)

            # Masukkan data yang SUDAH DITERJEMAHKAN ke dalam list
            detections.append({
                "kelayakan": nama_terjemahan,
                "confidence_score": round(conf, 2), 
                "bounding_box": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)]
            })

        # 6. Mengirimkan Respons JSON ke Frontend
        return jsonify({
            "status": "success",
            "jumlah_manggis_terdeteksi": len(detections),
            "data": detections
        }), 200

    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan pada server AI: {str(e)}"}), 500

if __name__ == '__main__':
    # Menjalankan server Flask
    app.run(host='0.0.0.0', port=5000, debug=True)