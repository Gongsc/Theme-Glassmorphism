"""Local fixture API for visual review only. Never included in the theme bundle."""
from http.server import BaseHTTPRequestHandler, HTTPServer
import json, time, math
G = 1024**3
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        now = int(time.time())
        if self.path == '/api/me':
            data = dict(authed=False, github=False, site_name='极简探针 · 演示', public_page=True)
        elif self.path == '/api/nodes':
            nodes = []
            for i, (name, country) in enumerate([('Tokyo · 东京主节点','JP'),('Singapore · 新加坡','SG'),('Hong Kong · 香港边缘','HK'),('Frankfurt · 法兰克福','DE'),('Los Angeles · 洛杉矶','US'),('备用节点 · 等待连接','CN')]):
                m = dict(uptime=86400*(i+3),cpu=18+i*13,load=[.21,.38,.26],mem_total=8*G,mem_used=(2+i*.65)*G,swap_total=G,swap_used=0,disk_total=80*G,disk_used=(20+i*6)*G,net_rx=(i+1)*820000,net_tx=(i+1)*310000,total_rx=80*G,total_tx=40*G,month_rx=20*G,month_tx=10*G,tcp=36,udp=8,procs=128)
                nodes.append(dict(id=i+1,name=name,sort=i,public=True,online=i<5,country=country,last_seen=now-7200,metrics=m if i<5 else None,os='Ubuntu 24.04',kernel='6.8.0',arch='x86_64',virt='kvm',cpu_name='AMD EPYC',cpu_cores=4,mem_total=8*G,swap_total=G,disk_total=80*G,agent_version='1.0',price=5,currency='USD',billing_cycle='monthly',expires_at=None,traffic_limit=500*G,traffic_mode='sum',traffic_reset_day=1,total_rx=80*G,total_tx=40*G,month_rx=20*G,month_tx=10*G,month_start='',day_rx=3*G,day_tx=G))
            data = dict(nodes=nodes)
        elif '/metrics' in self.path:
            data = dict(metrics=[dict(ts=now-(59-i)*60,cpu=30+15*math.sin(i/5),mem_used=3*G,disk_used=20*G,net_rx=800000+300000*math.sin(i/4),net_tx=300000) for i in range(60)],ping=[dict(task_id=task,ts=now-(59-i)*60,latency=base+8*math.sin(i/5),loss=0) for task,base in [(1,165),(2,157),(3,132)] for i in range(60)],probes={'1':'浙江电信','2':'浙江联通','3':'浙江移动'},loss={})
        else:
            self.send_error(404); return
        self.send_response(200); self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(data).encode())
HTTPServer(('127.0.0.1',9911),Handler).serve_forever()
