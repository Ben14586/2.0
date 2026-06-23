import uvicorn

if __name__ == "__main__":
    print("Starting Game Services API Server on port 3000...")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=3000, reload=False)
