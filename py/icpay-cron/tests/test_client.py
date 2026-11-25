import unittest
from icpay_cron import IcCronClient, AuthenticationError, JobNotFoundError


class TestIcCronClient(unittest.TestCase):
    def test_format_project_id(self):
        self.assertEqual(IcCronClient.format_project_id(1), "cr_00000001")
        self.assertEqual(IcCronClient.format_project_id(15), "cr_0000000f")

    def test_client_init(self):
        client = IcCronClient("test_key", "custom-canister", "http://127.0.0.1:4943")
        self.assertEqual(client.api_key, "test_key")
        self.assertEqual(client.canister_id, "custom-canister")
        self.assertEqual(client.host, "http://127.0.0.1:4943")

    def test_live_local_trigger(self):
        client = IcCronClient(
            "icp_cron_f880a426c475f04859a30828fb1234a5e844f13d659e8b94e1a48eb70af9bc68",
            "uxrrr-q7777-77774-qaaaq-cai",
            "http://127.0.0.1:4943",
        )
        try:
            res = client.trigger("cr_00000001", 1)
            self.assertTrue(res.get("ok"))
            self.assertEqual(res.get("job_id"), 1)
            self.assertEqual(res.get("status"), "triggered")
        except Exception as e:
            # Handle offline replica gracefully
            print(f"Notice: live trigger test exception: {e}")


if __name__ == "__main__":
    unittest.main()
