"""Local fixture API for visual review only. Never included in the theme bundle."""
from http.server import BaseHTTPRequestHandler, HTTPServer
import json, time, math, os
from urllib.parse import urlparse, parse_qs
G = 1024**3
# DEMO_AUTHED=1 模拟已登录：/api/me 返回 authed，节点带文档保留段地址（RFC 5737 / 3849），用于检查登录后界面
AUTHED = os.environ.get('DEMO_AUTHED') == '1'
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        now = int(time.time())
        if self.path == '/api/me':
            data = dict(authed=AUTHED, github=False, site_name='极简探针 · 演示', public_page=True, history_days=30)
        elif self.path == '/api/nodes':
            nodes = []
            for i, (name, country) in enumerate([('Tokyo · 东京主节点','JP'),('Singapore · 新加坡','SG'),('Hong Kong · 香港边缘','HK'),('Frankfurt · 法兰克福','DE'),('Los Angeles · 洛杉矶','US'),('备用节点 · 等待连接','CN')]):
                m = dict(uptime=86400*(i+3),cpu=18+i*13,load=[.21,.38,.26],mem_total=8*G,mem_used=(2+i*.65)*G,swap_total=G,swap_used=0,disk_total=80*G,disk_used=(20+i*6)*G,net_rx=(i+1)*820000,net_tx=(i+1)*310000,total_rx=80*G,total_tx=40*G,month_rx=20*G,month_tx=10*G,tcp=36,udp=8,procs=128)
                nodes.append(dict(id=i+1,name=name,sort=i,public=True,online=i<5,country=country,last_seen=now-7200,metrics=m if i<5 else None,os='Ubuntu 24.04',kernel='6.8.0',arch='x86_64',virt='kvm',cpu_name='AMD EPYC',cpu_cores=4,mem_total=8*G,swap_total=G,disk_total=80*G,agent_version='1.0',price=5,currency=['USD','HKD','TWD','CNY','USD','USD'][i],billing_cycle='monthly',expires_at=None,traffic_limit=500*G,traffic_mode='sum',traffic_reset_day=1,total_rx=80*G,total_tx=40*G,month_rx=20*G,month_tx=10*G,month_start='',day_rx=3*G,day_tx=G))
                # public_remark 给访客看；remark 是站长私有备注，主题不显示
                nodes[-1].update(public_remark=['主力节点；CN2 GIA','','晚高峰略有拥堵','','',''][i], remark='私有备注，不应出现在主题里')
                if AUTHED:
                    nodes[-1].update(ip=f'203.0.113.{i+10}', ipv4=f'203.0.113.{i+10}', ipv6=f'2001:db8::{i+10:x}' if i % 2 == 0 else '')
            data = dict(nodes=nodes)
        elif '/metrics' in self.path:
            # 仿 hub 1.3.2：7 天以内按分钟，更宽读小时汇总；step 是每个点覆盖的秒数，最后一个点是还没过完的时段
            q = parse_qs(urlparse(self.path).query)
            hours = min(int(q.get('hours', ['6'])[0]), 30*24); points = int(q.get('points', ['600'])[0])
            unit = 60 if hours <= 168 else 3600
            step = max(unit, -(-hours*3600 // points // unit) * unit)
            n = hours*3600 // step; end = now - now % step
            ts = [end-(n-1-i)*step for i in range(n)]
            data = dict(step=step,metrics=[dict(ts=t,cpu=30+15*math.sin(i/5),cpu_max=min(100,55+40*abs(math.sin(i/3))),mem_used=3*G,disk_used=20*G,net_rx=800000+300000*math.sin(i/4),net_tx=300000,net_rx_max=int(1400000+900000*abs(math.sin(i/3))),net_tx_max=int(450000+250000*abs(math.cos(i/4))),minutes=(now-t)//60 if i==n-1 else step//60) for i,t in enumerate(ts)],ping=[dict(task_id=task,ts=t,latency=base+8*math.sin(i/5),loss=0) for task,base in [(1,165),(2,157),(3,132)] for i,t in enumerate(ts)],probes={'1':'浙江电信','2':'浙江联通','3':'浙江移动'},loss={})
        else:
            self.send_error(404); return
        self.send_response(200); self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(data).encode())
HTTPServer(('127.0.0.1',9911),Handler).serve_forever()
