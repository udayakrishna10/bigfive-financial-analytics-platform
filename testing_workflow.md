# Local Testing & Execution Guide

Follow these steps to run the BigFive platform locally and verify the new real-time features.

## 1. Backend API Service
Start the main FastAPI server to serve dashboard data and the SSE stream.
```bash
cd backend/app
uvicorn main:app --reload --port 8000
```
*Verification*: Open `http://localhost:8000/health` or `http://localhost:8000/big-five-dashboard`.

## 2. Real-Time Poller
Start the background worker that fetches live data and feeds the system.
```bash
cd backend/etl
python realtime_poller.py
```
*Note*: Requires GCP credentials for Pub/Sub Lite and GCS. If testing without GCP, ensure you have mocked these clients.

## 3. Frontend Development Server
Start the Vite development server.
```bash
cd frontend
npm run dev
```
*Verification*: Open `http://localhost:5173`.

## 📸 What to Test

### ✅ Real-Time Dashboard
*   Look for the **"LIVE"** pulsing badge on the Stock and Crypto cards.
*   Observe the prices updating every ~1-2 seconds with "Yahoo-style" smoothness (thanks to the 15s buffer).

### ✅ 1-Day Chart (1D)
1.  Click on any stock (e.g., AAPL).
2.  Select the **"1D"** range button.
3.  **Verification**: 
    *   The X-axis should show the full day (9:30 AM - 4:00 PM ET).
    *   The line should "grow" as new points arrive.
    *   Check the footer for the **"Lag"** indicator.

### ✅ "Head" Integration
1.  Switch to the **"7D"** or **"1M"** range.
2.  Watch the very last point on the chart. It should flicker/move with the live price updates, extending the historical line in real-time.

## ⚠️ Troubleshooting
*   **No Live Data**: Ensure `realtime_poller.py` is running and your `.env` has the correct `GCP_PROJECT`.
*   **SSE Errors**: Check if your browser console shows connection errors to `/realtime-stream`. Ensure `VITE_API_BASE_URL` in `frontend/.env.development` is correct.
