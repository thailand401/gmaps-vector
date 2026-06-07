import uuid
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ── Config ────────────────────────────────────────────────────────────────────
PORT        = 4020
AUDIO_DIR   = Path(__file__).parent / "audio"
VOICE_ID    = "Ngọc Linh"        # nữ — built-in v3 Turbo voice
SPEED       = 1.05             # playback speed factor (1.0 = normal, 1.25 = nhanh hơn)
PUBLIC_BASE = f"http://localhost:{PORT}"

AUDIO_DIR.mkdir(exist_ok=True)

# ── Model singleton ───────────────────────────────────────────────────────────
_tts        = None
_voice_data = None


def _load_engine():
    global _tts, _voice_data
    from vieneu import Vieneu
    print("⏳ Loading VieNeu-TTS v3 Turbo (default)…")
    _tts = Vieneu()   # v3 Turbo: CPU→ONNX, GPU→PyTorch, built-in voices

    # List available voices for debug
    voices = _tts.list_preset_voices()
    print(f"📢 Available voices: {[vid for _, vid in voices]}")

    # Try exact name first, then unaccented fallbacks
    for candidate in (VOICE_ID, "Ngoc Linh", "ngoc-linh"):
        try:
            _voice_data = _tts.get_preset_voice(candidate)
            print(f"✅ TTS engine ready  —  voice: {candidate}")
            return
        except Exception:
            pass

    # Last resort: use model default voice
    _voice_data = _tts.get_preset_voice()
    print(f"⚠️  Ngọc Linh not found — using default: {_tts._default_voice}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_engine()
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="VieNeu TTS Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated WAV files as static assets
app.mount("/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")


# ── Schema ────────────────────────────────────────────────────────────────────
class TTSRequest(BaseModel):
    text: str


class TTSResponse(BaseModel):
    url: str
    filename: str


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "voice": VOICE_ID}


@app.get("/voices")
def list_voices():
    if _tts is None:
        raise HTTPException(status_code=503, detail="TTS engine not ready")
    return [{"id": vid, "name": label} for label, vid in _tts.list_preset_voices()]


@app.post("/api/tts", response_model=TTSResponse)
async def synthesize(req: TTSRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    if _tts is None:
        raise HTTPException(status_code=503, detail="TTS engine not ready")

    try:
        filename    = f"{uuid.uuid4().hex}.wav"
        output_path = AUDIO_DIR / filename

        audio = _tts.infer(req.text, voice=_voice_data)
        # Speed up by writing at higher sample rate (player reads at native rate → faster playback)
        import soundfile as sf
        sf.write(str(output_path), audio, int(_tts.sample_rate * SPEED))

        return TTSResponse(
            url=f"{PUBLIC_BASE}/audio/{filename}",
            filename=filename,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
