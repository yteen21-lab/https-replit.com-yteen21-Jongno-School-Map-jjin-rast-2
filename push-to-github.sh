#!/bin/bash
TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN
REPO="https://${TOKEN}@github.com/yteen21-lab/https-replit.com-yteen21-Jongno-School-Map-jjin-rast-2.git"
git remote set-url origin "$REPO" 2>/dev/null || git remote add origin "$REPO"
git push -u origin main
