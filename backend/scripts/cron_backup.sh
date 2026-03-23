#!/bin/bash
# Daily backup of PARAGRAF database
curl -s -X POST http://localhost:8001/api/backup
echo "[$(date)] PARAGRAF backup completed"
