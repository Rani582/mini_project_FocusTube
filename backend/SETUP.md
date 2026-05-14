# Python FastAPI Backend — OnTopic AI

## Stack
- **Python 3.11+**
- **FastAPI** — async REST API framework
- **scikit-learn** — TF-IDF vectorisation + cosine similarity
- **NumPy** — fast matrix operations
- **Uvicorn** — ASGI server

## ML Model
The recommendation engine lives in `ml_model.py`:
- `TfidfVectorizer(ngram_range=(1,2), sublinear_tf=True)` — bigrams + log-dampened TF
- Weighted document construction: **category ×4**, **tags ×3**, **title ×2**, description ×1
- `cosine_similarity` from scikit-learn for pairwise scoring
- Strict threshold: **18% cosine similarity** — below this, the video is off-topic

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Backend health check (polled by frontend) |
| GET | `/videos` | All videos (optional `?category=`) |
| GET | `/videos/{id}` | Single video by ID |
| GET | `/recommendations/{id}` | ML recommendations (`?strict_mode=true&max_results=15`) |
| GET | `/search?q=` | Keyword search |
| GET | `/categories` | All categories |
| GET | `/model/info` | ML model configuration |

Interactive docs: **http://localhost:8000/docs**

## Quick Start

```bash
# 1. Navigate to the backend directory
cd backend

# 2. (Optional) Create a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the server
uvicorn main:app --reload --port 8000

# Server is now running at http://localhost:8000
# Frontend will automatically connect and show "Python — Online"
```

## CORS
The backend allows all origins in development mode. For production:
```python
allow_origins=["https://your-frontend-domain.com"]
```
