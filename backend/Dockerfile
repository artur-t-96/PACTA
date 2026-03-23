FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Create default directories and startup script permissions
RUN mkdir -p output/contracts output/contracts/versions /app/templates /app/scripts /app/bootstrap \
    && chmod +x /app/scripts/render_start.sh

EXPOSE 8001

CMD ["/app/scripts/render_start.sh"]
