FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

# Cloud Run injects PORT=8080; use shell form so $PORT is expanded
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
