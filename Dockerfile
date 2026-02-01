FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN adduser --disabled-password --gecos "" appuser

COPY pyproject.toml README.md LICENSE /app/
COPY src /app/src
COPY static /app/static
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

USER appuser

EXPOSE 8000
CMD ["uvicorn", "ai_headshot_studio.app:app", "--host", "0.0.0.0", "--port", "8000"]
