FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/var/cache/huggingface

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system recall \
    && useradd --system --create-home --gid recall --home-dir /home/recall recall \
    && mkdir -p /app /var/lib/recall/documents /var/cache/huggingface \
    && chown -R recall:recall /app /var/lib/recall /var/cache/huggingface /home/recall

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --upgrade pip \
    && pip install --index-url https://download.pytorch.org/whl/cpu torch \
    && pip install -r requirements.txt

COPY --chown=recall:recall app ./app
COPY --chown=recall:recall migrations ./migrations
COPY --chown=recall:recall alembic.ini ./alembic.ini

USER recall
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers"]
