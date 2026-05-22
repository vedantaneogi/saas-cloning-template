# Frontend is pre-built on the host via
#   pnpm --filter @clone-apps/outlook-frontend run build
# This container only serves the resulting dist/, copied along
# with the rest of app/ a few lines below.
FROM python:3.13-slim
WORKDIR /app

COPY .requirements.lock /tmp/.requirements.lock
RUN pip install --no-cache-dir -r /tmp/.requirements.lock

COPY app/ /app/app/

EXPOSE 8030

HEALTHCHECK --interval=5s --timeout=3s --start-period=30s --retries=60 \
  CMD python -c "import requests; requests.get('http://localhost:8030/health').raise_for_status()"

CMD ["uvicorn", "app.server:app", "--host", "0.0.0.0", "--port", "8030"]
