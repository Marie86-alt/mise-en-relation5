"""
FastAPI server entry point
This file imports and runs the refactored FastAPI application from app.main
"""

from app.main import app

if __name__ == "__main__":
        import uvicorn
        uvicorn.run(
                    app,
                    host="0.0.0.0",
                    port=8001,
                    reload=True
        )
    
