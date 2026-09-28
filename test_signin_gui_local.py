import importlib.util
import json
import os
import tempfile
import unittest
from unittest.mock import patch

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


if __name__ == "__main__":
    unittest.main()
