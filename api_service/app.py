from flask import Flask, request, jsonify
from ultralytics import YOLO
import io
from PIL import Image

app = Flask(__name__)

# 1. Inisialisasi dan Load Model YOLOv8
# Pastikan file best.pt berada di direktori yang sama dengan app.py
try:
    model = YOLO("best.pt")
    print("Model best.pt berhasil dimuat!")
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
        # 3. Preprocessing (Membaca file gambar menjadi format yang dipahami model)
        image_bytes = file.read()
        img = Image.open(io.BytesIO(image_bytes))

        # 4. Inference (Proses Prediksi)
        # imgsz=640 memastikan gambar di-resize otomatis oleh ultralytics sesuai saat training
        results = model.predict(img, imgsz=640)

        # 5. Ekstraksi Data Hasil Deteksi
        result = results[0] # Ambil hasil dari gambar pertama (karena kita upload 1 gambar)
        detections = []
        
        # Iterasi setiap objek (manggis) yang terdeteksi di dalam satu gambar
        for box in result.boxes:
            # Ambil koordinat Bounding Box [x1, y1, x2, y2]
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            
            # Ambil nilai probabilitas/keyakinan model (Confidence Score)
            conf = float(box.conf[0])
            
            # Ambil ID kelas dan konversi ke Nama Kelas (Layak/Tidak Layak)
            class_id = int(box.cls[0])
            class_name = model.names[class_id]

            # Masukkan data ke dalam list
            detections.append({
                "kelayakan": class_name,
                "confidence_score": round(conf, 2), # Dibulatkan 2 desimal
                "bounding_box": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)]
            })

        # 6. Mengirimkan Respons JSON ke Frontend/Express.js
        return jsonify({
            "status": "success",
            "jumlah_manggis_terdeteksi": len(detections),
            "data": detections
        }), 200

    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan pada server AI: {str(e)}"}), 500

if __name__ == '__main__':
    # Menjalankan server Flask di port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)