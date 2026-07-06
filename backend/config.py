import os
import time
import httpx
from pydantic_settings import BaseSettings
from supabase import create_client, Client


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    admin_api_key: str

    class Config:
        env_file = "../.env"


settings = Settings()

# Initialize Supabase client
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)


# ──────────────────────────────────────────────────────────────────────────
#  Harden the PostgREST HTTP session
#  supabase-py enables HTTP/2 on its httpx session. Supabase's edge drops idle
#  keep-alive connections by sending an HTTP/2 GOAWAY, which the client sees as
#  `ConnectionTerminated error_code:0` on the next reused connection. Forcing
#  HTTP/1.1 removes that failure mode; a small retry-on-disconnect wrapper covers
#  the residual case of a keep-alive connection closed right before a request.
# ──────────────────────────────────────────────────────────────────────────
_RETRYABLE_ERRORS = (
    httpx.RemoteProtocolError,
    httpx.ConnectError,
    httpx.ConnectTimeout,
    httpx.ReadError,
    httpx.WriteError,
    httpx.PoolTimeout,
)


class _RetryingClient(httpx.Client):
    """httpx.Client that retries idempotent transient connection failures."""

    _MAX_RETRIES = 3

    def send(self, *args, **kwargs):
        last_exc = None
        for attempt in range(self._MAX_RETRIES):
            try:
                return super().send(*args, **kwargs)
            except _RETRYABLE_ERRORS as exc:
                last_exc = exc
                if attempt < self._MAX_RETRIES - 1:
                    time.sleep(0.2 * (attempt + 1))
        raise last_exc


def _harden_postgrest_session(client: Client) -> None:
    try:
        pg = client.postgrest
        old = pg.session
        # http2=False → HTTP/1.1 only; retries handle connection-establishment errors
        transport = httpx.HTTPTransport(retries=2, http2=False)
        pg.session = _RetryingClient(
            base_url=old.base_url,
            headers=old.headers,
            timeout=old.timeout,
            transport=transport,
        )
        try:
            old.close()
        except Exception:
            pass
    except Exception:
        # Never let hardening break startup; fall back to the default session
        pass


_harden_postgrest_session(supabase)

