import importlib.util
import json
import os
import queue
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location(
    "signin_gui", os.path.join(os.path.dirname(__file__), "signin_gui.py"))
signin_gui = importlib.util.module_from_spec(spec)
spec.loader.exec_module(signin_gui)


class Field:
    def __init__(self, value):
        self.value = value
        self.values = []

    def get(self):
        return self.value

    def set(self, value):
        self.value = value

    def insert(self, index, value):
        self.value = str(value) + str(self.value)

    def configure(self, **kwargs):
        self.values = kwargs.get("values", self.values)


class SaveTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = os.path.join(self.temp.name, "config.json")
        self.config_patch = patch.object(signin_gui, "CONFIG_FILE", self.path)
        self.config_patch.start()
        self.addCleanup(self.config_patch.stop)
        self.app = object.__new__(signin_gui.App)
        self.app.accounts = {}
        self.app.cmb_user = Field("student")
        self.app.ent_pass = Field("secret")
        self.app.ent_token = Field("")
        self.app.ent_userid = Field("")
        self.app.ent_url = Field("classroomId=123")
        self.app._save_timer = None
        self.app._config_load_failed = False
        self.app.auto_discover = Field(True)
        legacy_patch = patch.object(signin_gui, "LEGACY_CONFIG_FILES", [])
        legacy_patch.start()
        self.addCleanup(legacy_patch.stop)
        self.app.log = lambda message: self.errors.append(message)
        self.errors = []

    def test_save_persists_current_fields_and_account(self):
        self.assertTrue(self.app._save_config())
        with open(self.path, encoding="utf-8") as file:
            config = json.load(file)
        self.assertEqual(config["accounts"], {"student": "secret"})
        self.assertEqual(config["url"], "classroomId=123")
        self.assertEqual(config["last_username"], "student")

    def test_failed_replace_preserves_previous_config_and_reports_error(self):
        with open(self.path, "w", encoding="utf-8") as file:
            file.write("old config")
        with patch.object(signin_gui.os, "replace", side_effect=OSError("locked")):
            self.assertFalse(self.app._save_config())
        with open(self.path, encoding="utf-8") as file:
            self.assertEqual(file.read(), "old config")
        self.assertIn("locked", self.errors[0])
        self.assertEqual(os.listdir(self.temp.name), ["config.json"])

    def test_close_saves_before_destroy(self):
        events = []
        self.app.stop_event = type("Stop", (), {"set": lambda _: events.append("stop")})()
        self.app.destroy = lambda: events.append("destroy")
        self.app._on_close()
        self.assertEqual(events, ["stop", "destroy"])
        self.assertTrue(os.path.exists(self.path))

    def test_input_changes_debounce_save(self):
        canceled = []
        self.app.after = lambda delay, callback: (delay, callback)
        self.app.after_cancel = canceled.append
        self.app._schedule_save()
        first = self.app._save_timer
        self.app._schedule_save()
        self.assertEqual(canceled, [first])
        self.assertEqual(self.app._save_timer[0], 500)
        self.app._save_timer[1]()
        self.assertTrue(os.path.exists(self.path))

    def test_saved_accounts_restore_after_reopening(self):
        self.app.accounts["another"] = "another-password"
        self.assertTrue(self.app._save_config())
        self.app.accounts = {}
        for field in (self.app.cmb_user, self.app.ent_pass, self.app.ent_token,
                      self.app.ent_userid, self.app.ent_url):
            field.set("")
        self.app.auto_discover.set(False)
        self.app._load_config()
        self.assertEqual(self.app.accounts, {"student": "secret", "another": "another-password"})
        self.assertEqual(self.app.cmb_user.get(), "student")
        self.assertEqual(self.app.ent_pass.get(), "secret")
        self.assertTrue(self.app.auto_discover.get())

    def test_old_single_account_config_migrates_to_fixed_directory(self):
        old_path = os.path.join(self.temp.name, "old.json")
        with open(old_path, "w", encoding="utf-8-sig") as file:
            json.dump({"username": "legacy", "password": "old-password"}, file)
        for field in (self.app.cmb_user, self.app.ent_pass, self.app.ent_url):
            field.set("")
        with patch.object(signin_gui, "LEGACY_CONFIG_FILES", [old_path]):
            self.app._load_config()
        self.assertEqual(self.app.cmb_user.get(), "legacy")
        self.assertEqual(self.app.ent_pass.get(), "old-password")
        with open(self.path, encoding="utf-8") as file:
            self.assertEqual(json.load(file)["accounts"], {"legacy": "old-password"})

    def test_corrupt_config_is_reported_and_not_overwritten(self):
        with open(self.path, "w", encoding="utf-8") as file:
            file.write("broken config")
        self.app._load_config()
        self.assertTrue(self.app._config_load_failed)
        self.assertFalse(self.app._save_config())
        with open(self.path, encoding="utf-8") as file:
            self.assertEqual(file.read(), "broken config")
        self.assertTrue(self.errors)

    def test_save_creates_missing_data_directory(self):
        nested_path = os.path.join(self.temp.name, "new-data", "config.json")
        with patch.object(signin_gui, "CONFIG_FILE", nested_path):
            self.assertTrue(self.app._save_config())
        self.assertTrue(os.path.isfile(nested_path))


class GuiPersistenceTests(unittest.TestCase):
    def test_real_window_restores_account_after_close_and_reopen(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(
                signin_gui, "CONFIG_FILE", os.path.join(temp, "data", "config.json")), patch.object(
                signin_gui, "LOG_FILE", os.path.join(temp, "test.log")), patch.object(
                signin_gui, "LEGACY_CONFIG_FILES", []):
            app = signin_gui.App()
            app.withdraw()
            app.cmb_user.set("gui-student")
            app.ent_pass.insert(0, "gui-password")
            app.remember_account()
            app._on_close()
            reopened = signin_gui.App()
            reopened.withdraw()
            try:
                self.assertEqual(reopened.cmb_user.get(), "gui-student")
                self.assertEqual(reopened.ent_pass.get(), "gui-password")
                self.assertEqual(reopened.accounts, {"gui-student": "gui-password"})
                self.assertTrue(reopened.auto_discover.get())
            finally:
                reopened._on_close()


class DiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.api = signin_gui.SigninAPI()
        self.addCleanup(self.api.session.close)
        self.api.token = "test-token"
        self.api.user_id = "42"
        self.stop = threading.Event()

    def test_discovers_only_current_student_active_classrooms(self):
        responses = [
            {"courseList": [{"id": 12, "name": "Course"}]},
            {"result": {"list": [{"id": 123, "status": 0},
                                   {"id": 124, "status": 2}]}},
        ]
        with patch.object(self.api, "_get", side_effect=responses) as get:
            rooms = self.api.classrooms(self.stop)
        self.assertEqual([room["id"] for room in rooms], [123])
        self.assertEqual(rooms[0]["course_name"], "Course")
        self.assertEqual(get.call_args_list[0].args[0], "/courses/students")
        self.assertEqual(get.call_args_list[1].args[0], "/wisdomClassroom/student/getClassroomList")
        self.assertEqual(get.call_args_list[1].args[1]["teacherId"], "42")

    def test_courses_are_paginated(self):
        with patch.object(signin_gui, "PAGE_SIZE", 1), patch.object(
                self.api, "_get", side_effect=[{"courseList": [{"id": 1}]},
                                              {"courseList": [{"id": 2}]},
                                              {"courseList": []}]) as get:
            courses = list(self.api._pages("/courses/students", {}, key="courseList",
                                          nested=False, page_key="pn", size_key="ps"))
        self.assertEqual([course["id"] for course in courses], [1, 2])
        self.assertEqual([call.args[1]["pn"] for call in get.call_args_list], [1, 2, 3])

    def test_expired_session_is_detected(self):
        response = Mock(status_code=200)
        response.json.return_value = {"code": 2001}
        with patch.object(self.api.session, "get", return_value=response):
            with self.assertRaises(signin_gui.SessionExpired):
                list(self.api.activities(123, self.stop))

    def test_monitor_discovers_without_url_and_skips_finished_or_signed_items(self):
        room = {"id": 123, "ocId": 12, "course_name": "Course"}
        items = [
            {"relationType": 1, "relationId": 9, "status": 0, "state": 0, "title": "Sign"},
            {"relationType": 1, "relationId": 9, "status": 0, "state": 0, "title": "Sign"},
            {"relationType": 1, "relationId": 10, "status": 2, "state": 0},
            {"relationType": 1, "relationId": 11, "status": 0, "state": 1},
            {"relationType": 2, "relationId": 12, "status": 0, "state": 0},
        ]
        app = object.__new__(signin_gui.App)
        app.ctrl_queue = queue.Queue()
        app.log = Mock()
        stop = Mock()
        stop.is_set.return_value = False
        stop.wait.side_effect = lambda _: setattr(stop.is_set, "return_value", True)
        with patch.object(self.api, "classrooms", return_value=[room]), patch.object(
                self.api, "activities", return_value=iter(items)):
            app._monitor_loop(None, "", "", self.api, stop)
        events = []
        while not app.ctrl_queue.empty():
            events.append(app.ctrl_queue.get())
        self.assertEqual([event[1] for event in events], ["FOUND", "STOP"])
        self.assertEqual(events[0][2], (room, "Sign", 9))


if __name__ == "__main__":
    unittest.main()
