#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优学院智慧课堂 - 本人课程签到发现与提醒
双击运行本文件 (需安装 Python 3, 并 pip install requests)。

填账号和密码，点击“开始监听”，自动发现本人课堂的待签到活动，无需 URL。
发现活动后在官方页面完成签到验证。
账号保存在固定的用户数据目录，重启或更换脚本位置后仍可恢复。
"""

import json
import os
import queue
import re
import tempfile
import threading
import time
import tkinter as tk
import urllib.parse
import webbrowser
from tkinter import scrolledtext, ttk

import requests

BASE = "https://application.dgut.edu.cn/classroomapi"
LOGIN_URL = "https://application.dgut.edu.cn/appapi/user/login/app"  # 学校应用中心登录(明文密码)
POLL_INTERVAL = 3
CLASSROOM_REFRESH_INTERVAL = 60
PAGE_SIZE = 999
DATA_DIR = os.path.join(os.environ.get("LOCALAPPDATA") or os.path.expanduser("~"),
                        "UCollegeSignin")
CONFIG_FILE = os.path.join(DATA_DIR, "signin_gui_config.json")
LOG_FILE = os.path.join(DATA_DIR, "signin_gui.log")
LEGACY_CONFIG_FILES = list(dict.fromkeys([
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "signin_gui_config.json"),
    os.path.expanduser("~/signin_gui_config.json"),
    os.path.expanduser("~/Desktop/signin_gui_config.json"),
]))

NOTICE = """使用说明:
1. 填账号和密码，保留“自动发现本人课堂”勾选，点击“开始监听”。
2. 自动刷新本人课程与进行中的课堂，无需 URL；新签到会显示在下方。
3. 选中活动，点击“打开官方课堂”，在官方页面完成签到验证。
4. 点“存账号”立即保存；关闭重开自动恢复，下拉框可切换已保存账号。
5. 账号和密码保存在当前 Windows 用户的数据目录，各脚本副本共用。
6. Token 登录需同时填写 userId；两种方式都填时优先使用 Token。"""


class SessionExpired(Exception):
    pass


def normalize_config(cfg):
    if not isinstance(cfg, dict):
        raise ValueError("配置根节点应为对象")
    accounts = cfg.get("accounts") or {}
    if not isinstance(accounts, dict) or any(
            not isinstance(k, str) or not isinstance(v, str) for k, v in accounts.items()):
        raise ValueError("账号配置格式不正确")
    cfg = dict(cfg, accounts=dict(accounts))
    for key in ("username", "password", "last_username", "token", "userid", "url"):
        if key in cfg and not isinstance(cfg[key], str):
            raise ValueError("配置字段格式不正确")
    if "auto_discover" in cfg and not isinstance(cfg["auto_discover"], bool):
        raise ValueError("自动发现设置格式不正确")
    legacy = cfg.get("username", "")
    if legacy:
        cfg["accounts"].setdefault(legacy, cfg.get("password", ""))
    if not cfg.get("last_username"):
        cfg["last_username"] = legacy or next(iter(cfg["accounts"]), "")
    return cfg


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

    def _get(self, path, params):
        r = self.session.get(BASE + path, params=params,
                             headers=self._headers(), timeout=10)
        if r.status_code == 401:
            raise SessionExpired("登录已失效")
        r.raise_for_status()
        data = r.json()
        if not isinstance(data, dict):
            raise ValueError("学生端接口返回格式不正确")
        if str(data.get("code")) in ("2001", "2101", "401"):
            raise SessionExpired("登录已失效")
        return data

    def _pages(self, path, params, key="list", nested=True,
               page_key="pageNum", size_key="pageSize", stop_event=None):
        page = 1
        previous = None
        while not (stop_event and stop_event.is_set()):
            data = self._get(path, dict(params, **{page_key: page, size_key: PAGE_SIZE}))
            data = data.get("result") if nested else data
            if not isinstance(data, dict) or not isinstance(data.get(key), list):
                raise ValueError("学生端列表格式不正确，请检查平台是否更新")
            items = data[key]
            if any(not isinstance(item, dict) for item in items):
                raise ValueError("学生端列表项目格式不正确")
            if items and items == previous:
                raise ValueError("学生端返回重复分页，已停止本轮扫描")
            yield from items
            if len(items) < PAGE_SIZE:
                return
            previous = items
            page += 1

    def classrooms(self, stop_event):
        rooms = {}
        courses = self._pages("/courses/students",
                              {"keyword": "", "publishStatus": 1, "type": 1},
                              key="courseList", nested=False, page_key="pn", size_key="ps",
                              stop_event=stop_event)
        for course in courses:
            if stop_event.is_set():
                break
            ocid = course.get("id")
            if not str(ocid).isdigit():
                raise ValueError("课程缺少有效编号")
            # 参数与官方学生端 ClassroomList 保持一致。
            for room in self._pages("/wisdomClassroom/student/getClassroomList",
                                    {"ocId": ocid, "teacherId": self.user_id,
                                     "status": 0, "order": 0}, stop_event=stop_event):
                cid = room.get("id")
                if str(cid).isdigit() and str(room.get("status")) == "0":
                    rooms[int(cid)] = dict(room, id=int(cid), ocId=ocid,
                                          course_name=course.get("name") or str(ocid))
        return list(rooms.values())

    def activities(self, cid, stop_event):
        return self._pages("/wisdomClassroom/student/classroomActivitys",
                           {"classroomId": cid}, stop_event=stop_event)


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
        self.title("优学院签到发现与提醒")
        self.geometry("780x760")
        self.minsize(720, 700)

        self.log_queue = queue.Queue()
        self.ctrl_queue = queue.Queue()  # 工作线程 -> UI 线程的控制消息
        self.stop_event = threading.Event()
        self.worker = None
        self.accounts = {}  # {账号: 密码}
        self._save_timer = None
        self._log_lock = threading.Lock()
        self._config_load_failed = False
        self.auto_discover = tk.BooleanVar(self, value=True)
        self.pending_urls = {}

        self._build_widgets()
        self._load_config()
        for widget in (self.cmb_user, self.ent_pass, self.ent_token,
                       self.ent_userid, self.ent_url):
            widget.bind("<KeyRelease>", self._schedule_save, add="+")
            widget.bind("<FocusOut>", self._schedule_save, add="+")
        self.protocol("WM_DELETE_WINDOW", self._on_close)
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

        ttk.Checkbutton(frm, text="自动发现本人课堂（无需 URL）",
                        variable=self.auto_discover,
                        command=self._schedule_save).pack(anchor=tk.W, pady=3)

        row2 = ttk.Frame(frm)
        row2.pack(fill=tk.X, pady=2)
        ttk.Label(row2, text="指定课堂（选填）:").pack(side=tk.LEFT)
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

        self.activity_tree = ttk.Treeview(frm, columns=("course", "title"),
                                          show="headings", height=4)
        self.activity_tree.heading("course", text="课程")
        self.activity_tree.heading("title", text="发现的待签到活动")
        self.activity_tree.column("course", width=230)
        self.activity_tree.column("title", width=350)
        self.activity_tree.pack(fill=tk.X, pady=4)
        ttk.Button(frm, text="打开官方课堂", command=self.open_activity).pack(anchor=tk.W)
        self.activity_tree.bind("<Double-1>", self.open_activity)

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
        self._schedule_save()

    def remember_account(self):
        name = self.cmb_user.get().strip()
        pwd = self.ent_pass.get()
        if not name or not pwd:
            self.log("存账号需要先填账号和密码")
            return
        self.accounts[name] = pwd
        self.cmb_user.configure(values=sorted(self.accounts))
        if self._save_config():
            self.log(f"账号 {name} 已保存到本机配置")

    def log(self, msg):
        now = time.localtime()
        self.log_queue.put(f"[{time.strftime('%H:%M:%S', now)}] {msg}")
        try:
            os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
            with self._log_lock, open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S', now)}] {msg}\n")
        except OSError:
            pass

    def _schedule_save(self, _event=None):
        if self._save_timer is not None:
            self.after_cancel(self._save_timer)
        self._save_timer = self.after(500, self._save_config)

    def _on_close(self):
        if self._save_timer is not None:
            self.after_cancel(self._save_timer)
        if self._save_config():
            self.stop_event.set()
            self.destroy()

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
            run, action, payload = ctrl
            if run is not self.stop_event:
                continue
            if action == "STOP":
                self.stop()
            elif action == "FOUND" and not run.is_set():
                room, title, aid = payload
                iid = f"{room['id']}:{aid}"
                if not self.activity_tree.exists(iid):
                    self.activity_tree.insert("", tk.END, iid=iid,
                                              values=(room["course_name"], title))
                    query = urllib.parse.urlencode(
                        {"classroomId": room["id"], "ocId": room["ocId"]})
                    self.pending_urls[iid] = (
                        "https://application.dgut.edu.cn/classroom/student.html?" + query)
                    self.bell()
        self.after(200, self._drain_queues)

    def _load_config(self):
        self._config_load_failed = False
        cfg = None
        sources = []
        # 固定目录优先；第一次运行时才合并已知旧副本的配置。
        for path in [CONFIG_FILE] + LEGACY_CONFIG_FILES:
            try:
                with open(path, encoding="utf-8-sig") as f:
                    loaded = normalize_config(json.load(f))
            except FileNotFoundError:
                continue
            except (OSError, ValueError) as e:
                self.log(f"读取配置失败: {path} ({e})")
                if path == CONFIG_FILE:
                    self._config_load_failed = True
                    return  # 不用空配置覆盖原文件。
                continue
            if path == CONFIG_FILE:
                cfg = loaded
                break
            if cfg is None:
                cfg = loaded
            else:
                for name, password in loaded["accounts"].items():
                    cfg["accounts"].setdefault(name, password)
            sources.append(path)
        if cfg is None:
            return
        self.accounts = cfg["accounts"]
        self.cmb_user.configure(values=sorted(self.accounts))
        last = cfg.get("last_username", "")
        self.cmb_user.set(last)
        self.ent_pass.insert(0, self.accounts.get(last, ""))
        self.ent_token.insert(0, cfg.get("token", ""))
        self.ent_userid.insert(0, cfg.get("userid", ""))
        self.ent_url.insert(0, cfg.get("url", ""))
        self.auto_discover.set(cfg.get("auto_discover", True))
        if sources and self._save_config():
            self.log(f"已迁移旧配置，恢复 {len(self.accounts)} 个账号")
        self.log(f"配置位置: {CONFIG_FILE}")

    def _save_config(self):
        self._save_timer = None
        if self._config_load_failed:
            self.log("配置未能读取，已停止写入以保护原账号数据；请检查配置文件")
            return False
        username = self.cmb_user.get().strip()
        password = self.ent_pass.get()
        if username and password:
            self.accounts[username] = password
            self.cmb_user.configure(values=sorted(self.accounts))
        cfg = {
            "accounts": self.accounts,
            "last_username": username,
            "token": self.ent_token.get().strip(),
            "userid": self.ent_userid.get().strip(),
            "url": self.ent_url.get().strip(),
            "auto_discover": self.auto_discover.get(),
        }
        temp_path = None
        try:
            os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False,
                                             dir=os.path.dirname(CONFIG_FILE)) as f:
                temp_path = f.name
                json.dump(cfg, f, ensure_ascii=False)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temp_path, CONFIG_FILE)
            return True
        except OSError as e:
            self.log(f"保存配置失败: {e}")
            return False
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except OSError:
                    pass

    def open_activity(self, _event=None):
        selected = self.activity_tree.selection()
        if not selected:
            self.log("请先选择一个已发现的签到活动")
            return
        url = self.pending_urls.get(selected[0])
        if url:
            try:
                opened = webbrowser.open(url)
            except webbrowser.Error:
                opened = False
            self.log("已打开官方课堂；如有提示请在浏览器登录"
                     if opened else f"无法打开浏览器，请访问: {url}")

    # ---------- 监听控制 ----------
    def start(self):
        username = self.cmb_user.get().strip()
        password = self.ent_pass.get()
        token = self.ent_token.get().strip()
        userid = self.ent_userid.get().strip()
        url = self.ent_url.get().strip()
        cid, _ = (None, None) if self.auto_discover.get() else parse_ids(url)
        if not self.auto_discover.get() and not cid:
            self.log("请勾选自动发现，或填写含 classroomId 的课堂 URL")
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
        if not self._save_config():
            return

        # 每次都用当前输入重新开始; 正在监听则自动停掉旧的 —— 换号直接改完再点即可
        self.stop_event.set()
        self.stop_event = threading.Event()
        for item in self.activity_tree.get_children():
            self.activity_tree.delete(item)
        self.pending_urls.clear()
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
        scope = f"课堂 {cid}" if cid else "自动发现本人课堂"
        self.lbl_status.configure(text=f"状态: {scope}", foreground="#0a0")
        self.log(f"开始监听 ({scope}), 使用 {who} ...")

    def stop(self):
        self.stop_event.set()
        self.btn_stop.configure(state=tk.DISABLED)
        self.lbl_status.configure(text="状态: 已停止", foreground="#a00")
        self.log("已停止监听")

    def _monitor_loop(self, cid, username, password, api, stop_event):
        password_mode = not api.token and bool(username and password)
        try:
            if password_mode:
                ok, msg = api.login(username, password)
                self.log(msg)
                if not ok:
                    return
            elif not api.token:
                self.log("未提供登录信息")
                return

            rooms = []
            refresh_at = 0
            seen = set()
            polls = 0
            while not stop_event.is_set():
                try:
                    if time.monotonic() >= refresh_at:
                        rooms = api.classrooms(stop_event)
                        if cid:
                            rooms = [room for room in rooms if room["id"] == cid]
                        if stop_event.is_set():
                            break
                        self.log(f"已发现 {len(rooms)} 个本人进行中的课堂"
                                 + ("；等待新课堂，每分钟刷新" if not rooms else ""))
                        refresh_at = time.monotonic() + CLASSROOM_REFRESH_INTERVAL
                    for room in rooms:
                        if stop_event.is_set():
                            break
                        try:
                            for item in api.activities(room["id"], stop_event):
                                if stop_event.is_set():
                                    break
                                aid = item.get("relationId")
                                if (str(item.get("relationType")) != "1"
                                        or str(item.get("status")) != "0"
                                        or str(item.get("state")) in ("1", "2")
                                        or not str(aid).isdigit()):
                                    continue
                                key = (room["id"], str(aid))
                                if key in seen:
                                    continue
                                seen.add(key)
                                title = item.get("title") or "签到"
                                self.log(f"发现待签到: {room['course_name']} / {title}，"
                                         "请打开官方课堂完成验证")
                                self.ctrl_queue.put((stop_event, "FOUND", (room, title, aid)))
                        except requests.HTTPError as e:
                            if e.response is None or e.response.status_code not in (403, 404):
                                raise
                            self.log(f"课堂 {room['id']} 已无访问权限或已删除，下轮刷新")
                            refresh_at = 0
                    polls += 1
                    if polls % 20 == 0:
                        self.log(f"监听中... 已轮询 {polls} 次")
                except SessionExpired:
                    if not password_mode:
                        self.log("Token 已失效，请更新后重新开始")
                        return
                    self.log("登录已过期，重新登录 ...")
                    ok, msg = api.login(username, password)
                    self.log(msg)
                    if not ok:
                        return
                    refresh_at = 0
                except requests.RequestException as e:
                    self.log(f"网络请求失败 ({type(e).__name__})，稍后重试")
                except ValueError as e:
                    self.log(f"响应异常: {e}")
                    return
                stop_event.wait(POLL_INTERVAL)
        except requests.RequestException as e:
            self.log(f"登录请求失败 ({type(e).__name__})，请检查网络后重新开始")
        except ValueError as e:
            self.log(f"登录响应异常: {e}")
        finally:
            api.session.close()
            self.ctrl_queue.put((stop_event, "STOP", None))
            self.log("监听线程已退出")


if __name__ == "__main__":
    App().mainloop()
