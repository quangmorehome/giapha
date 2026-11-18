#!/usr/bin/env bash
# Dựng PostgreSQL tạm, giả auth.uid(), chạy migration và bài kiểm tra quyền. Cần gói postgresql (initdb, pg_ctl, psql).
set -e
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1); D=$(mktemp -d); chmod 755 "$D"; PORT=54329
if [ "$(id -u)" = 0 ]; then id pgtest >/dev/null 2>&1 || useradd -m pgtest; chown pgtest "$D"; RUN="su pgtest -c"; else RUN="bash -c"; fi
$RUN "$BIN/initdb -D $D/data -U postgres >/dev/null" ; $RUN "$BIN/pg_ctl -D $D/data -o '-p $PORT -k $D' -l $D/log -w start >/dev/null"
trap "$RUN '$BIN/pg_ctl -D $D/data -m immediate stop >/dev/null' || true" EXIT
P="psql -h $D -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
HERE=$(cd "$(dirname "$0")" && pwd)
$P -d postgres -c "create database gp" >/dev/null
$P -d gp <<'S'
create extension if not exists pgcrypto;
create role anon nologin; create role authenticated nologin;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
S
$P -d gp -f "$HERE/../migrations/0001_khoi_tao.sql" >/dev/null
$P -d gp -f "$HERE/../migrations/0002_ban_do_dia_diem.sql" >/dev/null
$P -d gp -f "$HERE/../migrations/0003_vai_tro_ho.sql" >/dev/null
$P -d gp -c "grant usage on schema public to anon, authenticated; grant execute on all functions in schema public to anon, authenticated;" >/dev/null
OUT=$(psql -h $D -p $PORT -U postgres -d gp -f "$HERE/rls_test.sql" 2>&1 | grep -E "PASS|FAIL" || true)
echo "$OUT" | sed 's/^psql:[^ ]* NOTICE:  *//;s/^NOTICE:  *//'
echo "--- $(echo "$OUT" | grep -c PASS) PASS, $(echo "$OUT" | grep -c FAIL) FAIL"
[ "$(echo "$OUT" | grep -c FAIL)" = 0 ]
