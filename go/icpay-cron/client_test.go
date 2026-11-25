package iccron

import (
	"testing"
)

func TestFormatProjectID(t *testing.T) {
	if got := FormatProjectID(1); got != "cr_00000001" {
		t.Fatalf("expected cr_00000001, got %s", got)
	}
	if got := FormatProjectID(15); got != "cr_0000000f" {
		t.Fatalf("expected cr_0000000f, got %s", got)
	}
}

func TestNewClient(t *testing.T) {
	c := NewClient("test_key").
		WithCanisterID("custom_canister").
		WithHost("http://127.0.0.1:4943")

	if c.APIKey != "test_key" {
		t.Fatalf("expected test_key, got %s", c.APIKey)
	}
	if c.CanisterID != "custom_canister" {
		t.Fatalf("expected custom_canister, got %s", c.CanisterID)
	}
	if c.Host != "http://127.0.0.1:4943" {
		t.Fatalf("expected http://127.0.0.1:4943, got %s", c.Host)
	}
}

func TestLiveTrigger(t *testing.T) {
	c := NewClient("icp_cron_f880a426c475f04859a30828fb1234a5e844f13d659e8b94e1a48eb70af9bc68").
		WithCanisterID("uxrrr-q7777-77774-qaaaq-cai").
		WithHost("http://127.0.0.1:4943")

	resp, err := c.Trigger("cr_00000001", 1)
	if err != nil {
		t.Logf("Notice: live trigger test error: %v", err)
		return
	}
	if !resp.OK {
		t.Fatalf("expected OK true, got %v", resp.OK)
	}
	if resp.JobID != 1 {
		t.Fatalf("expected JobID 1, got %d", resp.JobID)
	}
	if resp.Status != "triggered" {
		t.Fatalf("expected status triggered, got %s", resp.Status)
	}
}
