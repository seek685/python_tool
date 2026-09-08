#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""阅读时长上报接口验证脚本 (求是读书计划)"""
import json
import subprocess
import sys
import time
import urllib.parse
import re

import requests

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

USERNAME = "2025410010124"
PASSWORD = "Vv22338899"
ITEM_ID = 1845889      # 《共产党宣言》
PAGE_ID = 4809637      # 该书对应的电子书页
STUDY_TIME = 300       # 本次上报时长(秒), 客户端上限 1000/次


def des_encrypt(plaintext: str) -> str:
    p = subprocess.run(
        ["openssl", "enc", "-provider", "legacy", "-provider", "default",
         "-des-ecb", "-K", "3132333435363738", "-base64", "-A"],
        input=plaintext.encode("utf-8"), capture_output=True, check=True)
    return p.stdout.decode().strip()


def main():
    s = requests.Session()
    s.trust_env = False
    s.post("https://application.dgut.edu.cn/appapi/user/login/app",
           data={"loginName": f"dgut{USERNAME}", "password": PASSWORD, "alias": "application"},
           headers={"User-Agent": "Mozilla/5.0 Chrome/126.0"},
           timeout=10, allow_redirects=False)
    token = s.cookies.get("AUTHORIZATION")
    raw = urllib.parse.unquote(s.cookies.get("USERINFO") or "")
    raw = re.sub(r"%u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), raw)
    uname = (re.search(r'"name"\s*:\s*"([^"]*)"', raw) or [None, "?"])[1]
    print(f"登录: {uname}, token={token[:8]}...")
    h = {"AUTHORIZATION": token, "Content-Type": "application/json",
         "User-Agent": "Mozilla/5.0 Chrome/126.0"}

    # 读现有记录 (拿 version)
    r = s.get(f"https://ua.dgut.edu.cn/uaapi/studyrecord/item/{ITEM_ID}?courseType=4",
              headers=h, timeout=15)
    print("现有记录:", r.status_code, r.text[:200] or "(空, 从未学过)")
    version = 0
    try:
        version = r.json().get("version", 0)
    except Exception:
        pass

    dto = {
        "itemid": ITEM_ID,
        "autoSave": 1,
        "version": version,
        "withoutOld": 1,
        "complete": 1,
        "studyStartTime": int(time.time() * 1000) - STUDY_TIME * 1000,
        "userName": uname,
        "score": 0,
        "pageStudyRecordDTOList": [{
            "pageid": PAGE_ID,
            "complete": 1,
            "studyTime": STUDY_TIME,
            "score": 0,
            "answerTime": 1,
            "submitTimes": 0,
            "coursepageId": None,
            "questions": [], "videos": [], "speaks": [],
        }],
    }
    plain = json.dumps(dto, ensure_ascii=False, separators=(",", ":"))
    print("明文:", plain[:200])
    data = des_encrypt(plain)
    r = s.post("https://ua.dgut.edu.cn/uaapi/yws/api/personal/sync?courseType=4&platform=PC",
               headers=h, data=data, timeout=90)
    print("上报响应:", r.status_code, r.text[:300])


if __name__ == "__main__":
    main()
