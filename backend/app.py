# app.py (Versão Corrigida)

import os
import tempfile
import base64
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from gradio_client import Client, handle_file

# 1. Carregar variáveis de ambiente primeiro
load_dotenv()

# 2. Inicializar o Flask APENAS UMA VEZ
app = Flask(__name__, static_folder="static")

# 3. Aplicar configurações como o CORS
CORS(app, resources={r"/tryon": {"origins": "http://localhost:3000"}})

# --- O resto do seu código permanece o mesmo, pois está ótimo ---

HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    raise ValueError("HF_TOKEN não encontrado no arquivo .env")

client = Client("JOAO121223/IDM-VTON", hf_token=HF_TOKEN)

@app.route("/")
def home():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/tryon", methods=["POST"])
def tryon():
    try:
        human_img = request.files.get("human")
        garment_img = request.files.get("garment")
        garment_desc = request.form.get("description", "T-shirt")

        if not human_img or not garment_img:
            return jsonify({"error": "Envie os arquivos 'human' e 'garment'"}), 400

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as f_human, \
             tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as f_garment:
            
            human_img.save(f_human.name)
            garment_img.save(f_garment.name)

            result = client.predict(
                dict={
                    "background": handle_file(f_human.name),
                    "layers": [],
                    "composite": None
                },
                garm_img=handle_file(f_garment.name),
                garment_des=garment_desc,
                is_checked=True,
                is_checked_crop=False,
                denoise_steps=30,
                seed=42,
                api_name="/tryon"
            )
        
        os.remove(f_human.name)
        os.remove(f_garment.name)

        output_img = result[0]

        # A sua lógica de conversão para Base64 está perfeita!
        if isinstance(output_img, str) and os.path.isfile(output_img):
            with open(output_img, "rb") as f:
                img_bytes = f.read()
            img_b64 = "data:image/png;base64," + base64.b64encode(img_bytes).decode("utf-8")
        elif isinstance(output_img, str):
            img_b64 = output_img if output_img.startswith("data:") else "data:image/png;base64," + output_img
        elif isinstance(output_img, bytes):
            img_b64 = "data:image/png;base64," + base64.b64encode(output_img).decode("utf-8")
        else:
            return jsonify({"error": "Formato do resultado inesperado"}), 500

        return jsonify({
            "output": img_b64,
            "masked": result[1] if len(result) > 1 else None
        })

    except Exception as e:
        print("Erro na rota /tryon:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000) # É bom especificar a porta