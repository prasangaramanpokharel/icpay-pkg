import json
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, Union

DEFAULT_CANISTER_ID = "w2fxo-5qaaa-aaaan-q6zxq-cai"
DEFAULT_HOST = "https://icp0.io"


class IcCronError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[Any] = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details


class AuthenticationError(IcCronError):
    pass


class JobNotFoundError(IcCronError):
    pass


class IcCronClient:
    def __init__(
        self,
        api_key: str,
        canister_id: str = DEFAULT_CANISTER_ID,
        host: str = DEFAULT_HOST,
    ):
        self.api_key = api_key
        self.canister_id = canister_id.strip()
        self.host = host.rstrip("/")

    @staticmethod
    def format_project_id(project_id: int) -> str:
        return f"cr_{project_id:08x}"

    def _request(
        self,
        method: str,
        path: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        is_local = "127.0.0.1" in self.host or "localhost" in self.host
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        if is_local:
            url = f"{self.host}{path}?canisterId={self.canister_id}"
            headers["Host"] = f"{self.canister_id}.raw.localhost"
        else:
            url = f"https://{self.canister_id}.raw.icp0.io{path}"

        data_bytes = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                err_data = json.loads(e.read().decode("utf-8"))
                msg = err_data.get("error", str(e))
            except Exception:
                err_data = None
                msg = str(e)

            if e.code == 401:
                raise AuthenticationError(msg, status_code=401, details=err_data)
            elif e.code == 404:
                raise JobNotFoundError(msg, status_code=404, details=err_data)
            else:
                raise IcCronError(msg, status_code=e.code, details=err_data)
        except urllib.error.URLError as e:
            raise IcCronError(f"Connection failed: {e}", details=e)

    def trigger(self, project_id: Union[str, int], job_id: int) -> Dict[str, Any]:
        formatted_project_id = self.format_project_id(project_id) if isinstance(project_id, int) else project_id
        return self._request(
            "POST",
            "/api/v1/cron/trigger",
            {"project_id": formatted_project_id, "job_id": job_id},
        )

    def create_job(
        self,
        label: str,
        cron_expression: str,
        target: Dict[str, Any],
        max_retries: Optional[int] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "label": label,
            "cron_expression": cron_expression,
            "target": target,
        }
        if max_retries is not None:
            payload["max_retries"] = max_retries
        data = self._request("POST", "/api/v1/cron/jobs", payload)
        return data.get("job", data)

    def list_jobs(self) -> Any:
        data = self._request("GET", "/api/v1/cron/jobs")
        return data.get("jobs", [])

    def pause_job(self, job_id: int) -> Dict[str, Any]:
        return self._request("POST", f"/api/v1/cron/jobs/{job_id}/pause")

    def resume_job(self, job_id: int) -> Dict[str, Any]:
        return self._request("POST", f"/api/v1/cron/jobs/{job_id}/resume")

    def delete_job(self, job_id: int) -> Dict[str, Any]:
        return self._request("DELETE", f"/api/v1/cron/jobs/{job_id}")

    def get_job_logs(self, job_id: int) -> Any:
        data = self._request("GET", f"/api/v1/cron/jobs/{job_id}/logs")
        return data.get("logs", [])

    def get_project_logs(self) -> Any:
        data = self._request("GET", "/api/v1/cron/logs")
        return data.get("logs", [])
