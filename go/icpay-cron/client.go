package iccron

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	DefaultCanisterID = "w2fxo-5qaaa-aaaan-q6zxq-cai"
	DefaultHost       = "https://icp0.io"
)

type TriggerResponse struct {
	OK     bool   `json:"ok"`
	JobID  uint64 `json:"job_id,omitempty"`
	Status string `json:"status,omitempty"`
	Error  string `json:"error,omitempty"`
}

type Client struct {
	APIKey     string
	CanisterID string
	Host       string
	HTTPClient *http.Client
}

func NewClient(apiKey string) *Client {
	return &Client{
		APIKey:     apiKey,
		CanisterID: DefaultCanisterID,
		Host:       DefaultHost,
		HTTPClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *Client) WithCanisterID(canisterID string) *Client {
	c.CanisterID = canisterID
	return c
}

func (c *Client) WithHost(host string) *Client {
	c.Host = strings.TrimRight(host, "/")
	return c
}

func FormatProjectID(id uint64) string {
	return fmt.Sprintf("cr_%08x", id)
}

func (c *Client) doRequest(method, path string, body interface{}, out interface{}) error {
	isLocal := strings.Contains(c.Host, "127.0.0.1") || strings.Contains(c.Host, "localhost")

	var url string
	var hostHeader string

	if isLocal {
		url = fmt.Sprintf("%s%s?canisterId=%s", c.Host, path, c.CanisterID)
		hostHeader = fmt.Sprintf("%s.raw.localhost", c.CanisterID)
	} else {
		url = fmt.Sprintf("https://%s.raw.icp0.io%s", c.CanisterID, path)
	}

	var bodyReader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to serialize payload: %w", err)
		}
		bodyReader = bytes.NewBuffer(payload)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")
	if hostHeader != "" {
		req.Header.Set("Host", hostHeader)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode >= 400 {
		var errBody struct {
			Error string `json:"error"`
		}
		_ = json.Unmarshal(bodyBytes, &errBody)
		errMsg := errBody.Error
		if errMsg == "" {
			errMsg = fmt.Sprintf("HTTP status %d", resp.StatusCode)
		}
		return fmt.Errorf("request failed: %s", errMsg)
	}

	if out != nil {
		if err := json.Unmarshal(bodyBytes, out); err != nil {
			return fmt.Errorf("failed to parse response JSON: %w (raw: %s)", err, string(bodyBytes))
		}
	}

	return nil
}

func (c *Client) Trigger(projectID string, jobID uint64) (*TriggerResponse, error) {
	var tr TriggerResponse
	err := c.doRequest("POST", "/api/v1/cron/trigger", map[string]interface{}{
		"project_id": projectID,
		"job_id":     jobID,
	}, &tr)
	if err != nil {
		return &tr, err
	}
	return &tr, nil
}

func (c *Client) CreateJob(label, cronExpression string, target map[string]interface{}) (map[string]interface{}, error) {
	var resp struct {
		OK  bool                   `json:"ok"`
		Job map[string]interface{} `json:"job"`
	}
	err := c.doRequest("POST", "/api/v1/cron/jobs", map[string]interface{}{
		"label":           label,
		"cron_expression": cronExpression,
		"target":          target,
	}, &resp)
	return resp.Job, err
}

func (c *Client) ListJobs() ([]map[string]interface{}, error) {
	var resp struct {
		OK   bool                     `json:"ok"`
		Jobs []map[string]interface{} `json:"jobs"`
	}
	err := c.doRequest("GET", "/api/v1/cron/jobs", nil, &resp)
	return resp.Jobs, err
}

func (c *Client) PauseJob(jobID uint64) error {
	return c.doRequest("POST", fmt.Sprintf("/api/v1/cron/jobs/%d/pause", jobID), nil, nil)
}

func (c *Client) ResumeJob(jobID uint64) error {
	return c.doRequest("POST", fmt.Sprintf("/api/v1/cron/jobs/%d/resume", jobID), nil, nil)
}

func (c *Client) DeleteJob(jobID uint64) error {
	return c.doRequest("DELETE", fmt.Sprintf("/api/v1/cron/jobs/%d", jobID), nil, nil)
}

func (c *Client) GetJobLogs(jobID uint64) ([]map[string]interface{}, error) {
	var resp struct {
		OK   bool                     `json:"ok"`
		Logs []map[string]interface{} `json:"logs"`
	}
	err := c.doRequest("GET", fmt.Sprintf("/api/v1/cron/jobs/%d/logs", jobID), nil, &resp)
	return resp.Logs, err
}

func (c *Client) GetProjectLogs() ([]map[string]interface{}, error) {
	var resp struct {
		OK   bool                     `json:"ok"`
		Logs []map[string]interface{} `json:"logs"`
	}
	err := c.doRequest("GET", "/api/v1/cron/logs", nil, &resp)
	return resp.Logs, err
}
