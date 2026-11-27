#!/usr/bin/env bash
# ==============================================================================
# 🛡️ APHIM SUPER — VPS ORIGIN IP SHIELD & CLOUDFLARE-ONLY FIREWALL HARDENING
# ==============================================================================
# Chức năng:
# 1. Bảo vệ kết nối SSH hiện tại (tự động phát hiện cổng SSH đang dùng, mặc định 22).
# 2. Khóa hoàn toàn cổng 80/443 với thế giới bên ngoài — CHỈ CHO PHÉP các dải IP
#    chính thức của Cloudflare kết nối vào VPS (chặn đứng Shodan, Censys, DDoS bypass CF).
# 3. Chặn truy cập trực tiếp từ bên ngoài vào cổng Node.js (3005).
# 4. Cấu hình Nginx default_server trả về mã 444 (ngắt kết nối ngay lập tức) nếu
#    ai đó quét trực tiếp bằng IP (http://64.20.62.71) hoặc Host lạ.
# 5. Khôi phục IP thật của người dùng từ Cloudflare (CF-Connecting-IP) cho Nginx.
#
# Cách chạy trên VPS Ubuntu/Debian:
#   sudo bash scripts/harden-vps-cloudflare.sh
# ==============================================================================

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "❌ Vui lòng chạy script này với quyền root (sudo bash scripts/harden-vps-cloudflare.sh)"
    exit 1
fi

echo "🚀 [1/5] Đang kiểm tra cổng SSH để đảm bảo không bị mất kết nối..."
SSH_PORT=$(ss -tlnp 2>/dev/null | awk '/sshd/ {print $4}' | awk -F: '{print $NF}' | head -n 1 || true)
if [ -z "${SSH_PORT:-}" ] || ! [[ "$SSH_PORT" =~ ^[0-9]+$ ]]; then
    SSH_PORT=22
fi
echo "   ✅ Đã phát hiện cổng SSH: ${SSH_PORT}"

echo "🌐 [2/5] Đang tải danh sách dải IP chính thức mới nhất từ Cloudflare..."
CF_IPV4=$(curl -fsSL https://www.cloudflare.com/ips-v4)
CF_IPV6=$(curl -fsSL https://www.cloudflare.com/ips-v6)

if [ -z "$CF_IPV4" ]; then
    echo "❌ Không thể tải danh sách IP Cloudflare. Hủy thao tác để an toàn."
    exit 1
fi

echo "🔥 [3/5] Đang cấu hình tường lửa UFW (Cloudflare-Only cho Port 80 & 443)..."
if ! command -v ufw >/dev/null 2>&1; then
    apt-get update -y && apt-get install -y ufw
fi

# Luôn mở cổng SSH trước khi bật UFW
ufw allow "${SSH_PORT}/tcp" comment 'SSH Access' >/dev/null
if [ "$SSH_PORT" != "22" ]; then
    ufw allow 22/tcp comment 'SSH Default Port' >/dev/null
fi

# Xóa các rule mở toang port 80, 443, 3005 cho mọi IP (0.0.0.0/0) nếu có
ufw delete allow 80/tcp >/dev/null 2>&1 || true
ufw delete allow 443/tcp >/dev/null 2>&1 || true
ufw delete allow 80 >/dev/null 2>&1 || true
ufw delete allow 443 >/dev/null 2>&1 || true
ufw delete allow 'Nginx Full' >/dev/null 2>&1 || true
ufw delete allow 'Nginx HTTP' >/dev/null 2>&1 || true
ufw delete allow 'Nginx HTTPS' >/dev/null 2>&1 || true
ufw deny 3005/tcp comment 'Block Direct NodeJS Port' >/dev/null 2>&1 || true

# Thêm toàn bộ dải IPv4 & IPv6 của Cloudflare vào whitelist Port 80 & 443
for ip in $CF_IPV4; do
    ufw allow proto tcp from "$ip" to any port 80,443 comment 'Cloudflare IPv4' >/dev/null
done

for ip6 in $CF_IPV6; do
    ufw allow proto tcp from "$ip6" to any port 80,443 comment 'Cloudflare IPv6' >/dev/null || true
done

ufw --force enable >/dev/null
echo "   ✅ Tường lửa UFW đã khóa Port 80/443 (Chỉ nhận kết nối từ Cloudflare + giữ nguyên SSH port ${SSH_PORT})."

echo "🛡️ [4/5] Đang cấu hình Nginx chặn truy cập trực tiếp bằng IP (return 444)..."
if command -v nginx >/dev/null 2>&1 && [ -d /etc/nginx/conf.d ]; then
    # 1. File khôi phục IP thật từ Cloudflare
    REAL_IP_CONF="/etc/nginx/conf.d/00-cloudflare-real-ip.conf"
    {
        echo "# Auto-generated Cloudflare Real IP Config"
        for ip in $CF_IPV4; do
            echo "set_real_ip_from $ip;"
        done
        for ip6 in $CF_IPV6; do
            echo "set_real_ip_from $ip6;"
        done
        echo "real_ip_header CF-Connecting-IP;"
        echo "server_tokens off;"
    } > "$REAL_IP_CONF"

    # 2. Kiểm tra xem đã có default_server nào trong /etc/nginx/sites-enabled chưa
    if grep -rn "default_server" /etc/nginx/sites-enabled/ >/dev/null 2>&1; then
        echo "   ℹ️ Phát hiện default_server trong /etc/nginx/sites-enabled/. Đang vô hiệu hóa site default mặc định nếu có..."
        if [ -L /etc/nginx/sites-enabled/default ]; then
            rm -f /etc/nginx/sites-enabled/default
        fi
    fi

    # Nếu không còn default_server nào khác trên port 80, tạo catch-all block trả về 444 (ngắt kết nối)
    if ! grep -rn "default_server" /etc/nginx/sites-enabled/ >/dev/null 2>&1; then
        cat > /etc/nginx/conf.d/01-drop-direct-ip.conf <<'EOF'
# Chặn đứng mọi truy cập trực tiếp bằng IP VPS (http://64.20.62.71) hoặc tên miền lạ
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 444;
}
EOF
    fi

    if nginx -t >/dev/null 2>&1; then
        systemctl reload nginx
        echo "   ✅ Đã nạp cấu hình Nginx chống quét IP thành công!"
    else
        echo "   ⚠️ Cấu hình Nginx hiện tại có xung đột default_server, đang khôi phục..."
        rm -f /etc/nginx/conf.d/01-drop-direct-ip.conf
        nginx -t && systemctl reload nginx
    fi
fi

echo "🎉 [5/5] HOÀN TẤT BẢO VỆ VPS!"
echo "----------------------------------------------------------------------"
echo "✅ Trạng thái tường lửa hiện tại:"
ufw status | head -n 25
echo "----------------------------------------------------------------------"
