#!/bin/bash
# Generate self-signed SSL certificate for BrowserShield
# Usage: ./generate-ssl-cert.sh [domain]

set -e

DOMAIN=${1:-"localhost"}
SSL_DIR="$(dirname "$0")/../ssl"
KEY_FILE="$SSL_DIR/server.key"
CERT_FILE="$SSL_DIR/server.crt"
DAYS=365

echo "🔐 Generating SSL certificate for: $DOMAIN"

# Create SSL directory
mkdir -p "$SSL_DIR"

# Generate private key and certificate
openssl req -x509 \
    -newkey rsa:4096 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days $DAYS \
    -nodes \
    -subj "/CN=$DOMAIN/O=BrowserShield/C=US" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1"

# Set permissions
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo ""
echo "✅ SSL certificate generated successfully!"
echo "   Key:  $KEY_FILE"
echo "   Cert: $CERT_FILE"
echo ""
echo "📝 To enable HTTPS, set in your environment:"
echo "   export ENABLE_HTTPS=true"
echo "   export HTTPS_PORT=5443"
echo ""
echo "⚠️  This is a self-signed certificate for development."
echo "   For production, use a proper CA-signed certificate."
