"""
Tests for the MyBotBox Python SDK
"""

import pytest
from unittest.mock import Mock, patch
from ystudio import (
    MyBotBoxClient,
    MyBotBoxError,
    QueuedExecutionResult,
    WorkflowExecutionResult,
    WorkflowStatus,
)


def test_mybotbox_client_initialization():
    """Test MyBotBoxClient initialization."""
    client = MyBotBoxClient(api_key="test-api-key", base_url="https://test.mybotbox.com")
    assert client.api_key == "test-api-key"
    assert client.base_url == "https://test.mybotbox.com"


def test_mybotbox_client_default_base_url():
    """Test MyBotBoxClient with default base URL."""
    client = MyBotBoxClient(api_key="test-api-key")
    assert client.api_key == "test-api-key"
    assert client.base_url == "https://mybotbox.com"


def test_set_api_key():
    """Test setting a new API key."""
    client = MyBotBoxClient(api_key="test-api-key")
    client.set_api_key("new-api-key")
    assert client.api_key == "new-api-key"


def test_set_base_url():
    """Test setting a new base URL."""
    client = MyBotBoxClient(api_key="test-api-key")
    client.set_base_url("https://new.mybotbox.com/")
    assert client.base_url == "https://new.mybotbox.com"


def test_set_base_url_strips_trailing_slash():
    """Test that base URL strips trailing slash."""
    client = MyBotBoxClient(api_key="test-api-key")
    client.set_base_url("https://test.mybotbox.com/")
    assert client.base_url == "https://test.mybotbox.com"


@patch('ystudio.requests.Session.get')
def test_validate_workflow_returns_false_on_error(mock_get):
    """Test that validate_workflow returns False when request fails."""
    mock_get.side_effect = MyBotBoxError("Network error")

    client = MyBotBoxClient(api_key="test-api-key")
    result = client.validate_workflow("test-workflow-id")

    assert result is False
    mock_get.assert_called_once_with("https://mybotbox.com/api/workflows/test-workflow-id/status")


def test_mybotbox_error():
    """Test MyBotBoxError creation."""
    error = MyBotBoxError("Test error", "TEST_CODE", 400)
    assert str(error) == "Test error"
    assert error.code == "TEST_CODE"
    assert error.status == 400


def test_workflow_execution_result():
    """Test WorkflowExecutionResult data class."""
    result = WorkflowExecutionResult(
        success=True,
        output={"data": "test"},
        metadata={"duration": 1000}
    )
    assert result.success is True
    assert result.output == {"data": "test"}
    assert result.metadata == {"duration": 1000}


def test_workflow_status():
    """Test WorkflowStatus data class."""
    status = WorkflowStatus(
        is_deployed=True,
        deployed_at="2023-01-01T00:00:00Z",
        is_published=False,
        needs_redeployment=False
    )
    assert status.is_deployed is True
    assert status.deployed_at == "2023-01-01T00:00:00Z"
    assert status.is_published is False
    assert status.needs_redeployment is False


@patch('ystudio.requests.Session.close')
def test_context_manager(mock_close):
    """Test MyBotBoxClient as context manager."""
    with MyBotBoxClient(api_key="test-api-key") as client:
        assert client.api_key == "test-api-key"
    # Should close without error
    mock_close.assert_called_once()


# Tests for async execution
@patch('ystudio.requests.Session.post')
def test_async_execution_returns_queued_result(mock_post):
    """The real execute route answers 200 {success, executionId, status: 'queued'}."""
    mock_response = Mock()
    mock_response.ok = True
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "executionId": "exec_123",
        "status": "queued",
        "taskName": "projects/p/locations/l/queues/q/tasks/t",
    }
    mock_response.headers.get.return_value = None
    mock_post.return_value = mock_response

    client = MyBotBoxClient(api_key="test-api-key")
    result = client.execute_workflow(
        "workflow-id",
        input_data={"message": "Hello"},
        async_execution=True
    )

    assert isinstance(result, QueuedExecutionResult)
    assert result.success is True
    assert result.execution_id == "exec_123"
    assert result.status == "queued"

    # Verify X-Execution-Mode header was set
    call_args = mock_post.call_args
    assert call_args[1]["headers"]["X-Execution-Mode"] == "async"


@patch('ystudio.requests.Session.post')
def test_sync_execution_returns_result(mock_post):
    """Test sync execution returns WorkflowExecutionResult."""
    mock_response = Mock()
    mock_response.ok = True
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "output": {"result": "completed"},
        "logs": []
    }
    mock_response.headers.get.return_value = None
    mock_post.return_value = mock_response

    client = MyBotBoxClient(api_key="test-api-key")
    result = client.execute_workflow(
        "workflow-id",
        input_data={"message": "Hello"},
        async_execution=False
    )

    assert result.success is True
    assert result.output == {"result": "completed"}
    assert not hasattr(result, 'task_id')


@patch('ystudio.requests.Session.post')
def test_async_header_not_set_when_false(mock_post):
    """Test X-Execution-Mode header is not set when async_execution is None."""
    mock_response = Mock()
    mock_response.ok = True
    mock_response.status_code = 200
    mock_response.json.return_value = {"success": True, "output": {}}
    mock_response.headers.get.return_value = None
    mock_post.return_value = mock_response

    client = MyBotBoxClient(api_key="test-api-key")
    client.execute_workflow("workflow-id", input_data={"message": "Hello"})

    call_args = mock_post.call_args
    assert "X-Execution-Mode" not in call_args[1]["headers"]


# Tests for job status
@patch('ystudio.requests.Session.get')
def test_get_job_status_success(mock_get):
    """Test getting job status."""
    mock_response = Mock()
    mock_response.ok = True
    mock_response.json.return_value = {
        "success": True,
        "taskId": "task-123",
        "status": "completed",
        "metadata": {
            "startedAt": "2024-01-01T00:00:00Z",
            "completedAt": "2024-01-01T00:01:00Z",
            "duration": 60000
        },
        "output": {"result": "done"}
    }
    mock_response.headers.get.return_value = None
    mock_get.return_value = mock_response

    client = MyBotBoxClient(api_key="test-api-key", base_url="https://test.mybotbox.com")
    result = client.get_job_status("task-123")

    assert result["taskId"] == "task-123"
    assert result["status"] == "completed"
    assert result["output"]["result"] == "done"
    # The client polls /api/workflows/<id>/status (apps/sat/app/api/
    # workflows/[id]/status); the retired /api/jobs/<id> form kept this
    # asserting the OLD URL — red since 2026-06-30, silently blocking every
    # PyPI publish (the workflow's test step gates the publish steps).
    mock_get.assert_called_once_with("https://test.mybotbox.com/api/workflows/task-123/status")


@patch('ystudio.requests.Session.get')
def test_get_job_status_not_found(mock_get):
    """Test job not found error."""
    mock_response = Mock()
    mock_response.ok = False
    mock_response.status_code = 404
    mock_response.reason = "Not Found"
    mock_response.json.return_value = {
        "error": "Job not found",
        "code": "JOB_NOT_FOUND"
    }
    mock_response.headers.get.return_value = None
    mock_get.return_value = mock_response

    client = MyBotBoxClient(api_key="test-api-key")

    with pytest.raises(MyBotBoxError) as exc_info:
        client.get_job_status("invalid-task")
    assert "Job not found" in str(exc_info.value)


# Tests for retry with rate limiting
@patch('ystudio.requests.Session.post')
@patch('ystudio.time.sleep')
def test_execute_with_retry_success_first_attempt(mock_sleep, mock_post):
    """Test retry succeeds on first attempt."""
    mock_response = Mock()
    mock_response.ok = True
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "output": {"result": "success"}
    }
    mock_response.headers.get.return_value = None
    mock_post.return_value = mock_response

    client = MyBotBoxClient(api_key="test-api-key")
    result = client.execute_with_retry("workflow-id", input_data={"message": "test"})

    assert result.success is True
    assert mock_post.call_count == 1
    assert mock_sleep.call_count == 0


@patch('ystudio.requests.Session.post')
@patch('ystudio.time.sleep')
def test_execute_with_retry_retries_on_rate_limit(mock_sleep, mock_post):
    """Test retry retries on rate limit error."""
    rate_limit_response = Mock()
    rate_limit_response.ok = False
    rate_limit_response.status_code = 429
    rate_limit_response.json.return_value = {
        "error": "Rate limit exceeded",
        "code": "RATE_LIMIT_EXCEEDED"
    }
    import time
    rate_limit_response.headers.get.side_effect = lambda h: {
        'retry-after': '1',
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': str(int(time.time()) + 60)
    }.get(h)

    success_response = Mock()
    success_response.ok = True
    success_response.status_code = 200
    success_response.json.return_value = {
        "success": True,
        "output": {"result": "success"}
    }
    success_response.headers.get.return_value = None

    mock_post.side_effect = [rate_limit_response, success_response]

    client = MyBotBoxClient(api_key="test-api-key")
    result = client.execute_with_retry(
        "workflow-id",
        input_data={"message": "test"},
        max_retries=3,
        initial_delay=0.01
    )

    assert result.success is True
    assert mock_post.call_count == 2
    assert mock_sleep.call_count == 1


@patch('ystudio.requests.Session.post')
@patch('ystudio.time.sleep')
def test_execute_with_retry_max_retries_exceeded(mock_sleep, mock_post):
    """Test retry throws after max retries."""
    mock_response = Mock()
    mock_response.ok = False
    mock_response.status_code = 429
    mock_response.json.return_value = {
        "error": "Rate limit exceeded",
        "code": "RATE_LIMIT_EXCEEDED"
    }
    mock_response.headers.get.side_effect = lambda h: '1' if h == 'retry-after' else None
    mock_post.return_value = mock_response

    client = MyBotBoxClient(api_key="test-api-key")

    with pytest.raises(MyBotBoxError) as exc_info:
        client.execute_with_retry(
            "workflow-id",
            input_data={"message": "test"},
            max_retries=2,
            initial_delay=0.01
        )

    assert "Rate limit exceeded" in str(exc_info.value)
    assert mock_post.call_count == 3  # Initial + 2 retries


@patch('ystudio.requests.Session.post')
def test_execute_with_retry_no_retry_on_other_errors(mock_post):
    """Test retry does not retry on non-rate-limit errors."""
    mock_response = Mock()
    mock_response.ok = False
    mock_response.status_code = 500
    mock_response.reason = "Internal Server Error"
    mock_response.json.return_value = {
        "error": "Server error",
        "code": "INTERNAL_ERROR"
    }
    mock_response.headers.get.return_value = None
    mock_post.return_value = mock_response

    client = MyBotBoxClient(api_key="test-api-key")

    with pytest.raises(MyBotBoxError) as exc_info:
        client.execute_with_retry("workflow-id", input_data={"message": "test"})

    assert "Server error" in str(exc_info.value)
    assert mock_post.call_count == 1  # No retries


# Tests for rate limit info
def test_get_rate_limit_info_returns_none_initially():
    """Test rate limit info is None before any API calls."""
    client = MyBotBoxClient(api_key="test-api-key")
    info = client.get_rate_limit_info()
    assert info is None


@patch('ystudio.requests.Session.post')
def test_get_rate_limit_info_after_api_call(mock_post):
    """Test rate limit info is populated after API call."""
    mock_response = Mock()
    mock_response.ok = True
    mock_response.status_code = 200
    mock_response.json.return_value = {"success": True, "output": {}}
    mock_response.headers.get.side_effect = lambda h: {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '95',
        'x-ratelimit-reset': '1704067200'
    }.get(h)
    mock_post.return_value = mock_response

    client = MyBotBoxClient(api_key="test-api-key")
    client.execute_workflow("workflow-id", input_data={})

    info = client.get_rate_limit_info()
    assert info is not None
    assert info.limit == 100
    assert info.remaining == 95
    assert info.reset == 1704067200


# Tests for usage limits
@patch('ystudio.requests.Session.get')
def test_get_usage_limits_success(mock_get):
    """Test getting usage limits."""
    mock_response = Mock()
    mock_response.ok = True
    mock_response.json.return_value = {
        "success": True,
        "rateLimit": {
            "sync": {
                "isLimited": False,
                "limit": 100,
                "remaining": 95,
                "resetAt": "2024-01-01T01:00:00Z"
            },
            "async": {
                "isLimited": False,
                "limit": 50,
                "remaining": 48,
                "resetAt": "2024-01-01T01:00:00Z"
            },
            "authType": "api"
        },
        "usage": {
            "currentPeriodCost": 1.23,
            "limit": 100.0,
            "plan": "pro"
        }
    }
    mock_response.headers.get.return_value = None
    mock_get.return_value = mock_response

    client = MyBotBoxClient(api_key="test-api-key", base_url="https://test.mybotbox.com")
    result = client.get_usage_limits()

    assert result.success is True
    assert result.rate_limit["sync"]["limit"] == 100
    assert result.rate_limit["async"]["limit"] == 50
    assert result.usage["currentPeriodCost"] == 1.23
    assert result.usage["plan"] == "pro"
    mock_get.assert_called_once_with("https://test.mybotbox.com/api/users/me/usage-limits")


@patch('ystudio.requests.Session.get')
def test_get_usage_limits_unauthorized(mock_get):
    """Test usage limits with invalid API key."""
    mock_response = Mock()
    mock_response.ok = False
    mock_response.status_code = 401
    mock_response.reason = "Unauthorized"
    mock_response.json.return_value = {
        "error": "Invalid API key",
        "code": "UNAUTHORIZED"
    }
    mock_response.headers.get.return_value = None
    mock_get.return_value = mock_response

    client = MyBotBoxClient(api_key="invalid-key")

    with pytest.raises(MyBotBoxError) as exc_info:
        client.get_usage_limits()
    assert "Invalid API key" in str(exc_info.value)


# Tests for streaming with selectedOutputs
@patch('ystudio.requests.Session.post')
def test_execute_workflow_with_stream_and_selected_outputs(mock_post):
    """Test execution with stream and selectedOutputs parameters."""
    mock_response = Mock()
    mock_response.ok = True
    mock_response.status_code = 200
    mock_response.json.return_value = {"success": True, "output": {}}
    mock_response.headers.get.return_value = None
    mock_post.return_value = mock_response

    client = MyBotBoxClient(api_key="test-api-key")
    client.execute_workflow(
        "workflow-id",
        input_data={"message": "test"},
        stream=True,
        selected_outputs=["agent1.content", "agent2.content"]
    )

    call_args = mock_post.call_args
    request_body = call_args[1]["json"]

    # The server reads the workflow input from body["input"] — input spread at
    # the root is silently dropped by the execute route's schema.
    assert request_body["input"] == {"message": "test"}
    assert "message" not in request_body
    assert request_body["stream"] is True
    assert request_body["selectedOutputs"] == ["agent1.content", "agent2.content"] 

# --- Management (CRUD) methods ----------------------------------------------

import json as _json
from unittest.mock import Mock, patch


def _resp(ok=True, status=200, body=None):
    m = Mock()
    m.ok = ok
    m.status_code = status
    m.reason = "OK" if ok else "Error"
    m.text = "" if body is None else _json.dumps(body)
    m.json.return_value = body if body is not None else {}
    m.headers = {}
    return m


def test_list_workflows_calls_get_with_workspace():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    with patch.object(client._session, "request", return_value=_resp(body={"data": []})) as req:
        client.list_workflows("ws-1")
        method, url = req.call_args.args[0], req.call_args.args[1]
        assert method == "GET"
        assert url == "https://h/api/workflows?workspaceId=ws-1"


def test_create_workflow_posts_body():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    with patch.object(client._session, "request", return_value=_resp(body={"id": "wf-1"})) as req:
        client.create_workflow("New", workspace_id="ws-1", description="d")
        assert req.call_args.args[0] == "POST"
        assert req.call_args.args[1] == "https://h/api/workflows"
        assert req.call_args.kwargs["json"] == {
            "name": "New",
            "workspaceId": "ws-1",
            "description": "d",
        }


def test_move_workflow_puts_folder_id():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    with patch.object(client._session, "request", return_value=_resp(body={"data": {}})) as req:
        client.move_workflow("wf-1", "p-1")
        assert req.call_args.args[0] == "PUT"
        assert req.call_args.kwargs["json"] == {"folderId": "p-1"}


def test_list_projects_include_archived():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    with patch.object(client._session, "request", return_value=_resp(body={"projects": []})) as req:
        client.list_projects("ws-1", include_archived=True)
        assert "includeArchived=true" in req.call_args.args[1]
        assert "workspaceId=ws-1" in req.call_args.args[1]


def test_create_workspace_posts_name():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    with patch.object(client._session, "request", return_value=_resp(body={"workspace": {}})) as req:
        client.create_workspace("Acme")
        assert req.call_args.args[0] == "POST"
        assert req.call_args.args[1] == "https://h/api/workspaces"
        assert req.call_args.kwargs["json"] == {"name": "Acme"}


def test_delete_workspace_sends_delete_templates_flag():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    with patch.object(client._session, "request", return_value=_resp(body={"success": True})) as req:
        client.delete_workspace("ws-1")
        assert req.call_args.args[0] == "DELETE"
        assert req.call_args.kwargs["json"] == {"deleteTemplates": False}


def test_management_error_maps_to_mybotbox_error():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    err = _resp(ok=False, status=403, body={"error": "Insufficient scope", "code": "INSUFFICIENT_SCOPE"})
    with patch.object(client._session, "request", return_value=err):
        with pytest.raises(MyBotBoxError) as exc:
            client.delete_folder("p-1")
        assert exc.value.status == 403
        assert exc.value.code == "INSUFFICIENT_SCOPE"


# --- Agents + run status ------------------------------------------------------
# Time comes from a fake clock: ystudio._sleep advances ystudio._now, so polling
# and deadlines run instantly and deterministically.

import ystudio as _ystudio
from ystudio import AuthExpiredError, Agent, AgentRun, WorkflowRun


@pytest.fixture
def fake_clock(monkeypatch):
    state = {"t": 1000.0, "sleeps": []}

    def _sleep(seconds):
        state["sleeps"].append(round(seconds, 6))
        state["t"] += seconds

    monkeypatch.setattr(_ystudio, "_now", lambda: state["t"])
    monkeypatch.setattr(_ystudio, "_sleep", _sleep)
    return state


def _call(req, i):
    c = req.call_args_list[i]
    return {
        "method": c.args[0],
        "url": c.args[1],
        "json": c.kwargs.get("json"),
        "headers": c.kwargs.get("headers") or {},
    }


AGENT = {
    "id": "wf-1",
    "name": "Echo",
    "model": "gpt-4o-mini",
    "workspaceId": "ws-1",
    "deployed": True,
    "createdAt": "2026-10-07T00:00:00Z",
    "canvasUrl": "https://h/workspace/ws-1/w/wf-1",
}
DONE = {"runId": "run-1", "status": "completed", "reply": "PONG", "output": {"reply": "PONG"}, "error": None}


def test_client_exposes_agents_namespace():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    assert isinstance(client.agents, _ystudio.Agents)


def test_agents_create_posts_body_with_key_and_idempotency_header():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    with patch.object(client._session, "request", return_value=_resp(status=201, body=AGENT)) as req:
        agent = client.agents.create(
            "Echo", "Reply with PONG", model="gpt-4o-mini", workspace_id="ws-1", idempotency_key="idem-1"
        )
    assert isinstance(agent, Agent)
    assert agent.id == "wf-1" and agent.workspace_id == "ws-1" and agent.deployed is True
    assert agent.canvas_url == AGENT["canvasUrl"]
    c = _call(req, 0)
    assert c["method"] == "POST"
    assert c["url"] == "https://h/api/v1/agents"
    assert c["headers"]["Idempotency-Key"] == "idem-1"
    # The idempotency key travels as a header, never in the body.
    assert c["json"] == {
        "name": "Echo",
        "instructions": "Reply with PONG",
        "model": "gpt-4o-mini",
        "workspaceId": "ws-1",
    }
    # X-API-Key rides on the session for every request.
    assert client._session.headers["X-API-Key"] == "k"


def test_agents_create_without_idempotency_key_sends_no_header():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    with patch.object(client._session, "request", return_value=_resp(status=201, body=AGENT)) as req:
        client.agents.create("Echo", "x")
    assert "Idempotency-Key" not in _call(req, 0)["headers"]
    assert _call(req, 0)["json"] == {"name": "Echo", "instructions": "x"}


def test_agents_list_query_and_page():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    page = {"data": [AGENT], "nextCursor": "c-3"}
    with patch.object(client._session, "request", return_value=_resp(body=page)) as req:
        result = client.agents.list(workspace_id="ws-1", limit=10, cursor="c-2")
    assert [a.id for a in result.data] == ["wf-1"]
    assert result.next_cursor == "c-3"
    c = _call(req, 0)
    assert c["method"] == "GET"
    assert c["url"] == "https://h/api/v1/agents?workspaceId=ws-1&limit=10&cursor=c-2"


def test_agents_get():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    with patch.object(client._session, "request", return_value=_resp(body=AGENT)) as req:
        agent = client.agents.get("wf-1")
    assert agent.name == "Echo"
    assert _call(req, 0)["method"] == "GET"
    assert _call(req, 0)["url"] == "https://h/api/v1/agents/wf-1"


def test_agents_run_200_returns_reply_without_polling(fake_clock):
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    with patch.object(client._session, "request", return_value=_resp(body=DONE)) as req:
        run = client.agents.run("wf-1", "ping", timeout=30, idempotency_key="run-key")
    assert isinstance(run, AgentRun)
    assert run.reply == "PONG"
    assert req.call_count == 1
    c = _call(req, 0)
    assert c["method"] == "POST"
    assert c["url"] == "https://h/api/v1/agents/wf-1/runs"
    assert c["json"] == {"message": "ping", "wait": True, "timeoutMs": 30000}
    assert c["headers"]["Idempotency-Key"] == "run-key"
    assert fake_clock["sleeps"] == []


def test_agents_run_caps_server_wait_at_55s(fake_clock):
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    with patch.object(client._session, "request", return_value=_resp(body=DONE)) as req:
        client.agents.run("wf-1", "ping")  # default timeout 120s
    assert _call(req, 0)["json"]["timeoutMs"] == 55000


def test_agents_run_202_falls_back_to_polling(fake_clock):
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    responses = [
        _resp(status=202, body={"runId": "run-1", "status": "running"}),
        _resp(body={"runId": "run-1", "status": "running"}),
        _resp(body={"runId": "run-1", "status": "running"}),
        _resp(body=DONE),
    ]
    with patch.object(client._session, "request", side_effect=responses) as req:
        run = client.agents.run("wf-1", "ping")
    assert run.status == "completed"
    assert run.reply == "PONG"
    assert req.call_count == 4
    for i in (1, 2, 3):
        assert _call(req, i)["method"] == "GET"
        assert _call(req, i)["url"] == "https://h/api/v1/agents/wf-1/runs/run-1"
    assert fake_clock["sleeps"] == [0.5, 1.0, 2.0]


def test_agents_run_returns_failed_run(fake_clock):
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    responses = [
        _resp(status=202, body={"runId": "run-1", "status": "queued"}),
        _resp(body={"runId": "run-1", "status": "failed", "error": "model error"}),
    ]
    with patch.object(client._session, "request", side_effect=responses):
        run = client.agents.run("wf-1", "ping")
    assert run.status == "failed"
    assert run.error == "model error"


def test_agents_run_times_out(fake_clock):
    client = MyBotBoxClient(api_key="k", base_url="https://h")

    def respond(method, url, **kwargs):
        if method == "POST":
            return _resp(status=202, body={"runId": "run-1", "status": "running"})
        return _resp(body={"runId": "run-1", "status": "running"})

    with patch.object(client._session, "request", side_effect=respond):
        with pytest.raises(MyBotBoxError) as exc:
            client.agents.run("wf-1", "ping", timeout=5)
    assert exc.value.code == "TIMEOUT"
    # 0.5 + 1 + 2 + the 1.5s left before the deadline = exactly 5s waited.
    assert fake_clock["sleeps"] == [0.5, 1.0, 2.0, 1.5]


def test_agents_error_mapping():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    port_err = _resp(
        ok=False,
        status=400,
        body={"error": "Pick a workspace", "code": "VALIDATION", "details": {"code": "WORKSPACE_REQUIRED"}},
    )
    with patch.object(client._session, "request", return_value=port_err):
        with pytest.raises(MyBotBoxError) as exc:
            client.agents.create("a", "b")
    assert exc.value.status == 400
    assert exc.value.code == "WORKSPACE_REQUIRED"
    assert str(exc.value) == "Pick a workspace"

    with patch.object(client._session, "request", return_value=_resp(ok=False, status=401, body={"error": "Unauthorized"})):
        with pytest.raises(AuthExpiredError):
            client.agents.get("wf-1")


def test_get_run_status_hits_runs_status_route():
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    body = {"runId": "exec_1", "status": "completed", "output": {"ok": 1}, "error": None,
            "triggerType": "api", "startedAt": "s", "finishedAt": "f"}
    with patch.object(client._session, "request", return_value=_resp(body=body)) as req:
        run = client.get_run_status("wf-1", "exec_1")
    assert isinstance(run, WorkflowRun)
    assert run.status == "completed" and run.output == {"ok": 1} and run.trigger_type == "api"
    assert _call(req, 0)["method"] == "GET"
    assert _call(req, 0)["url"] == "https://h/api/workflows/wf-1/runs/exec_1/status"


def test_wait_for_run_polls_until_terminal(fake_clock):
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    running = {"runId": "exec_1", "status": "running"}
    responses = [_resp(body=running), _resp(body=running), _resp(body={"runId": "exec_1", "status": "completed"})]
    with patch.object(client._session, "request", side_effect=responses) as req:
        run = client.wait_for_run("wf-1", "exec_1")
    assert run.status == "completed"
    assert req.call_count == 3
    assert fake_clock["sleeps"] == [0.5, 1.0]


def test_wait_for_run_paused_times_out(fake_clock):
    client = MyBotBoxClient(api_key="k", base_url="https://h")
    with patch.object(client._session, "request", return_value=_resp(body={"runId": "exec_1", "status": "paused"})):
        with pytest.raises(MyBotBoxError) as exc:
            client.wait_for_run("wf-1", "exec_1", timeout=1)
    assert exc.value.code == "TIMEOUT"
    assert fake_clock["sleeps"] == [0.5, 0.5]


def test_mybotbox_package_reexports_agent_types():
    import mybotbox

    assert mybotbox.__version__ == "0.4.0"
    for name in ("Agent", "AgentRun", "AgentList", "Agents", "WorkflowRun", "QueuedExecutionResult"):
        assert hasattr(mybotbox, name), name
