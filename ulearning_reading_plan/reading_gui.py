#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
求是读书计划 - 阅读电子书时长工具 (东莞理工 测试用)
双击运行 (需 Python 3, pip install requests)

原理: 课程播放器 (ua.dgut.edu.cn/learnCourse) 的阅读时长由前端 DES 加密上报,
      接口 /uaapi/yws/api/personal/sync 不校验真实性、无速率限制,
      实测单请求可上报 20000 秒并全额入账。
      (密钥硬编码在前端 JS 里: "12345678", 见 recon/model-Section.js)

书目来源: 与课程"教材"页完全一致 (courseapi /textbook/and/directory),
      只显示老师教学计划里实际下发的书, 并显示每本书当前已读时长。

用法: 账号(学号)+密码 -> 登录并加载书目 -> 勾选书(可多选) -> 填小时数 -> 开始挂时长
      课程URL填教材页地址, 如:
      https://lms.dgut.edu.cn/ulearning/index.html#/course/textbook?courseId=158753
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

from des_crypto import des_ecb_encrypt_base64

LOGIN_URL = "https://application.dgut.edu.cn/appapi/user/login/app"
UA = "https://ua.dgut.edu.cn/uaapi"
COURSEAPI = "https://lms.dgut.edu.cn/courseapi"
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "reading_gui_config.json")

NOTICE = """注意事项:
1. 本工具仅用于老师布置的求是读书计划测试, 请勿用于其他用途。
2. 账号填学号即可 (自动补 dgut 前缀), 密码是应用中心网页的登录密码。
3. 课程URL: 填"教材"页地址 (书目与老师教学计划一致) 或阅读播放器链接
   (书目为总库口径) 都可以; 不填则默认求是读书计划 (courseId=158753)。
4. 时长按小时填, 支持小数; 列表里每本书后面显示的是服务器端当前已读时长。
5. 请关闭代理/VPN, 程序需要直连学校服务器。"""


class ReadingAPI:
    def __init__(self):
        self.token = ""
        self.user_name = ""
        self.session = requests.Session()
        self.session.trust_env = False

    def _h(self):
        return {"AUTHORIZATION": self.token, "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 Chrome/126.0"}

    def login(self, username, password):
        name = f"dgut{username}" if username.isdigit() else username
        self.session.cookies.clear()
        self.session.post(LOGIN_URL,
                          data={"loginName": name, "password": password, "alias": "application"},
                          headers={"User-Agent": "Mozilla/5.0 Chrome/126.0"},
                          timeout=10, allow_redirects=False)
        self.token = self.session.cookies.get("AUTHORIZATION") or ""
        if not self.token:
            return False, "登录失败: 账号或密码错误 (连续失败会锁定账号, 请确认后再试)"
        raw = urllib.parse.unquote(self.session.cookies.get("USERINFO") or "")
        raw = re.sub(r"%u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), raw)
        m = re.search(r'"name"\s*:\s*"([^"]*)"', raw)
        self.user_name = m.group(1) if m else ""
        return True, f"登录成功 (账号 {name}, 姓名 {self.user_name})"

    def course_class_id(self, oc_id):
        """从课程列表查该课程的 classId"""
        r = self.session.get(
            f"{COURSEAPI}/courses/students?publishStatus=-1&pn=1&ps=100&type=1",
            headers=self._h(), timeout=15)
        for c in (r.json().get("courseList") or []):
            if c.get("id") == oc_id:
                return c.get("classId")
        return None

    def textbook_id(self, oc_id):
        """课程 -> 教材(播放器课程)id"""
        r = self.session.get(f"{COURSEAPI}/textbook/student/{oc_id}/list",
                             headers=self._h(), timeout=15)
        arr = r.json()
        return arr[0]["courseId"] if arr else None

    def textbook_directory(self, oc_id, class_id, textbook_id):
        """教材页(教学计划)实际下发的书目: [(itemid, title)]"""
        r = self.session.get(
            f"{COURSEAPI}/textbook/and/directory?ocId={oc_id}&classId={class_id}&textBookId={textbook_id}",
            headers=self._h(), timeout=15)
        data = r.json()
        chapters = data[0].get("chapters") if isinstance(data, list) else data.get("chapters")
        items = []
        for ch in chapters or []:
            for it in ch.get("items") or []:
                items.append((it["itemId"], (it.get("title") or "").strip()))
        return items

    def player_directory_items(self, player_course_id, class_id):
        """播放器完整目录: [(itemid, pageid, title)] (书目总库口径)"""
        url = f"{UA}/course/{player_course_id}/directory"
        if class_id:
            url += f"?classId={class_id}"
        r = self.session.get(url, headers=self._h(), timeout=20)
        items = []
        for ch in (r.json().get("chapters") or []):
            for item in ch.get("items") or []:
                pages = [p for p in (item.get("coursepages") or []) if p.get("type") == 11]
                if pages:
                    items.append((item["itemid"], pages[0]["id"],
                                  (item.get("title") or "").strip()))
        return items

    def page_map(self, player_course_id, class_id):
        """播放器目录: itemid -> 电子书页 id"""
        return {iid: pid for iid, pid, _ in
                self.player_directory_items(player_course_id, class_id)}

    def get_study_time(self, item_id):
        """返回该 item 服务器端累计 studyTime(秒), 无记录返回 0"""
        r = self.session.get(f"{UA}/studyrecord/item/{item_id}?courseType=4",
                             headers=self._h(), timeout=30)
        if not r.text:
            return 0
        return (r.json().get("studyTime") or 0)

    def submit(self, item_id, page_id, study_time):
        # 非习题页面: 学完即满分 100 (见 recon/model-Page.js:347), 不能写 0
        dto = {
            "itemid": item_id, "autoSave": 1, "version": 0, "withoutOld": 1,
            "complete": 1,
            "studyStartTime": int(time.time() * 1000) - study_time * 1000,
            "userName": self.user_name, "score": 100,
            "pageStudyRecordDTOList": [{
                "pageid": page_id, "complete": 1, "studyTime": study_time,
                "score": 100, "answerTime": 1, "submitTimes": 0,
                "coursepageId": None, "questions": [], "videos": [], "speaks": [],
            }],
        }
        plain = json.dumps(dto, ensure_ascii=False, separators=(",", ":"))
        r = self.session.post(f"{UA}/yws/api/personal/sync?courseType=4&platform=PC",
                              headers=self._h(),
                              data=des_ecb_encrypt_base64(plain), timeout=90)
        return r.text.strip()


def parse_course_url(text):
    """从教材页/播放器 URL 解析 courseId / classId"""
    cid = re.search(r"courseId=(\d+)", text or "")
    clid = re.search(r"classId=(\d+)", text or "")
    return (int(cid.group(1)) if cid else None,
            int(clid.group(1)) if clid else None)


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("求是读书计划 阅读时长工具 (测试版)")
        self.geometry("720x680")
        self.minsize(680, 660)

        self.api = ReadingAPI()
        self.books = []        # [(itemid, pageid, 书名)]
        self.check_vars = []   # 每本书的 BooleanVar
        self.check_widgets = []
        self.log_queue = queue.Queue()
        self.ctrl_queue = queue.Queue()
        self.stop_event = threading.Event()
        self.worker = None

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
        self.ent_user = ttk.Entry(row1, width=16)
        self.ent_user.pack(side=tk.LEFT, padx=(4, 10))
        ttk.Label(row1, text="密码:").pack(side=tk.LEFT)
        self.ent_pass = ttk.Entry(row1, width=14, show="*")
        self.ent_pass.pack(side=tk.LEFT, padx=(4, 10))
        ttk.Label(row1, text="每本书挂:").pack(side=tk.LEFT)
        self.ent_hours = ttk.Entry(row1, width=6)
        self.ent_hours.insert(0, "2")
        self.ent_hours.pack(side=tk.LEFT, padx=2)
        ttk.Label(row1, text="小时").pack(side=tk.LEFT)

        row2 = ttk.Frame(frm)
        row2.pack(fill=tk.X, pady=2)
        ttk.Label(row2, text="课程URL:").pack(side=tk.LEFT)
        self.ent_url = ttk.Entry(row2)
        self.ent_url.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)

        row3 = ttk.Frame(frm)
        row3.pack(fill=tk.X, pady=6)
        self.btn_load = ttk.Button(row3, text="登录并加载书目", command=self.load_books)
        self.btn_load.pack(side=tk.LEFT)
        self.btn_run = ttk.Button(row3, text="开始挂时长", command=self.start_run,
                                  state=tk.DISABLED)
        self.btn_run.pack(side=tk.LEFT, padx=8)
        ttk.Button(row3, text="全选", command=lambda: self._set_all(True)).pack(side=tk.LEFT)
        ttk.Button(row3, text="全不选", command=lambda: self._set_all(False)).pack(side=tk.LEFT, padx=6)
        self.lbl_status = ttk.Label(row3, text="状态: 待机", foreground="#666")
        self.lbl_status.pack(side=tk.LEFT, padx=10)

        ttk.Label(frm, text=NOTICE, justify=tk.LEFT, foreground="#8a5a00").pack(
            fill=tk.X, pady=(4, 4))

        # 带勾选框的可滚动书目区
        mid = ttk.Frame(frm)
        mid.pack(fill=tk.BOTH, expand=True)
        self.canvas = tk.Canvas(mid, height=170, highlightthickness=0)
        sb = ttk.Scrollbar(mid, orient=tk.VERTICAL, command=self.canvas.yview)
        self.books_frame = ttk.Frame(self.canvas)
        self.books_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.create_window((0, 0), window=self.books_frame, anchor="nw")
        self.canvas.configure(yscrollcommand=sb.set)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)
        # 鼠标滚轮滚动
        self.canvas.bind_all("<MouseWheel>",
                             lambda e: self.canvas.yview_scroll(int(-e.delta / 120), "units"))

        self.txt_log = scrolledtext.ScrolledText(frm, height=10, state=tk.DISABLED,
                                                 font=("Consolas", 9))
        self.txt_log.pack(fill=tk.BOTH, expand=True, pady=(6, 0))

    def _set_all(self, value):
        for v in self.check_vars:
            v.set(value)

    def _rebuild_book_list(self, times):
        """根据 times(秒) 重建勾选列表"""
        for w in self.check_widgets:
            w.destroy()
        self.check_vars = []
        self.check_widgets = []
        for (item_id, page_id, title), secs in zip(self.books, times):
            var = tk.BooleanVar(value=False)
            cb = ttk.Checkbutton(
                self.books_frame,
                text=f"{title}  —  已读 {secs / 3600:.2f} 小时",
                variable=var)
            cb.pack(anchor="w", padx=6, pady=1)
            self.check_vars.append(var)
            self.check_widgets.append(cb)

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
                ctrl, *payload = self.ctrl_queue.get_nowait()
            except queue.Empty:
                break
            if ctrl == "BOOKS":
                self._rebuild_book_list(payload[0])
                self.btn_load.configure(state=tk.NORMAL)
                self.btn_run.configure(state=tk.NORMAL)
                self.lbl_status.configure(text="状态: 书目已加载", foreground="#0a0")
            elif ctrl == "REFRESH_TIMES":
                times = payload[0]
                for w, secs in zip(self.check_widgets, times):
                    base = w.cget("text").split("  —  ")[0]
                    w.configure(text=f"{base}  —  已读 {secs / 3600:.2f} 小时")
            elif ctrl == "RUN_DONE":
                self.btn_run.configure(state=tk.NORMAL)
                self.btn_load.configure(state=tk.NORMAL)
                self.lbl_status.configure(text="状态: 完成", foreground="#0a0")
            elif ctrl == "STOPPED":
                self.btn_run.configure(state=tk.NORMAL)
                self.btn_load.configure(state=tk.NORMAL)
                self.lbl_status.configure(text="状态: 已停止", foreground="#a00")
        self.after(200, self._drain_queues)

    def _load_config(self):
        try:
            with open(CONFIG_FILE, encoding="utf-8") as f:
                cfg = json.load(f)
            self.ent_user.insert(0, cfg.get("username", ""))
            self.ent_pass.insert(0, cfg.get("password", ""))
            self.ent_url.insert(0, cfg.get("url", ""))
        except (OSError, ValueError):
            pass
        if not self.ent_url.get().strip():
            self.ent_url.insert(0, "https://lms.dgut.edu.cn/ulearning/index.html#/course/textbook?courseId=158753")

    def _save_config(self):
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump({"username": self.ent_user.get().strip(),
                           "password": self.ent_pass.get(),
                           "url": self.ent_url.get().strip()}, f, ensure_ascii=False)
        except OSError:
            pass

    # ---------- 加载书目 ----------
    def load_books(self):
        username = self.ent_user.get().strip()
        password = self.ent_pass.get()
        if not (username and password):
            self.log("请填账号和密码")
            return
        self._save_config()
        self.btn_load.configure(state=tk.DISABLED)
        self.lbl_status.configure(text="状态: 登录中...", foreground="#666")
        course_id, class_id = parse_course_url(self.ent_url.get().strip())
        course_id = course_id or 158753
        threading.Thread(target=self._load_worker,
                         args=(username, password, course_id, class_id),
                         daemon=True).start()

    def _load_worker(self, username, password, course_id, class_id):
        try:
            ok, msg = self.api.login(username, password)
        except Exception as e:
            self.log(f"登录请求异常: {e}, 请检查网络后重试")
            self.ctrl_queue.put("STOPPED")
            return
        self.log(msg)
        if not ok:
            self.ctrl_queue.put("STOPPED")
            return
        try:
            if not class_id:
                class_id = self.api.course_class_id(course_id)
                self.log(f"自动获取 classId = {class_id}")

            items = None
            source = ""
            # 优先按"教材页"口径 (教学计划下发的书目)
            if class_id:
                try:
                    tb_id = self.api.textbook_id(course_id)
                    if tb_id:
                        ui_items = self.api.textbook_directory(course_id, class_id, tb_id)
                        pmap = self.api.page_map(tb_id, class_id)
                        items = [(iid, pmap.get(iid), title) for iid, title in ui_items]
                        source = "教材页教学计划书目"
                except Exception:
                    items = None
            # 兜底: 播放器完整书目 (粘贴的是播放器链接 / 课程未配教材时)
            if items is None:
                items = self.api.player_directory_items(course_id, class_id)
                source = "播放器完整书目 (教材页无教材或粘的是播放器链接)"

            self.books = []
            skipped = 0
            for item_id, pid, title in items:
                if pid:
                    self.books.append((item_id, pid, title))
                else:
                    skipped += 1
            if not self.books:
                self.log("没有加载到任何书目, 请检查课程 URL 是否正确")
                self.ctrl_queue.put("STOPPED")
                return
            self.log(f"书目加载完成, 共 {len(self.books)} 本 [{source}]"
                     + (f", {skipped} 本无电子书页已跳过" if skipped else ""))
            # 拉取每本书的当前已读时长
            times = []
            for n, (item_id, _, title) in enumerate(self.books):
                try:
                    times.append(self.api.get_study_time(item_id))
                except Exception:
                    times.append(0)
                if (n + 1) % 10 == 0:
                    self.log(f"    已读时长查询进度 {n + 1}/{len(self.books)}")
            self.ctrl_queue.put(("BOOKS", times))
            self.log("在书目列表勾选 (支持多选/全选), 填小时数, 点开始挂时长")
        except Exception as e:
            self.log(f"加载书目失败: {e}")
            self.ctrl_queue.put("STOPPED")

    # ---------- 挂时长 ----------
    def start_run(self):
        sel = [self.books[i] for i, v in enumerate(self.check_vars) if v.get()]
        if not sel:
            self.log("请先勾选要挂时长的书 (可多选)")
            return
        try:
            hours = float(self.ent_hours.get().strip())
            assert hours > 0
        except (ValueError, AssertionError):
            self.log("小时数填写不正确")
            return
        self._save_config()
        self.btn_run.configure(state=tk.DISABLED)
        self.btn_load.configure(state=tk.DISABLED)
        self.lbl_status.configure(text="状态: 挂时长中...", foreground="#a60")
        self.stop_event.clear()
        threading.Thread(target=self._run_worker,
                         args=(sel, int(hours * 3600)), daemon=True).start()

    def _run_worker(self, targets, total_seconds):
        CHUNK = 10000  # 每次请求上报的秒数 (实测 20000 也能全额入账, 留点余量)
        for item_id, page_id, title in targets:
            if self.stop_event.is_set():
                break
            try:
                before = self.api.get_study_time(item_id)
                self.log(f"《{title}》当前已读 {before / 3600:.2f} 小时, 本次目标 +{total_seconds / 3600:.2f} 小时")
                remain = total_seconds
                while remain > 0 and not self.stop_event.is_set():
                    chunk = min(CHUNK, remain)
                    resp = self.api.submit(item_id, page_id, chunk)
                    remain -= chunk
                    self.log(f"    《{title}》上报 {chunk}s, 响应={resp}")
                    time.sleep(1.5)
                time.sleep(2)
                after = self.api.get_study_time(item_id)
                self.log(f"《{title}》完成, 服务器累计 {after / 3600:.2f} 小时 (本次入账 {(after - before) / 3600:.2f})")
            except Exception as e:
                self.log(f"《{title}》异常: {e}")
        self.log("全部选定书目处理完毕, 刷新已读时长...")
        self._refresh_times()
        self.ctrl_queue.put("RUN_DONE")

    def _refresh_times(self):
        times = []
        for item_id, _, _ in self.books:
            try:
                times.append(self.api.get_study_time(item_id))
            except Exception:
                times.append(0)
        self.ctrl_queue.put(("REFRESH_TIMES", times))


if __name__ == "__main__":
    App().mainloop()
