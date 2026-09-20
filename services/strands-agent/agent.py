"""
Trustline request-interpretation agent (Strands Agents SDK + Amazon Bedrock).

Turns a verifier's natural-language question into a *structured request*.
It has no tools that touch credentials, wallets or secrets, and it makes no
authorization decision: the Trustline API validates its output and sends it
to Cedar (Amazon Verified Permissions), which alone can ALLOW or DENY.

Deployed as an AWS Lambda function behind API Gateway (see infra/template.yaml).
Local run:  python agent.py "Does this buyer have at least 20 successful bookings?"
"""

from __future__ import annotations

import json
import os
import sys
from typing import List, Literal, Optional

from pydantic import BaseModel, Field
from strands import Agent
from strands.models import BedrockModel

ClaimKey = Literal[
    "successful_transactions",
    "completed_stays",
    "completed_projects",
    "completed_bookings_hosted",
    "booking_reliability_pct",
    "seller_completion_pct",
]
Purpose = Literal[
    "buyer_verification",
    "seller_verification",
    "guest_verification",
    "host_verification",
    "freelancer_verification",
]


class Suggestion(BaseModel):
    kind: Literal["predicate"] = "predicate"
    claim: ClaimKey
    operator: Literal[">="] = ">="
    threshold: int = Field(ge=1, le=100_000)
    purpose: Purpose
    subjectRole: Literal["buyer", "seller"]
    summary: str = Field(max_length=400)


class StructuredRequest(BaseModel):
    kind: Literal["predicate", "full_history", "identity", "raw_value", "clarification", "unsupported"]
    claim: Optional[ClaimKey] = None
    operator: Optional[Literal[">="]] = None
    threshold: Optional[int] = Field(default=None, ge=0, le=100_000)
    purpose: Purpose
    subjectRole: Literal["buyer", "seller"]
    requestedData: Optional[List[str]] = None
    suggestions: Optional[List[Suggestion]] = None
    summary: str = Field(max_length=400)


SYSTEM_PROMPT = """You translate verification questions for Trustline, a privacy-preserving trust layer.

Output exactly one structured request. Rules:
- Trustline can only prove threshold claims ("at least N", "at least P%") over these claims:
  successful_transactions (bookings/orders/sales/purchases), completed_stays (hotel stays),
  completed_projects (freelance work), completed_bookings_hosted (bookings as a host),
  booking_reliability_pct (showed up for bookings), seller_completion_pct (seller fulfilment rate).
- kind="predicate" when the question maps to one claim and a threshold. operator is always ">=".
  "more than N" means threshold N+1.
- Report over-broad requests FAITHFULLY. Do not narrow them into something allowed:
  complete/full history or lists of transactions -> kind="full_history";
  names, phone, email, address, identity documents -> kind="identity";
  exact numbers ("how many exactly") -> kind="raw_value".
  Put what was asked for in requestedData.
- Vague questions ("is this seller trustworthy?") -> kind="clarification" with 2-3 suggestions of
  relevant verifiable facts. Never produce a score, a judgement or a recommendation.
- purpose: buyer_verification / seller_verification by subject role; stays -> guest_verification;
  hosted bookings -> host_verification; projects -> freelancer_verification.
- summary: one plain sentence describing what would be proven and that only the result is shared.
You do not decide whether the request is allowed. Policy does."""


def build_agent() -> Agent:
    model = BedrockModel(
        model_id=os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-sonnet-4-20250514-v1:0"),
        region_name=os.environ.get("AWS_REGION", "ap-south-1"),
        temperature=0,
    )
    # No tools: the agent can read the question and nothing else.
    return Agent(model=model, system_prompt=SYSTEM_PROMPT, tools=[], callback_handler=None)


_agent: Optional[Agent] = None


def interpret(text: str, verifier: str) -> dict:
    global _agent
    _agent = _agent or build_agent()
    prompt = f"Verifier: {verifier}\nQuestion: {text.strip()[:500]}"
    result = _agent.structured_output(StructuredRequest, prompt)
    return result.model_dump(exclude_none=True)


def handler(event, _context):
    """AWS Lambda handler (API Gateway HTTP API, payload v2)."""
    expected = os.environ.get("STRANDS_AGENT_TOKEN")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    if expected and headers.get("authorization") != f"Bearer {expected}":
        return {"statusCode": 401, "body": json.dumps({"error": "unauthorized"})}
    try:
        body = json.loads(event.get("body") or "{}")
        text = str(body.get("text", ""))
        if not 3 <= len(text) <= 500:
            return {"statusCode": 400, "body": json.dumps({"error": "text must be 3-500 characters"})}
        structured = interpret(text, str(body.get("verifier", "verifier"))[:80])
        return {"statusCode": 200, "headers": {"content-type": "application/json"}, "body": json.dumps(structured)}
    except Exception:  # never echo prompts or model output into logs
        return {"statusCode": 502, "body": json.dumps({"error": "interpretation failed"})}


if __name__ == "__main__":
    question = " ".join(sys.argv[1:]) or "Does this buyer have at least 20 successful bookings?"
    print(json.dumps(interpret(question, "Marketplace B"), indent=2))
